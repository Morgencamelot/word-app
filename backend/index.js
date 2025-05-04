import express from 'express'
import cors from 'cors'
import { initDB, migrateDB } from './database.js'
import { errorHandler } from './middleware/errorHandler.js'
import { validateRequest } from './middleware/validateRequest.js'
import { logger } from './utils/logger.js'
import wordRoutes from './routes/wordRoutes.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = process.env.PORT || 3000

// 确保日志目录存在
const logDir = path.join(__dirname, '../logs')
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true })
}

// 中间件配置
app.use(cors())
app.use(express.json())

// 添加自定义简单日志中间件
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url}`);
  next();
});

// 请求验证中间件
app.use(validateRequest)

// 路由配置
app.use('/api/words', wordRoutes)

// 提供前端静态文件
const frontendBuildPath = path.join(__dirname, '../dist')
if (fs.existsSync(frontendBuildPath)) {
  app.use(express.static(frontendBuildPath))
  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendBuildPath, 'index.html'))
  })
}

// 错误处理中间件
app.use(errorHandler)

// 健康检查端点
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// 启动服务器
async function startServer() {
  try {
    // 初始化数据库
    const db = await initDB()
    await migrateDB(db)
    
    app.listen(PORT, () => {
      logger.info(`Server is running on port ${PORT}`)
      console.log(`服务器运行在 http://localhost:${PORT}`)
    })
  } catch (error) {
    logger.error('Failed to start server:', error)
    console.error('启动服务器失败:', error)
    process.exit(1)
  }
}

startServer()

// 修改导出方式
export default app;
