<template>
  <div class="settings-layout">
    <div class="settings-section">
      <div class="practice">
        <div class="practice-header">
          <h1>单词练习</h1>
          <div class="mode-selector">
            <button 
              v-for="mode in modes" 
              :key="mode.value"
              @click="selectMode(mode.value)"
              :class="{ active: practiceMode === mode.value }"
              class="mode-button"
            >
              {{ mode.label }}
            </button>
          </div>
        </div>
    
        <div v-if="currentWord" class="practice-content">
          <div class="word-display">
            <div class="status-badge" :class="currentWord.status">{{ getStatusLabel(currentWord.status) }}</div>
            <h2>{{ currentWord.word }}</h2>
            <div v-if="showMeaning" class="definition">
              <p>{{ currentWord.definition }}</p>
              <p v-if="currentWord.example" class="example">例句: {{ currentWord.example }}</p>
            </div>
            <button @click="toggleMeaning" class="toggle-button">
              {{ showMeaning ? '隐藏释义' : '显示释义' }}
            </button>
          </div>
    
          <div class="practice-actions">
            <button @click="() => reviewWord(true)" class="action-button success">我记得(√)</button>
            <button @click="() => reviewWord(false)" class="action-button warning">不记得(×)</button>
          </div>

          <div class="review-info" v-if="currentWord.nextview">
            <p>记忆阶段: {{ currentWord.memoryStage || 0 }}</p>
            <p>下次复习: {{ formatDate(currentWord.nextview) }}</p>
            <p>复习次数: {{ currentWord.reviewCount || 0 }}</p>
          </div>
        </div>
    
        <div v-else class="no-words">
          <p v-if="loading">加载中...</p>
          <template v-else>
            <p>{{ noWordsMessage }}</p>
            <button @click="$router.push('/words')" class="action-button">去添加单词</button>
            <button @click="loadWords" class="action-button refresh">刷新</button>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.mode-selector {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
  margin: 1rem 0;
}
</style>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useWordStore } from '../stores/wordStore'
import { useRouter } from 'vue-router'

const router = useRouter()
const wordStore = useWordStore()
const showMeaning = ref(false)
const currentWord = ref(null)
const loading = ref(false)
const words = ref([])
const noWordsMessage = ref('没有可练习的单词')

const modes = [
  { label: '待复习', value: 'review' },
  { label: '全部单词', value: 'all' },
  { label: '新单词', value: 'new' }
]

const practiceMode = ref('review')

function selectMode(mode) {
  practiceMode.value = mode
  loadWords()
}

function toggleMeaning() {
  showMeaning.value = !showMeaning.value
}

function getStatusLabel(status) {
  const labels = {
    'new': '新词',
    'learning': '学习中',
    'review': '复习',
    'mastered': '已掌握'
  }
  return labels[status] || status
}

function formatDate(date) {
  if (!date) return '未设置'
  
  const d = new Date(date)
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(d)
}

async function loadWords() {
  loading.value = true
  try {
    if (practiceMode.value === 'review') {
      // 获取需要复习的单词
      words.value = await wordStore.getWordsToReview()
      if (words.value.length === 0) {
        noWordsMessage.value = '今天没有需要复习的单词！'
      }
    } else if (practiceMode.value === 'new') {
      // 获取新单词
      await wordStore.loadWords()
      words.value = wordStore.words.filter(w => w.status === 'new')
      if (words.value.length === 0) {
        noWordsMessage.value = '没有新单词，请添加或导入单词'
      }
    } else {
      // 获取所有单词
      await wordStore.loadWords()
      words.value = [...wordStore.words]
      if (words.value.length === 0) {
        noWordsMessage.value = '词库为空，请添加或导入单词'
      }
    }
    getNextWord()
  } catch (error) {
    console.error('加载单词失败:', error)
    alert('加载单词失败: ' + error.message)
  } finally {
    loading.value = false
  }
}

function getNextWord() {
  if (words.value.length === 0) {
    currentWord.value = null
    return
  }
  
  // 随机选择一个单词
  const randomIndex = Math.floor(Math.random() * words.value.length)
  currentWord.value = words.value[randomIndex]
  showMeaning.value = false
}

async function reviewWord(isCorrect) {
  if (!currentWord.value) return
  
  try {
    // 调用后端API更新复习状态
    await wordStore.reviewWord(currentWord.value.id, isCorrect)
    
    // 从当前列表中移除这个单词
    words.value = words.value.filter(w => w.id !== currentWord.value.id)
    
    // 获取下一个单词
    getNextWord()
  } catch (error) {
    console.error('更新复习状态失败:', error)
    alert('更新失败: ' + error.message)
  }
}

onMounted(() => {
  loadWords()
})
</script>

<style scoped>
.practice {
  padding: 1rem;
}

.practice-header {
  margin-bottom: 2rem;
}

.mode-selector {
  display: flex;
  gap: 1rem;
  margin-top: 1rem;
}

.mode-button {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  background-color: #f0f0f0;
  cursor: pointer;
}

.mode-button.active {
  background-color: #4CAF50;
  color: white;
}

.word-display {
  text-align: center;
  margin: 2rem 0;
  position: relative;
}

.status-badge {
  position: absolute;
  top: -15px;
  right: 0;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.8rem;
  color: white;
}

.status-badge.new {
  background-color: #2196F3;
}

.status-badge.learning {
  background-color: #FF9800;
}

.status-badge.review {
  background-color: #9C27B0;
}

.status-badge.mastered {
  background-color: #4CAF50;
}

.definition {
  margin-top: 1rem;
  color: #666;
  font-size: 1.1em;
}

.example {
  font-style: italic;
  margin-top: 0.5rem;
  color: #888;
}

.toggle-button {
  margin-top: 1rem;
  padding: 0.5rem 1rem;
  background-color: #f0f0f0;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.practice-actions {
  display: flex;
  justify-content: center;
  gap: 1rem;
  margin-top: 2rem;
}

.action-button {
  padding: 0.8rem 1.5rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1rem;
}

.action-button.success {
  background-color: #4CAF50;
  color: white;
}

.action-button.warning {
  background-color: #ff9800;
  color: white;
}

.action-button.refresh {
  background-color: #2196F3;
  color: white;
}

.no-words {
  text-align: center;
  margin-top: 2rem;
}

.review-info {
  margin-top: 2rem;
  padding: 1rem;
  background-color: #f5f5f5;
  border-radius: 4px;
  font-size: 0.9rem;
}
</style>