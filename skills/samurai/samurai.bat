@echo off
REM SAMURAI Build Machine — Windows Launcher
REM Location: C:\Users\Nishan\Xtobe\Skills\samurai\samurai.bat

setlocal

set "SAMURAI_DIR=%~dp0"
set "PYTHON=python"

if "%1"=="" (
    echo.
    echo SAMURAI Build Machine
    echo ====================
    echo.
    echo Usage:
    echo   samurai.bat init ^<project_name^>
    echo   samurai.bat pipeline full --brief "your brief"
    echo   samurai.bat run "/command1 + /command2" --n 9 --chaos 0.4
    echo   samurai.bat deploy --image hero_refined.jpg
    echo.
    echo For full help: python samurai_cli.py --help
    echo.
    goto :eof
)

%PYTHON% "%SAMURAI_DIR%samurai_cli.py" %*

endlocal
