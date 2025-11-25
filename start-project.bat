@echo off
rem =====================================================
rem   HE THONG THI VA CHAM THI - AUTO START SCRIPT
rem   Chuyen tat ca bang tieng Viet khong dau de tranh loi
rem =====================================================

rem Dat encoding UTF-8
chcp 65001 >nul 2>&1
setlocal enabledelayedexpansion

set ROOT=%~dp0

echo.
echo ========================================================
echo       HE THONG THI VA CHAM THI - KHOI DONG TU DONG
echo ========================================================
echo.

REM ========== BUOC 1: Dung tat ca Node.js processes cu ==========
echo [1/6] Dung tat ca Node.js processes cu...
taskkill /F /IM node.exe >nul 2>&1
if !errorlevel! equ 0 (
  echo       [OK] Da dung tat ca Node.js processes
) else (
  echo       [INFO] Khong co Node.js process nao dang chay
)
timeout /t 1 /nobreak >nul
echo.

REM ========== BUOC 2: Kiem tra moi truong ==========
echo [2/6] Kiem tra moi truong...

REM Kiem tra Node.js
where node >nul 2>&1
if !errorlevel! neq 0 (
  echo       [LOI] Khong tim thay Node.js!
  echo       Vui long cai dat Node.js tu: https://nodejs.org/
  pause
  exit /b 1
)
for /f "tokens=*" %%v in ('node -v') do set NODE_VER=%%v
echo       [OK] Node.js: !NODE_VER!

REM Kiem tra Yarn
where yarn >nul 2>&1
if !errorlevel! neq 0 (
  echo       [LOI] Khong tim thay Yarn!
  echo       Cai dat Yarn bang lenh: npm install -g yarn
  echo       Hoac: corepack enable
  pause
  exit /b 1
)
for /f "tokens=*" %%v in ('yarn -v') do set YARN_VER=%%v
echo       [OK] Yarn: !YARN_VER!

REM Kiem tra thu muc
if not exist "%ROOT%backend" (
  echo       [LOI] Khong tim thay thu muc "backend"!
  pause
  exit /b 1
)
if not exist "%ROOT%frontend" (
  echo       [LOI] Khong tim thay thu muc "frontend"!
  pause
  exit /b 1
)
echo       [OK] Cau truc thu muc hop le
echo.

REM ========== BUOC 3: Kiem tra va tao file .env ==========
echo [3/6] Kiem tra file cau hinh .env...

if not exist "%ROOT%backend\.env" (
  echo       [CANH BAO] Khong tim thay file .env trong backend!
  
  if exist "%ROOT%backend\.env.example" (
    echo       [INFO] Tim thay file .env.example, dang sao chep...
    copy "%ROOT%backend\.env.example" "%ROOT%backend\.env" >nul
    echo       [OK] Da tao file .env tu .env.example
  ) else (
    echo       [LOI] Khong tim thay file .env.example!
    echo       Vui long tao file backend\.env voi cau hinh database.
    pause
    exit /b 1
  )
) else (
  echo       [OK] Da tim thay file .env
)
echo.

REM ========== BUOC 4: Cai dat dependencies ==========
echo [4/6] Kiem tra va cai dat dependencies...

REM Backend dependencies
if not exist "%ROOT%backend\node_modules" (
  echo       [INFO] Cai dat dependencies cho Backend...
  pushd "%ROOT%backend"
  call yarn install
  if !errorlevel! neq 0 (
    echo       [LOI] Khong the cai dat dependencies cho Backend!
    popd
    pause
    exit /b 1
  )
  popd
  echo       [OK] Backend dependencies da cai dat
) else (
  echo       [OK] Backend dependencies da co san
)

REM Frontend dependencies
if not exist "%ROOT%frontend\node_modules" (
  echo       [INFO] Cai dat dependencies cho Frontend...
  pushd "%ROOT%frontend"
  call yarn install
  if !errorlevel! neq 0 (
    echo       [LOI] Khong the cai dat dependencies cho Frontend!
    popd
    pause
    exit /b 1
  )
  popd
  echo       [OK] Frontend dependencies da cai dat
) else (
  echo       [OK] Frontend dependencies da co san
)
echo.

REM ========== BUOC 5: Khoi dong cac server ==========
echo [5/6] Khoi dong cac server...
echo.

echo       Khoi dong Backend Server (port 5000)...
start "Backend Server - Port 5000" /D "%ROOT%backend" cmd /c "chcp 65001 >nul & yarn dev"

REM Cho backend khoi dong
echo       Cho Backend khoi dong...
timeout /t 4 /nobreak >nul

echo       Khoi dong Frontend Server (port 5173)...
start "Frontend Server - Port 5173" /D "%ROOT%frontend" cmd /c "chcp 65001 >nul & yarn dev"

REM Cho frontend khoi dong
echo       Cho Frontend khoi dong...
timeout /t 3 /nobreak >nul
echo.

REM ========== BUOC 6: Mo trinh duyet ==========
echo [6/6] Mo trinh duyet web...
timeout /t 2 /nobreak >nul
start "" "http://localhost:5173"
echo.

REM ========== HOAN TAT ==========
echo ========================================================
echo                  HE THONG DA SAN SANG!
echo ========================================================
echo.
echo   Frontend:  http://localhost:5173
echo   Backend:   http://localhost:5000
echo   API Health: http://localhost:5000/api/health
echo.
echo   -------------------------------------------------------
echo   TAI KHOAN DANG NHAP:
echo   -------------------------------------------------------
echo   - Admin:     admin / admin123
echo   - Examiner:  examiner / examiner123
echo   - Candidate: candidate / candidate123
echo.
echo   -------------------------------------------------------
echo   LUU Y:
echo   -------------------------------------------------------
echo   - Giu cua so nay mo de xem trang thai he thong
echo   - Dong cua so nay se KHONG dung cac server
echo   - De dung server: dong cac cua so "Backend Server" 
echo     va "Frontend Server" hoac chay taskkill /F /IM node.exe
echo.
echo ========================================================
echo.
echo Nhan phim bat ky de dong cua so huong dan nay...
pause >nul
