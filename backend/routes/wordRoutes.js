import express from 'express';
import { validateWord } from '../middleware/validateRequest.js';
import { AppError } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';
import { initDB, calculateNextReview } from '../database.js';

const router = express.Router();

// 获取所有单词
router.get('/', async (req, res, next) => {
  try {
    const db = await initDB();
    console.log('数据库连接成功，开始获取单词');
    
    const words = await new Promise((resolve, reject) => {
      db.all('SELECT * FROM words ORDER BY id DESC', (err, rows) => {
        if (err) {
          console.error('SQL查询错误:', err);
          reject(err);
        } else {
          console.log(`查询成功，返回${rows ? rows.length : 0}条记录`);
          resolve(rows || []);
        }
      });
    });
    
    // 确保返回的字段名与前端一致
    const formattedWords = (words || []).map(word => {
      if (!word) return null;
      
      // 打印第一条记录结构用于调试
      if (words.indexOf(word) === 0) {
        console.log('第一条记录结构:', Object.keys(word));
      }
      
      return {
        id: word.id,
        word: word.word || '',
        definition: word.definition || '',
        example: word.example || '',
        status: word.status || 'new',
        lastReview: word.lastReview || null,
        nextview: word.nextview || null,
        memoryStage: word.memoryStage || 0,
        reviewCount: word.reviewCount || 0
      };
    }).filter(Boolean); // 过滤掉null值
    
    console.log(`格式化后返回${formattedWords.length}条记录`);
    res.json(formattedWords);
  } catch (error) {
    console.error('获取单词列表失败:', error);
    // 直接返回500错误，不使用中间件
    return res.status(500).json({ 
      error: '获取单词列表失败', 
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined 
    });
  }
});

// 获取今天要复习的单词
router.get('/review', async (req, res, next) => {
  try {
    const db = await initDB();
    const now = new Date().toISOString();
    const words = await new Promise((resolve, reject) => {
      db.all(
        'SELECT * FROM words WHERE nextview <= ? OR nextview IS NULL ORDER BY RANDOM() LIMIT 20', 
        [now],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
    res.json(words);
  } catch (error) {
    next(new AppError('获取复习单词失败', 500));
  }
});

// 获取单个单词
router.get('/:id', async (req, res, next) => {
  try {
    const db = await initDB();
    const word = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM words WHERE id = ?', [req.params.id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
    
    if (!word) {
      return next(new AppError('单词不存在', 404));
    }
    
    res.json(word);
  } catch (error) {
    next(new AppError('获取单词失败', 500));
  }
});

// 创建新单词
router.post('/', validateWord, async (req, res, next) => {
  try {
    const { word, definition, example } = req.body;
    const db = await initDB();
    
    // 检查单词是否已存在
    const existingWord = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM words WHERE word = ?', [word], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
    
    if (existingWord) {
      return next(new AppError('单词已存在', 409));
    }
    
    // 设置下次复习时间为一天（艾宾浩斯第一个记忆点）
    const { nextDate } = calculateNextReview(0, true);
    
    const result = await new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO words (word, definition, example, status, nextview, memoryStage) VALUES (?, ?, ?, ?, ?, ?)',
        [word, definition, example, 'new', nextDate.toISOString(), 0],
        function(err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });
    
    logger.info(`创建新单词: ${word}`);
    res.status(201).json({ 
      id: result, 
      word, 
      definition, 
      example, 
      status: 'new',
      nextview: nextDate.toISOString(),
      memoryStage: 0
    });
  } catch (error) {
    next(new AppError('创建单词失败', 500));
  }
});

// 更新单词
router.put('/:id', validateWord, async (req, res, next) => {
  try {
    const { word, definition, example } = req.body;
    const db = await initDB();
    
    const result = await new Promise((resolve, reject) => {
      db.run(
        'UPDATE words SET word = ?, definition = ?, example = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [word, definition, example, req.params.id],
        function(err) {
          if (err) reject(err);
          else resolve(this.changes);
        }
      );
    });
    
    if (result === 0) {
      return next(new AppError('单词不存在', 404));
    }
    
    logger.info(`更新单词: ${word}`);
    res.json({ id: req.params.id, word, definition, example });
  } catch (error) {
    next(new AppError('更新单词失败', 500));
  }
});

// 删除单词
router.delete('/:id', async (req, res, next) => {
  try {
    const db = await initDB();
    
    const result = await new Promise((resolve, reject) => {
      db.run('DELETE FROM words WHERE id = ?', [req.params.id], function(err) {
        if (err) reject(err);
        else resolve(this.changes);
      });
    });
    
    if (result === 0) {
      return next(new AppError('单词不存在', 404));
    }
    
    logger.info(`删除单词ID: ${req.params.id}`);
    res.status(204).send();
  } catch (error) {
    next(new AppError('删除单词失败', 500));
  }
});

// 更新单词复习状态 - 使用艾宾浩斯曲线
router.post('/:id/review', async (req, res, next) => {
  try {
    const { isCorrect } = req.body;
    
    if (typeof isCorrect !== 'boolean') {
      return next(new AppError('请提供回答是否正确的布尔值', 400));
    }
    
    const db = await initDB();
    
    // 获取当前单词信息
    const word = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM words WHERE id = ?', [req.params.id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
    
    if (!word) {
      return next(new AppError('单词不存在', 404));
    }
    
    // 获取当前记忆阶段
    const currentStage = word.memoryStage || 0;
    
    // 计算下一次复习时间和记忆阶段
    const { nextDate, nextStage } = calculateNextReview(currentStage, isCorrect);
    
    // 更新复习计数
    const reviewCount = isCorrect ? (word.reviewCount || 0) + 1 : word.reviewCount || 0;
    
    // 确定新的状态
    let status = word.status;
    if (nextStage >= 3) {  // 如果已经到达第3阶段（7天或以上）
      status = 'mastered';
    } else if (nextStage >= 1) {  // 如果已经到达第1阶段（2天或以上）
      status = 'review';
    } else {  // 如果是第0阶段（1天）
      status = 'learning';
    }
    
    // 更新数据库
    await new Promise((resolve, reject) => {
      db.run(
        `UPDATE words SET 
          lastReview = CURRENT_TIMESTAMP, 
          nextview = ?, 
          memoryStage = ?, 
          reviewCount = ?,
          status = ? 
        WHERE id = ?`,
        [nextDate.toISOString(), nextStage, reviewCount, status, req.params.id],
        function(err) {
          if (err) reject(err);
          else resolve(this.changes);
        }
      );
    });
    
    logger.info(`复习单词: ID=${req.params.id}, 回答正确=${isCorrect}, 记忆阶段=${nextStage}, 下次复习=${nextDate.toISOString()}`);
    res.json({ 
      id: req.params.id, 
      nextview: nextDate.toISOString(),
      memoryStage: nextStage,
      reviewCount,
      status
    });
  } catch (error) {
    next(new AppError('更新复习状态失败', 500));
  }
});

export default router; 