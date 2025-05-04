import { defineStore } from 'pinia'
import { ref, computed } from 'vue' 
import axios from 'axios'

const API_URL = 'http://localhost:3000/api/words'

const instance = axios.create({
  baseURL: API_URL,
  timeout: 5000,
  withCredentials: false
})

export const useWordStore = defineStore('word', () => {
  const words = ref([])
  const currentWord = ref(null)
  const practiceMode = ref('review') // review, test, or learn

  async function addWord(word) {
    try {
      const response = await instance.post('/', {
        word: word.word,
        definition: word.definition, 
        example: word.example,
        status: 'new' // 修改状态标记为new
      });
      words.value.push(response.data);
    } catch (error) {
      console.error('[ADD ERROR]', error);
      throw error;
    }
  }

  async function loadWords() {
    try {
      const response = await instance.get('/');
      words.value = response.data.map(item => ({
        id: item.id,
        word: item.word,
        definition: item.definition,
        example: item.example,
        status: item.status || 'new',
        lastReview: item.lastReview ? new Date(item.lastReview) : null,
        nextview: item.nextview ? new Date(item.nextview) : null,
        memoryStage: item.memoryStage || 0,
        reviewCount: item.reviewCount || 0
      }));
    } catch (error) {
      console.error('[LOAD ERROR]', error);
      throw new Error(`数据加载失败：${error.response?.data?.error || error.message}`);
    }
  }

  async function deleteWord(id) {
    try {
      const response = await instance.delete(`/${id}`);
      if (response.status !== 204 && response.status !== 200) {
        throw new Error(`后端响应异常: ${response.statusText}`);
      }
      words.value = words.value.filter(word => word.id !== id);
    } catch (error) {
      console.error('[DELETE ERROR] 详细错误:', error);
      throw new Error(`删除失败：${error.message || '网络连接异常'}`);
    }
  }

  async function deleteAllWords() {
    try {
      await instance.delete('/');
      words.value = [];
    } catch (error) {
      console.error('全部删除失败:', error);
      throw error;
    }
  }

  async function updateWord(id, updates) {
    try {
      const response = await instance.put(`/${id}`, updates);
      const index = words.value.findIndex(w => w.id === id);
      if (index !== -1) {
        words.value[index] = response.data;
      }
    } catch (error) {
      console.error('更新失败:', error);
      throw error;
    }
  }

  async function importWords(wordList) {
    try {
      // 检查后端是否支持批量导入
      if (wordList.length > 0) {
        // 如果后端没有批量导入API，就逐个添加
        const results = {
          imported: 0,
          failed: 0,
          errors: []
        };
        
        for (const word of wordList) {
          try {
            await addWord(word);
            results.imported++;
          } catch (error) {
            results.failed++;
            results.errors.push(`${word.word}: ${error.message}`);
          }
        }
        
        return results;
      }
      return { imported: 0, failed: 0, errors: [] };
    } catch (error) {
      const msg = error.response ? error.response.data : error.message;
      throw new Error(`导入失败: ${msg}\n请确保：\n1. 后端服务正在运行\n2. 没有其他程序占用3000端口`);
    }
  }

  // 添加复习单词的方法
  async function reviewWord(id, isCorrect) {
    try {
      const response = await instance.post(`/${id}/review`, { isCorrect });
      const index = words.value.findIndex(w => w.id === id);
      if (index !== -1) {
        words.value[index] = {
          ...words.value[index],
          status: response.data.status,
          nextview: new Date(response.data.nextview),
          memoryStage: response.data.memoryStage,
          reviewCount: response.data.reviewCount,
          lastReview: new Date()
        };
      }
      return response.data;
    } catch (error) {
      console.error('复习更新失败:', error);
      throw error;
    }
  }

  // 获取今日需要复习的单词
  async function getWordsToReview() {
    try {
      const response = await instance.get('/review');
      return response.data.map(item => ({
        id: item.id,
        word: item.word,
        definition: item.definition,
        example: item.example,
        status: item.status,
        lastReview: item.lastReview ? new Date(item.lastReview) : null,
        nextview: item.nextview ? new Date(item.nextview) : null,
        memoryStage: item.memoryStage || 0,
        reviewCount: item.reviewCount || 0
      }));
    } catch (error) {
      console.error('获取复习单词失败:', error);
      throw error;
    }
  }

  const totalWords = computed(() => words.value.length);
  const todayReviewCount = computed(() => {
    const today = new Date().toISOString().split('T')[0];
    return words.value.filter(word => 
      word.lastReview && new Date(word.lastReview).toISOString().startsWith(today)
    ).length;
  });

  return {
    words,
    currentWord,
    practiceMode,
    loadWords,
    addWord,
    updateWord,
    deleteWord,
    deleteAllWords,
    importWords,
    reviewWord,
    getWordsToReview,
    totalWords,
    todayReviewCount
  };
});