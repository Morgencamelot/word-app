<template>
  <div class="settings-layout">
    <div class="settings-section">
      <h1>单词记忆助手</h1>
      <div class="stats-grid">
        <div class="stat-card">
          <h3>总单词数</h3>
          <p>{{ totalWords }}</p>
        </div>
        <div class="stat-card">
          <h3>今日复习</h3>
          <p>{{ todayReviewCount }}</p>
        </div>
      </div>
      <div class="actions">
        <button @click="$router.push('/words')" class="action-button">管理单词</button>
        <button @click="$router.push('/practice')" class="action-button">开始练习</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { computed } from 'vue'
import { useWordStore } from '../stores/wordStore'

const wordStore = useWordStore()
const totalWords = computed(() => wordStore.words.length)
const todayReviewCount = computed(() => {
  const today = new Date().toISOString().split('T')[0]
  return wordStore.words.filter(word => 
    word.lastReviewed && word.lastReviewed.startsWith(today)
  ).length
})

onMounted(async () => {
  try {
    await wordStore.loadWords()
    console.log('Loaded words:', wordStore.words.length)
  } catch (error) {
    console.error('数据加载失败:', error)
  }
})
</script>

<style scoped>
.settings-layout {
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
  min-height: calc(100vh - 120px); /* 改为最小高度 */
  overflow: visible; /* 移除内部滚动 */
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 2rem;
  padding: 1rem 0;
}

.home-container {
  height: 100vh;
  overflow: hidden; /* 禁用外层滚动 */
  display: flex;
  flex-direction: column;
}

.main-content {
  flex: 1;
  overflow-y: auto; /* 只在内容区域启用垂直滚动 */
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.grid-layout {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
  padding-bottom: 20px; /* 防止底部裁剪 */
}
</style>