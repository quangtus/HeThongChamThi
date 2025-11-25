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

REM ========== BUOC 3: Kiem tra file .env ==========
echo [3/6] Kiem tra file cau hinh .env...

if not exist "%ROOT%backend\.env" (
  echo.
  echo       [LOI] Khong tim thay file .env trong backend!
  echo.
  echo       -------------------------------------------------------
  echo       BAN CAN TAO FILE backend\.env VOI NOI DUNG SAU:
  echo       -------------------------------------------------------
  echo.
  echo       ## Database - PostgreSQL
  echo       PGHOST=your_database_host_here
  echo       PGPORT=5432
  echo       PGUSER=your_database_user_here
  echo       PGPASSWORD=your_database_password_here
  echo       PGDATABASE=your_database_name_here
  echo       PGSSL=true
  echo.
  echo       ## Backend
  echo       PORT=5000
  echo       NODE_ENV=development
  echo       JWT_SECRET=your_jwt_secret_key_here
  echo       JWT_EXPIRE=7d
  echo.
  echo       ## AWS S3 ^(neu dung upload file^)
  echo       AWS_ACCESS_KEY_ID=your_aws_access_key_here
  echo       AWS_SECRET_ACCESS_KEY=your_aws_secret_key_here
  echo       AWS_S3_BUCKET=your_s3_bucket_name_here
  echo.
  echo       -------------------------------------------------------
  echo       Xem file backend\.env.example de biet cau truc mau.
  echo       Sau khi tao xong, chay lai start-project.bat
  echo       -------------------------------------------------------
  echo.
  pause
  exit /b 1
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
