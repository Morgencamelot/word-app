import { AppError } from './errorHandler.js';

// 简化的请求体验证中间件
export const validateRequest = (req, res, next) => {
  // 不验证健康检查端点和OPTIONS请求
  if (req.path === '/health' || req.method === 'OPTIONS') {
    return next();
  }

  // 只验证POST和PUT请求的请求体
  if (req.method === 'POST' || req.method === 'PUT') {
    // 验证请求体
    if (!req.body || Object.keys(req.body).length === 0) {
      throw new AppError('请求体不能为空', 400);
    }
    
    // 验证Content-Type
    const contentType = req.headers['content-type'];
    if (!contentType || !contentType.includes('application/json')) {
      throw new AppError('Content-Type必须是application/json', 415);
    }
  }
  
  next();
};

// 单词验证中间件
export const validateWord = (req, res, next) => {
  const { word, definition, example } = req.body;

  if (!word || typeof word !== 'string' || word.trim().length === 0) {
    throw new AppError('单词不能为空', 400);
  }

  if (!definition || typeof definition !== 'string' || definition.trim().length === 0) {
    throw new AppError('释义不能为空', 400);
  }

  if (example && (typeof example !== 'string' || example.trim().length === 0)) {
    throw new AppError('例句格式不正确', 400);
  }

  next();
}; 