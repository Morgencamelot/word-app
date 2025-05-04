import express from 'express';
import cors from 'cors';
import wordsRouter from './routes/words.js';

const app = express();

// ... existing code ...

// 启动服务
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ 服务已启动在端口 ${PORT}`);
});