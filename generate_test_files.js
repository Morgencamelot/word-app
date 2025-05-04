import fs from 'fs'

// 生成逗号分隔的CSV（包含引号转义）
function generateCommaCSV() {
  let content = 'word,meaning\n'
  for (let i = 1; i <= 500; i++) {
    content += `word_${i},"definition,${i}"\n`
  }
  fs.writeFileSync('./test_data/test1.csv', content)
}

// 生成分号分隔的CSV（包含混合引号）
function generateSemicolonCSV() {
  let content = 'word;meaning\n'
  for (let i = 1; i <= 500; i++) {
    content += `"word_${i}";definition ${i}\n`
  }
  fs.writeFileSync('./test_data/test2.csv', content)
}

// 创建测试数据目录
if (!fs.existsSync('./test_data')) {
  fs.mkdirSync('./test_data')
}

generateCommaCSV()
generateSemicolonCSV()
console.log('测试文件生成完成')