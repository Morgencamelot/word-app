<template>
  <div class="words">
    <div class="header">
      <h1>单词本</h1>
      <button @click="importFromFile" class="add-button">导入词库</button>
    </div>

    <div class="word-list virtual-scroll" style="height: calc(100vh - 180px)">
      <div v-if="words.length === 0" class="empty-state">
        <p>暂无单词数据，请点击上方按钮导入词库</p>
      </div>
      <template v-else>
        <div v-for="word in pagedWords" :key="word.id" class="word-card">
          <!-- 分页显示 -->
          <div class="word-content">
            <h3>{{ word.word }}</h3>
            <p>{{ word.definition }}</p>
            <p class="example" v-if="word.example">{{ word.example }}</p>
          </div>
          <div class="word-actions">
            <button @click="editWord(word)" class="action-button edit">编辑</button>
            <button @click="deleteWord(word.id)" class="action-button delete">删除</button>
          </div>
        </div>
      </template>
    </div>

    
    <div class="pagination-controls">
      <button @click="currentPage--" :disabled="currentPage === 1">上一页</button>
      <span>第 {{ currentPage }} 页（共 {{ totalPages }} 页）</span>
      <button @click="currentPage++" :disabled="currentPage === totalPages">下一页</button>
    </div>
  </div> 
  
  <!-- 添加/编辑单词对话框 -->
  <div v-if="showAddWord" class="modal">
    <div class="modal-content">
      <h2>{{ editingWord ? '编辑单词' : '添加单词' }}</h2>
      <form @submit.prevent="saveWord">
        <div class="form-group">
          <label>单词</label>
          <input v-model="newWord.word" required>
        </div>
        <div class="form-group">
          <label>释义</label>
          <input v-model="newWord.definition" required>
        </div>
        <div class="form-group">
          <label>例句</label>
          <input v-model="newWord.example">
        </div>
        <div class="form-actions">
          <button type="button" @click="cancelEdit" class="cancel-button">取消</button>
          <button type="submit" class="save-button">保存</button>
        </div>
      </form>
    </div>
  </div> 
</template>

<script setup>
// 调整导入顺序
import { ref, computed, watch } from 'vue'
import { useVirtualList } from '@vueuse/core'
import { useWordStore } from '../stores/wordStore'
import { onMounted } from 'vue'  

// 先定义 words 再使用虚拟滚动
const wordStore = useWordStore()
const cachedWords = ref([]);
//const shouldRefresh = ref(true);

// 初始化 words
const words = computed(() => {
  return wordStore.words || []
})


// 修改为：
const virtualList = ref(null);  // 移除不正确的虚拟滚动实现

async function importFromFile() {
  try {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.txt,.csv'
    input.onchange = async (e) => {
      const file = e.target.files[0]
      const reader = new FileReader()
      
      reader.onload = async (event) => {
        try {
          const content = event.target.result
          const words = parseFileContent(content, file.name)
          const result = await wordStore.importWords(words)
          alert(`Successfully imported ${result.imported} words`)
          // Refresh word list
          await wordStore.loadWords() // 确保数据加载完成
          cachedWords.value = [...wordStore.words]
        } catch (error) {
          console.error('文件解析失败:', error)
        }
      }
      reader.readAsText(file)
    }
    input.click()
  } catch (error) {
    console.error('File import error:', error)
  }
}

// 新增文件解析方法
function parseFileContent(content, filename) {
  const lines = content.split(/\r?\n/).filter(line => line.trim());
  const isCSV = filename.toLowerCase().endsWith('.csv');
  const errors = [];
  
  const parsedWords = lines.map((line, index) => {
    if (isCSV && index === 0) return null;

    const parts = isCSV ? 
      line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/) : 
      line.split(/(?:\t|,)+/);  // 修改分隔符正则
    
    // 处理可能存在的尾部空元素
    const [word = '', definition = '', example = ''] = parts.slice(0,3);
    
    if (!word.trim() || !definition.trim()) {
      errors.push(`第 ${index + 1} 行格式错误：缺少单词或释义`);
      return null;
    }

    return {
      word: word.trim().replace(/^"|"$/g, ''),
      definition: definition.trim().replace(/^"|"$/g, ''),
      example: example.trim() ? example.trim().replace(/^"|"$/g, '') : null
    }
  }).filter(Boolean);

  if (errors.length > 0) {
    throw new Error(errors.join('\n'));
  }

  return parsedWords;
}

