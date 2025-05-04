import express from 'express';
const router = express.Router();

// 临时内存数据库（后续需要替换为真实数据库）
let wordsDB = [];
let currentId = 1;

// 获取所有单词
// 添加根路径处理
router.get('', (res) => {
  res.json(wordsDB);
});

// 创建新单词
router.post('/', (req, res) => {
  const newWord = { id: currentId++, ...req.body };
  wordsDB.push(newWord);
  res.status(201).json(newWord);
});

// 更新单词
router.put('/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { word, meaning, example } = req.body; // 添加字段验证
    
    if (!word || !meaning) {
      return res.status(400).json({ error: '缺少必要字段' });
    }

    const index = wordsDB.findIndex(w => w.id === id);
    if (index === -1) {
      return res.status(404).json({ error: '单词不存在' });
    }
    
    // 保持字段名称一致
    wordsDB[index] = { 
      ...wordsDB[index],
      word: word.trim(),
      definition: meaning.trim(), // 注意字段名需要和前端统一
      example: example?.trim() || null
    };
    
    res.json(wordsDB[index]);
  } catch (error) {
    console.error('更新单词错误:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});


// 精确删除单个单词
router.delete('/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  wordsDB = wordsDB.filter(w => w.id !== id);
  res.sendStatus(204);
});

// 新增测试用全部删除端点
// 添加在单词路由文件中
router.delete('/', async (res) => {
  try {
    await db.run('DELETE FROM words')
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

export default router;