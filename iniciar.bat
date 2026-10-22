@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>&1
if errorlevel 1 (
  echo.
  echo Node.js nao foi encontrado.
  echo Instale o Node.js 22 ou superior e tente novamente.
  echo.
  pause
  exit /b 1
)

echo.
echo =============================================
echo    DESIGNER FECHADURAS - TESTE LOCAL
echo =============================================
echo.
echo O site sera aberto automaticamente no navegador.
echo Para encerrar o servidor, feche esta janela.
echo.
node servidor-local.js
pause
