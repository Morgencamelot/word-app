<template>
  <div class="settings-layout">
    <div class="settings-section">
      <h2>学习设置</h2>
      <div class="setting-item">
        <label>每日学习目标</label>
        <input 
          type="number" 
          v-model="dailyGoal" 
          min="1" 
          max="100"
        >
      </div>
      <div class="setting-item">
        <label>复习提醒</label>
        <select v-model="reminderTime">
          <option value="morning">早上</option>
          <option value="afternoon">下午</option>
          <option value="evening">晚上</option>
          <option value="none">不提醒</option>
        </select>
      </div>
    </div>

    <div class="settings-section">
      <h2>数据管理</h2>
      <div class="setting-item">
        <button @click="exportData" class="action-button">导出数据</button>
      </div>
      <div class="setting-item">
        <button @click="importData" class="action-button">导入数据</button>
      </div>
      <div class="setting-item">
        <button @click="clearData" class="action-button delete">清除所有数据</button>
        <button @click="deleteAllWords" class="action-button delete danger">删除所有单词（开发模式）</button>
      </div>
    </div>

    <div class="settings-section">
      <h2>关于</h2>
      <div class="about-info">
        <p>版本: 1.0.0</p>
        <p>开发者: lx</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useWordStore } from '../stores/wordStore'

const wordStore = useWordStore()
const dailyGoal = ref(20)
const reminderTime = ref('morning')

function exportData() {
  const data = {
    words: wordStore.words,
    settings: {
      dailyGoal: dailyGoal.value,
      reminderTime: reminderTime.value
    }
  }
  const blob = new Blob([JSON.stringify(data)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'word-app-data.json'
  a.click()
  URL.revokeObjectURL(url)
}

function importData() {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.json'
  input.onchange = (e) => {
    const file = e.target.files[0]
    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result)
        if (data.words) {
          wordStore.words = data.words
        }
        if (data.settings) {
          dailyGoal.value = data.settings.dailyGoal
          reminderTime.value = data.settings.reminderTime
        }
        alert('数据导入成功！')
      } catch (error) {
        alert('导入失败：文件格式不正确')
      }
    }
    reader.readAsText(file)
  }
  input.click()
}

function clearData() {
  if (confirm('确定要清除所有数据吗？此操作不可恢复！')) {
    wordStore.words = []
    dailyGoal.value = 20
    reminderTime.value = 'morning'
    alert('数据已清除')
  }
}

async function deleteAllWords() {
  if (confirm('确定要删除所有单词吗？此操作仅用于开发测试！')) {
    try {
      await wordStore.deleteAllWords()
      alert('所有单词已删除')
    } catch (error) {
      alert('删除失败：' + error.message)
    }
  }
}
</script>

<style scoped>
.settings-layout {
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
  min-height: 100vh; /* 全屏高度 */
}

.settings-section {
  background: white;
  border-radius: 8px;
  padding: 2rem;
  margin-bottom: 2rem;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}
</style>

<style scoped>
.settings {
  padding: 1rem;
}

.settings-section {
  margin-bottom: 2rem;
  background: white;
  padding: 1.5rem;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.setting-item {
  margin: 1rem 0;
}

.modal-content {
  background: #fff;
  padding: 2rem;
  border-radius: 8px;
  width: 90%;
  max-width: 500px;
}

.setting-item label {
  display: block;
  margin-bottom: 0.5rem;
  color: #333; /* 设置标签文字颜色 */
}

.setting-item input,
.setting-item select {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.action-button {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  background-color: #f0f0f0;
}

.action-button.delete {
  background-color: #ff4444;
  color: white;
}

.action-button.delete.danger {
  background-color: #dc3545;
  margin-top: 0.5rem;
}

.about-info {
  color: #666;
  line-height: 1.6;
}
</style>