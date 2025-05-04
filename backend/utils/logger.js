import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 创建日志目录
const logDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// 创建简单的日志功能
export const logger = {
  info: (message) => {
    const logMessage = `[INFO] ${new Date().toISOString()} - ${message}\n`;
    fs.appendFileSync(path.join(logDir, 'combined.log'), logMessage);
    console.log(`📝 ${message}`);
  },
  
  error: (message, details = '') => {
    const errorMessage = `[ERROR] ${new Date().toISOString()} - ${message} ${details ? '- ' + JSON.stringify(details) : ''}\n`;
    fs.appendFileSync(path.join(logDir, 'error.log'), errorMessage);
    fs.appendFileSync(path.join(logDir, 'combined.log'), errorMessage);
    console.error(`❌ ${message}`);
    if (details) console.error(details);
  },
  
  debug: (message) => {
    const logMessage = `[DEBUG] ${new Date().toISOString()} - ${message}\n`;
    fs.appendFileSync(path.join(logDir, 'combined.log'), logMessage);
    console.debug(`🔍 ${message}`);
  }
};

// 简化的日志工具函数
export const logError = (error, req = null) => {
  const logData = {
    message: error.message,
    stack: error.stack,
    ...(req && {
      path: req.path,
      method: req.method,
      body: req.body,
      query: req.query,
      params: req.params
    })
  };
  logger.error(error.message, logData);
};

export const logInfo = (message, meta = {}) => {
  logger.info(message);
};

export const logDebug = (message, meta = {}) => {
  logger.debug(message);
};

// 导出日志级别常量
export const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  verbose: 4,
  debug: 5,
  silly: 6
}; 