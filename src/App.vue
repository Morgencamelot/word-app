<script setup>
import { RouterView, RouterLink } from 'vue-router'
</script>

<template>
  <div class="app">
    <nav class="nav">
      <router-link to="/" class="nav-item">首页</router-link>
      <router-link to="/words" class="nav-item">单词本</router-link>
      <router-link to="/practice" class="nav-item">练习</router-link>
      <router-link to="/settings" class="nav-item">设置</router-link>
    </nav>
    
    <main class="main">
      <router-view v-slot="{ Component }">
        <component :is="Component" />
      </router-view>
    </main>
  </div>
</template>

<style>
/* 添加全局高度设置 */
html, body, #app {
  height: 100%;
  margin: 0;
}

#app {
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
  min-height: 100vh; 
}

.app {
  display: flex;
  flex-direction: column;
  height: 100vh; /* 修改为100vh确保填满视口 */
}

.main {
  flex: 1;
  padding: 1rem;
  overflow-y: auto;
  background-color: white; /* 添加背景色区分内容区域 */
}


.nav {
  display: flex;
  justify-content: space-around;
  padding: 1rem;
  background-color: #f8f9fa; /* 更浅的灰色背景 */
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.nav-item {
  text-decoration: none;
  color: #333; /* 确保导航文字为深色 */
  padding: 0.5rem 1rem;
  border-radius: 4px;
  transition: background-color 0.3s;
}

.nav-item:hover {
  background-color: #f0f0f0;
}

.nav-item.router-link-active {
  background-color: #e0e0e0;
}

/* 移除重复的.main定义，保留以下版本 */
.main {
  flex: 1;
  padding: 1rem;
  overflow-y: auto;
  background-color: white;
  position: relative; /* 新增定位上下文 */
}
</style>