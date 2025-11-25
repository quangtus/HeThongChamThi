@echo off
chcp 65001 >nul 2>&1

REM Always run from the backend folder
cd /d "%~dp0"

echo [Backend] Dang khoi dong server...
echo [Backend] Thu muc hien tai: %cd%

REM Kiem tra file .env
if exist .env (
  echo [Backend] Phat hien file .env.
) else (
  echo [Backend] LOI: Khong tim thay file .env!
)

REM Kiem tra va cai dat dependencies neu can
if not exist node_modules ( 
  echo [Backend] Chua co node_modules, dang cai dat dependencies...
  call yarn install --silent
  if errorlevel 1 (
    echo [Backend] LOI: Khong the cai dat dependencies!
    goto :ERROR
  )
  echo [Backend] Da cai dat xong dependencies.
)

REM Dam bao module pg co san
if not exist node_modules\pg (
  echo [Backend] Thieu module pg, dang cai dat...
  call yarn add pg --silent
)

REM (Bo qua buoc kiem tra ket noi DB vi thieu script check-pg-connection.js)

echo [Backend] Dang chay "yarn dev"...
echo.

call yarn dev
if errorlevel 1 (
  goto :ERROR
)

echo [Backend] Server dang chay thanh cong!
goto :END

:ERROR
echo.
echo ======================================================
echo [Backend] LOI: Lenh "yarn dev" da that bai.
echo.
echo Nguyen nhan co the:
echo   - Chua cai dat dependencies (chay yarn install).
echo   - Thong tin ket noi PostgreSQL trong .env bi sai.
echo   - Supabase/PostgreSQL khong truy cap duoc (SSL bat buoc).
echo   - Thieu script "dev" trong package.json.
echo ======================================================
echo.

:END
echo Nhan phim bat ky de dong cua so nay...
pause > nul
