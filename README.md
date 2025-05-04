# 记单词应用 (Word-App) v1.0.0

一个基于Vue.js和SQLite的记单词应用，支持艾宾浩斯遗忘曲线记忆法。

## 主要功能

- 单词管理：添加、编辑、删除单词
- 词库导入：支持从TXT和CSV文件导入单词
- 智能复习：基于艾宾浩斯遗忘曲线的记忆算法
- 记忆状态跟踪：记录单词的记忆阶段和下次复习时间

## 技术栈

- 前端：Vue 3 + Vite + Pinia
- 后端：Express.js
- 数据库：SQLite3

## 版本1.0.0更新内容

1. 数据库改进：
   - 添加了nextview、reviewCount、memoryStage等字段
   - 实现了艾宾浩斯遗忘曲线算法(1天、2天、4天、7天、15天、30天)
   - 简化了数据库结构

2. 后端改进：
   - 完善了错误处理机制
   - 添加了日志记录
   - 实现了单词复习API

3. 前端改进：
   - 支持艾宾浩斯复习功能
   - 添加了单词状态标签和记忆进度展示
   - 修复了字段不一致问题

## 如何使用

1. 安装依赖：
```
npm install
```

2. 启动开发服务：
```
npm run dev  # 前端服务
npm run start  # 后端服务
```

3. 构建生产版本：
```
npm run build
```

## 后续计划

- 添加用户认证系统
- 支持云同步功能
- 添加更多的学习统计数据
- 优化移动端体验

## 功能特点

- 添加、编辑和删除单词
- 基于艾宾浩斯遗忘曲线的科学记忆方法
- 智能安排复习时间
- 追踪学习进度
- 完全本地运行，无需互联网连接

## 安装与运行

1. 克隆仓库：

```bash
git clone https://github.com/yourusername/word-app.git
cd word-app
```

2. 安装依赖：

```bash
npm install
```

3. 运行应用：

```bash
# 生产模式
node start.js

# 开发模式（同时启动前端和后端）
node start.js --dev
```

## 数据备份

应用会自动在 `word.db` 文件中存储您的单词数据。建议定期备份此文件。

## 艾宾浩斯遗忘曲线

本应用采用简化版艾宾浩斯遗忘曲线（Ebbinghaus Forgetting Curve）来安排单词复习：

- 艾宾浩斯遗忘曲线描述了人类记忆随时间衰减的规律
- 通过在关键时间点进行复习，可以显著提高记忆保留率
- 应用自动安排以下复习时间点：
  1. 第一次学习后1天
  2. 第一次复习后2天
  3. 第二次复习后4天
  4. 第三次复习后7天
  5. 第四次复习后15天
  6. 第五次复习后30天

- 如果某次复习回答错误，会回退一个记忆阶段，加强巩固

## 单词状态说明

- `new`：新添加的单词
- `learning`：第0阶段的单词（1天）
- `review`：第1-2阶段的单词（2-4天）
- `mastered`：第3阶段以上的单词（7天以上）

## API文档

### 单词管理

- `GET /api/words` - 获取所有单词
- `GET /api/words/review` - 获取今日需要复习的单词
- `GET /api/words/:id` - 获取单个单词
- `POST /api/words` - 创建新单词
- `PUT /api/words/:id` - 更新单词
- `DELETE /api/words/:id` - 删除单词
- `POST /api/words/:id/review` - 更新单词复习状态

# Vue 3 + Vite

This template should help get you started developing with Vue 3 in Vite. The template uses Vue 3 `<script setup>` SFCs, check out the [script setup docs](https://v3.vuejs.org/api/sfc-script-setup.html#sfc-script-setup) to learn more.

Learn more about IDE Support for Vue in the [Vue Docs Scaling up Guide](https://vuejs.org/guide/scaling-up/tooling.html#ide-support).
