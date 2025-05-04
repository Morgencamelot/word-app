import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔧 修复Vue插件配置...');

// 1. 确保package.json中有正确的依赖
const packageJsonPath = path.join(__dirname, 'package.json');
try {
  const packageData = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  
  // 确保devDependencies中有@vitejs/plugin-vue
  if (!packageData.devDependencies['@vitejs/plugin-vue']) {
    console.log('添加@vitejs/plugin-vue到package.json');
    packageData.devDependencies['@vitejs/plugin-vue'] = '^4.5.0';
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageData, null, 2));
  }
  
  console.log('✅ package.json检查完成');
} catch (error) {
  console.error('❌ 读取或更新package.json时出错:', error);
}

// 2. 检查node_modules中是否存在Vue插件
const vuePluginPath = path.join(__dirname, 'node_modules', '@vitejs', 'plugin-vue');
const pluginExists = fs.existsSync(vuePluginPath);

console.log(pluginExists 
  ? '✅ Vue插件已安装在node_modules中' 
  : '❌ Vue插件未安装在node_modules中，请手动运行 npm install');

// 3. 确保vite.config.js正确配置
const viteConfigPath = path.join(__dirname, 'vite.config.js');
try {
  let viteConfig = fs.readFileSync(viteConfigPath, 'utf8');
  
  // 检查是否已导入vue插件
  if (!viteConfig.includes("import vue from '@vitejs/plugin-vue'")) {
    // 添加导入语句
    viteConfig = viteConfig.replace(
      "import { defineConfig } from 'vite'", 
      "import { defineConfig } from 'vite'\nimport vue from '@vitejs/plugin-vue'"
    );
  }
  
  // 检查是否已添加插件配置
  if (!viteConfig.includes('plugins: [vue()]')) {
    // 添加插件配置
    viteConfig = viteConfig.replace(
      'export default defineConfig({', 
      'export default defineConfig({\n  plugins: [vue()],'
    );
  }
  
  // 保存更新的配置
  fs.writeFileSync(viteConfigPath, viteConfig);
  console.log('✅ vite.config.js更新完成');
} catch (error) {
  console.error('❌ 更新vite.config.js时出错:', error);
}

console.log('\n🔔 配置更新完成！请重新启动应用：');
console.log('node start.js --dev'); 