function editWord(word) {
  editingWord.value = word
  newWord.value = { 
    word: word.word,
    definition: word.definition,  // 将 meaning 改为 definition
    example: word.example 
  }
  showAddWord.value = true
}

async function deleteWord(id) {
  if (confirm('确定要删除这个单词吗？')) {
    try {
      await wordStore.deleteWord(id);
      // 删除后刷新本地缓存
      cachedWords.value = cachedWords.value.filter(word => word.id !== id);
    } catch (error) {
      alert('删除失败，请重试');
    }
  }
}

// 在保存方法中添加错误处理
async function saveWord() {
  try {
    const payload = {
      word: newWord.value.word,
      definition: newWord.value.definition, 
      example: newWord.value.example
    }
    
    if (editingWord.value) {
      await wordStore.updateWord(editingWord.value.id, payload);
    } else {
      await wordStore.addWord(payload);
    }
    cancelEdit();
    // 直接使用 wordStore 中的数据
    await wordStore.loadWords();
  } catch (error) {
    console.error('保存失败详情:', error.response?.data || error.message);
    alert(`保存失败: ${error.response?.data?.message || error.message}`);
  }
}

function cancelEdit() {
  showAddWord.value = false
  editingWord.value = null
  newWord.value = {
    word: '',
    definition: '',
    example: ''
  }
}

const showAddWord = ref(false)
const editingWord = ref(null)
const newWord = ref({
  word: '',
  definition: '',
  example: ''
})
const currentPage = ref(1)
const itemsPerPage = 20 

const pagedWords = computed(() => {
  if (!words.value || words.value.length === 0) return [];
  const start = (currentPage.value - 1) * itemsPerPage;
  const end = start + itemsPerPage;
  return words.value.slice(start, end);
});

// 添加watch确保页码重置
const totalPages = computed(() => Math.ceil(words.value.length / itemsPerPage))

watch(words, () => {
  currentPage.value = 1
});

onMounted(async () => {
  try {
    await wordStore.loadWords();
    cachedWords.value = [...wordStore.words];
    
    if (wordStore.words.length === 0) {
      console.warn('词库数据为空');
    }
  } catch (error) {
    console.error('加载失败:', error);
    alert('数据加载失败');
  }
});

</script>


<style scoped>

.words {
  padding: 1rem;
  height: 100vh; /* 占据全屏高度 */
  display: flex;
  flex-direction: column;
}

.word-list {
  flex: 1;
  overflow: visible; /* 禁用内部滚动 */
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1rem;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.add-button {
  padding: 0.5rem 1rem;
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.word-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1rem;
}

.word-card {
  background: #fff;
  padding: 1rem;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.word-content h3 {
  margin: 0 0 0.5rem 0;
  color: #333; /* 确保标题文字为深色 */
}

.example {
  color: #666;
  font-style: italic;
  margin-top: 0.5rem;
}

.word-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 1rem;
}

.action-button {
  padding: 0.3rem 0.6rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  background-color: #0b6ab8; /* 修改为蓝色 */
  color: white; /* 保持白色文字 */
}

.action-button.delete {
  background-color: #ff4444;
  color: white;
}

.modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0,0,0,0.5);
  display: flex;
  justify-content: center;
  align-items: center;
}

.modal-content {
  background: white;
  padding: 2rem;
  border-radius: 8px;
  width: 90%;
  max-width: 500px;
}

.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
}

.form-group input {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 2rem;
}

.cancel-button, .save-button {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.cancel-button {
  background-color: #f0f0f0;
}

.save-button {
  background-color: #4CAF50;
  color: white;
}

.empty-state {
      text-align: center;
      padding: 2rem;
      color: #666;
    }
    
    /* 分页控制样式 */
.pagination-controls {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 2rem;
      padding: 1rem 0;
      position: sticky;
      bottom: 0;
      background: white;
      border-top: 1px solid #eee;
    }

.pagination-controls button {
      padding: 0.5rem 1rem;
      background: #4CAF50;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      transition: opacity 0.2s;
    }
    
.pagination-controls {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 2rem;
  padding: 1rem 0;
  position: sticky;
  bottom: 0;
  background: white;
  border-top: 1px solid #eee; /* 新增分割线 */
}

.pagination-controls button {
  padding: 0.5rem 1rem;
  background: #4CAF50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: opacity 0.2s;
}

.pagination-controls button:disabled {
  background: #cccccc;
  cursor: not-allowed;
  opacity: 0.7;
}

.pagination-controls button:not(:disabled):hover {
  opacity: 0.9;
}
</style>