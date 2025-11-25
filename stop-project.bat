@echo off
rem =====================================================
rem   HE THONG THI VA CHAM THI - STOP SCRIPT
rem =====================================================

chcp 65001 >nul 2>&1

echo.
echo ========================================================
echo       HE THONG THI VA CHAM THI - DUNG HE THONG
echo ========================================================
echo.

echo Dang dung tat ca Node.js processes...
taskkill /F /IM node.exe >nul 2>&1
if %errorlevel% equ 0 (
  echo [OK] Da dung tat ca Node.js processes thanh cong!
) else (
  echo [INFO] Khong co Node.js process nao dang chay.
)

echo.
echo ========================================================
echo                  HE THONG DA DUNG!
echo ========================================================
echo.
echo Nhan phim bat ky de dong cua so nay...
pause >nul
