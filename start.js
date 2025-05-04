import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 确保日志目录存在
const logDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// 确定是否需要构建前端
const distDir = path.join(__dirname, 'dist');
const needBuild = !fs.existsSync(distDir);

console.log('📝 单词学习应用启动器');
console.log('------------------');

function runCommand(command, args, cwd = __dirname) {
  return new Promise((resolve, reject) => {
    console.log(`> ${command} ${args.join(' ')}`);
    const proc = spawn(command, args, {
      cwd,
      stdio: 'inherit',
      shell: true
    });

    proc.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`命令 ${command} 退出时返回代码 ${code}`));
      }
    });
  });
}

async function startApp() {
  try {
    if (needBuild) {
      console.log('🔨 构建前端应用...');
      await runCommand('npm', ['run', 'build']);
    }

    console.log('🚀 启动后端服务器...');
    await runCommand('npm', ['run', 'start']);
  } catch (error) {
    console.error('❌ 启动失败:', error.message);
    process.exit(1);
  }
}

// 开发模式启动（同时启动前端和后端）
async function startDev() {
  try {
    console.log('🔧 开发模式启动...');
    
    // 创建两个进程
    const backend = spawn('npm', ['run', 'start:dev'], {
      stdio: 'inherit',
      shell: true
    });
    
    const frontend = spawn('npm', ['run', 'dev'], {
      stdio: 'inherit',
      shell: true
    });
    
    process.on('SIGINT', () => {
      console.log('👋 停止所有服务...');
      backend.kill();
      frontend.kill();
      process.exit(0);
    });
    
    backend.on('close', (code) => {
      if (code !== 0 && code !== null) {
        console.error(`❌ 后端服务异常退出，代码: ${code}`);
        frontend.kill();
        process.exit(1);
      }
    });
    
    frontend.on('close', (code) => {
      if (code !== 0 && code !== null) {
        console.error(`❌ 前端服务异常退出，代码: ${code}`);
        backend.kill();
        process.exit(1);
      }
    });
  } catch (error) {
    console.error('❌ 开发模式启动失败:', error.message);
    process.exit(1);
  }
}

// 判断启动模式
const isDev = process.argv.includes('--dev');
if (isDev) {
  startDev();
} else {
  startApp();
} 