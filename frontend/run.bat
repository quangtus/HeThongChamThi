@echo off
chcp 65001 >nul 2>&1

REM Always run from the frontend folder
cd /d "%~dp0"

echo [Frontend] Dang khoi dong server...
echo [Frontend] Thu muc hien tai: %cd%

REM Kiem tra va cai dat dependencies neu can
if not exist node_modules ( 
  echo [Frontend] Chua co node_modules, dang cai dat dependencies...
  call yarn install --silent
  if errorlevel 1 (
    echo [Frontend] LOI: Khong the cai dat dependencies!
    goto :ERROR
  )
  echo [Frontend] Da cai dat xong dependencies.
)

echo [Frontend] Dang chay "yarn dev"...
echo [Frontend] Vite se chay tren port 5173 (mac dinh)
echo.

call yarn dev

if errorlevel 1 (
  goto :ERROR
)

echo [Frontend] Server dang chay thanh cong!
goto :END

:ERROR
echo.
echo =======================================================
echo [Frontend] LOI: Lenh "yarn dev" da that bai.
echo.
echo Nguyen nhan co the:
echo   - Chua cai dat dependencies (chay yarn install).
echo   - Thieu script "dev" trong package.json.
echo   - Port 5173 dang duoc su dung boi ung dung khac.
echo   - Loi cau hinh Vite hoac Tailwind.
echo =======================================================
echo.

:END
echo Nhan phim bat ky de dong cua so nay...
pause > nul
