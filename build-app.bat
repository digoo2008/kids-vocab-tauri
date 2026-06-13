@echo off
cd /d "%~dp0"

echo == 1/3: 激活 MSVC x64 编译环境 ==
call "C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\VC\Auxiliary\Build\vcvars64.bat"

echo == 2/3: 构建前端资源 ==
if not exist "dist" mkdir dist
copy /Y src\index.html dist\ >nul
xcopy /E /I /Y src\css dist\css >nul
xcopy /E /I /Y src\js dist\js >nul
echo 前端资源构建完成

echo == 3/3: 打包 Tauri 客户端 ==
npx @tauri-apps/cli build

echo == 打包完成! ==
pause
