import express from 'express'
import { initDB } from '../database.js'

const router = express.Router()

// 修改数据库连接方式
let db;
// 修改数据库连接失败提示
initDB().then(conn => {
  db = conn
  console.log('✅ 数据库已连接')
}).catch(err => {
  console.error('数据库连接失败:', err)
  process.exit(1)
})

// 更新中间件提示信息
router.use((req, res, next) => {
  if (!db) {
    return res.status(500).json({ 
      error: '数据库未连接',
      connectionPath: 'D:/CursorCode/word-app/word.db'  // 更新为完整路径
    })
  }
  next()
})

// 获取所有单词
// 获取所有单词接口需要返回完整数据
router.get('/', async (_req, res) => {  // 添加下划线前缀表示未使用参数
  try {
    const rows = await new Promise((resolve, reject) => {
      db.all("SELECT * FROM words", (err, rows) => {
        err ? reject(err) : resolve(rows);
      });
    });
    res.json(rows.map(row => ({
      id: row.id,
      word: row.word,
      meaning: row.definition, // 修改字段名称匹配前端
      example: row.example
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 创建学习会话
router.post('/sessions', async (req, res) => {
  try {
    const { words } = req.body
    const result = await db.run(
      "INSERT INTO learning_sessions (words) VALUES (?)",
      [JSON.stringify(words)]
    )
    res.json({ 
      sessionId: result.lastID,
      totalWords: words.length
    })
  } catch (error) {
    console.error('[DB ERROR] Session creation failed:', error)
    res.status(500).json({ error: 'Failed to create session' })
  }
})

router.post('/import', async (req, res) => {
  try {
    const words = req.body;
    
    // 添加字段验证
    const validFields = ['word', 'definition', 'example', 'difficulty'];
    const invalidWords = words.filter(word => 
      !word.word || !word.definition || 
      Object.keys(word).some(key => !validFields.includes(key))
    );
    
    if (invalidWords.length > 0) {
      return res.status(400).json({ 
        error: '包含无效字段或缺失必要字段',
        invalidCount: invalidWords.length
      });
    }

    // 使用事务批量插入
    await db.run('BEGIN TRANSACTION');
    const stmt = await db.prepare(
      `INSERT INTO words 
      (word, definition, example, difficulty, created_at) 
      VALUES (?, ?, ?, ?, datetime('now'))`
    );
    
    words.forEach(word => {
      stmt.run([word.word, word.definition, word.example || null]);  // 参数改为数组形式
    });
    
    stmt.finalize(err => {
      if (err) {
        db.exec('ROLLBACK');
        return res.status(500).json({ error: err.message });
      }
      db.exec('COMMIT', (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ imported: words.length });
      });
    });
  } catch (err) {
    db.exec('ROLLBACK');  // 添加事务回滚
    res.status(500).json({ error: err.message });
  }
});
router.get('/test', (_req, res) => {
  res.json({ 
    connectionPath: 'D:/CursorCode/word-app/word.db'  // 更新路径显示
  })
})

// 更新单词接口
router.put('/:id', async (req, res) => {
  try {
    const { word, definition, example } = req.body
    db.run(
      `UPDATE words SET 
        word = ?, 
        definition = ?, 
        example = ?
       WHERE id = ?`,
      [word, definition, example, req.params.id],
      function(err) {
        if (err) return res.status(500).json({ error: err.message })
        res.json({ 
          id: this.lastID,
          word,
          definition,
          example 
        })
      }
    )
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})
router.delete('/', async (req, res) => {
  try {
    await db.run('DELETE FROM words');  // 使用数据库实例执行删除
    res.json({ 
      success: true,
      deletedCount: this.changes 
    });
  } catch (error) {
    console.error('[DB ERROR] Batch delete failed:', error);
    res.status(500).json({ 
      error: error.message,
      solution: '请检查数据库连接和表结构'
    });
  }
});
router.delete('/:id', async (req, res) => {
  try {
    await db.run("DELETE FROM words WHERE id = ?", req.params.id)
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})
export default router