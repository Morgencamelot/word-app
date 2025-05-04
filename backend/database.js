import sqlite3 from 'sqlite3'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// 使用环境变量或默认值
const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../word.db')

// 确保日志目录存在
const logDir = path.join(__dirname, '../logs')
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true })
}

export function initDB() {
  return new Promise((resolve, reject) => {
    const conn = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        console.error('Error initializing database:', err);
        reject(err);
      }
      console.log(`Database connected at: ${DB_PATH}`);
      resolve(conn);
    });
  });
}

// 数据库迁移函数
export async function migrateDB(db) {
  return new Promise((resolve, reject) => {
    const migrations = [
      // 创建words表 - 注意：这里使用nextview而不是nextReview以匹配现有数据库
      `CREATE TABLE IF NOT EXISTS words (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        word TEXT NOT NULL,
        definition TEXT NOT NULL,
        example TEXT,
        status TEXT DEFAULT 'new',
        lastReview DATETIME,
        nextview DATETIME,
        reviewCount INTEGER DEFAULT 0,
        memoryStage INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      
      // 检查并添加缺失的列
      `PRAGMA table_info(words)`,
      
      // 添加索引
      `CREATE INDEX IF NOT EXISTS idx_words_status ON words(status)`,
      `CREATE INDEX IF NOT EXISTS idx_words_next_view ON words(nextview)`
    ];

    // 执行迁移
    db.serialize(() => {
      db.run('BEGIN TRANSACTION');
      
      // 先执行表创建
      db.run(migrations[0], (err) => {
        if (err) {
          console.error('创建表失败:', err);
          db.run('ROLLBACK');
          reject(err);
          return;
        }
        
        // 检查表结构
        db.all(migrations[1], async (err, columns) => {
          if (err) {
            console.error('检查表结构失败:', err);
            db.run('ROLLBACK');
            reject(err);
            return;
          }
          
          const columnNames = columns.map(col => col.name);
          const missingColumns = [];
          
          // 检查缺失的列
          if (!columnNames.includes('reviewCount')) {
            missingColumns.push(`ALTER TABLE words ADD COLUMN reviewCount INTEGER DEFAULT 0`);
          }
          
          if (!columnNames.includes('memoryStage')) {
            missingColumns.push(`ALTER TABLE words ADD COLUMN memoryStage INTEGER DEFAULT 0`);
          }
          
          if (!columnNames.includes('created_at')) {
            missingColumns.push(`ALTER TABLE words ADD COLUMN created_at DATETIME DEFAULT NULL`);
          }
          
          if (!columnNames.includes('updated_at')) {
            missingColumns.push(`ALTER TABLE words ADD COLUMN updated_at DATETIME DEFAULT NULL`);
          }
          
          // 执行添加缺失列的SQL
          if (missingColumns.length > 0) {
            console.log('需要添加的列:', missingColumns);
            
            for (const sql of missingColumns) {
              try {
                await new Promise((resolve, reject) => {
                  db.run(sql, (err) => {
                    if (err) {
                      console.error(`添加列失败: ${sql}`, err);
                      reject(err);
                    } else {
                      console.log(`成功添加列: ${sql}`);
                      resolve();
                    }
                  });
                });
              } catch (err) {
                console.error('添加列时出错:', err);
                db.run('ROLLBACK');
                reject(err);
                return;
              }
            }
          }
          
          // 创建索引
          db.run(migrations[2], (err) => {
            if (err) console.error('创建status索引失败:', err);
            
            db.run(migrations[3], (err) => {
              if (err) console.error('创建nextview索引失败:', err);
              
              db.run('COMMIT', (err) => {
                if (err) {
                  console.error('提交事务失败:', err);
                  reject(err);
                } else {
                  console.log('数据库迁移成功完成');
                  resolve();
                }
              });
            });
          });
        });
      });
    });
  });
}

// 使用艾宾浩斯遗忘曲线计算下一次复习时间
export function calculateNextReview(memoryStage, wasCorrect = true) {
  // 艾宾浩斯遗忘曲线复习间隔（单位：天）
  // 1天、2天、4天、7天、15天、30天
  const ebinghausIntervals = [
    1,      // 1天
    2,      // 2天
    4,      // 4天
    7,      // 7天
    15,     // 15天
    30,     // 30天
  ];
  
  // 如果回答错误，回退一个阶段（最小为0）
  let nextStage = wasCorrect 
    ? Math.min(memoryStage + 1, ebinghausIntervals.length - 1)
    : Math.max(0, memoryStage - 1);
  
  // 获取下一次间隔天数
  let intervalDays = ebinghausIntervals[nextStage];
  
  // 计算下一次复习日期
  const now = new Date();
  const nextDate = new Date(now);
  
  // 将天数转换为毫秒
  const intervalMs = intervalDays * 24 * 60 * 60 * 1000;
  nextDate.setTime(now.getTime() + intervalMs);
  
  return {
    nextDate,
    nextStage
  };
}

// 数据库备份函数
export async function backupDB() {
  const backupPath = DB_PATH.replace('.db', `_backup_${new Date().toISOString().replace(/[:.]/g, '-')}.db`);
  return new Promise((resolve, reject) => {
    const source = new sqlite3.Database(DB_PATH);
    const backup = new sqlite3.Database(backupPath);
    
    source.backup(backup, {
      progress: (status) => {
        console.log(`Backup progress: ${status.remaining} pages remaining`);
      }
    }, (err) => {
      if (err) {
        console.error('Backup failed:', err);
        reject(err);
      } else {
        console.log(`Backup completed successfully to: ${backupPath}`);
        resolve(backupPath);
      }
    });
  });
}

// 导出数据库工具函数
export async function exportDB() {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(DB_PATH);
    const exportPath = DB_PATH.replace('.db', `_export_${new Date().toISOString().replace(/[:.]/g, '-')}.sql`);
    
    const fs = require('fs');
    const stream = fs.createWriteStream(exportPath);
    
    db.serialize(() => {
      db.each("SELECT sql FROM sqlite_master WHERE type='table'", (err, row) => {
        if (err) {
          console.error('Error exporting schema:', err);
          reject(err);
        }
        stream.write(row.sql + ';\n');
      });
      
      db.each("SELECT * FROM words", (err, row) => {
        if (err) {
          console.error('Error exporting words:', err);
          reject(err);
        }
        const values = Object.values(row).map(v => typeof v === 'string' ? `'${v}'` : v);
        stream.write(`INSERT INTO words VALUES (${values.join(', ')});\n`);
      });
      
      stream.end(() => {
        console.log(`Database exported successfully to: ${exportPath}`);
        resolve(exportPath);
      });
    });
  });
}