@echo off
chcp 65001 > nul
echo stopping...
taskkill /f /im node.exe /t > nul 2>&1
echo starting...
cd /d %~dp0

REM 添加文件存在性检查
if exist backend\word.db (
    echo Found,cleaning...
    del backend\word.db /Q
) else (
    echo Not found,skipping...
)

start /B node backend/index.js
echo.
:loop
set /p "input=输入 q 退出"
if /i "%input%"=="q" (
    taskkill /f /im node.exe > nul 2>&1
    exit
)
goto loop
echo successful
timeout /t 3