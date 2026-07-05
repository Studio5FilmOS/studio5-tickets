@echo off
title Despliegue de Studio 5 Tickets a GitHub
chcp 65001 > nul
cls

echo ========================================================
echo       DESPLIEGUE AUTOMÁTICO DE TICKETS STUDIO 5
echo ========================================================
echo.
echo Este script inicializará Git y subirá todo el código
echo (incluyendo el frontend compilado) a tu repositorio.
echo.
echo REQUISITO: Crea un repositorio VACÍO en tu cuenta de
echo GitHub (o de la organización Studio5FilmOS) llamado:
echo "studio5-tickets"
echo.
set /p REPO_URL="Ingresa la URL de tu repositorio de GitHub (ej. https://github.com/Studio5FilmOS/studio5-tickets.git): "

if "%REPO_URL%"=="" (
    echo.
    echo [ERROR] No ingresaste ninguna URL. Abortando.
    pause
    exit
)

echo.
echo [1/5] Inicializando repositorio Git local...
git init

echo.
echo [2/5] Agregando archivos al commit...
git add .

echo.
echo [3/5] Creando primer commit local...
git commit -m "Despliegue inicial de PWA tickets Studio 5 con pasarela Payphone"

echo.
echo [4/5] Configurando repositorio remoto...
git branch -M main
git remote remove origin >nul 2>&1
git remote add origin %REPO_URL%

echo.
echo [5/5] Subiendo código a GitHub...
echo.
echo (Si es la primera vez, se abrirá una ventana de GitHub para iniciar sesión)
git push -u origin main

if %ERRORLEVEL% equ 0 (
    echo.
    echo ========================================================
    echo   ¡CÓDIGO SUBIDO CON ÉXITO A GITHUB!
    echo ========================================================
    echo.
    echo Siguientes pasos en tu Easypanel:
    echo 1. Entra a tu proyecto "studio5" en http://72.62.170.115:3000
    echo 2. Haz clic en "+ Service" y selecciona "App"
    echo 3. Ponle de nombre "studio5-tickets"
    echo 4. Conecta el repositorio que acabas de subir: Studio5FilmOS/studio5-tickets
    echo 5. Configura la ruta raíz (Root Directory) como: "backend"
    echo 6. Agrega las variables de entorno detalladas en el chat
    echo 7. En la pestaña "Domains" agrega: ticket.studio5film.com
    echo 8. Presiona "Deploy" y listo.
    echo ========================================================
) else (
    echo.
    echo [ERROR] Hubo un problema al subir los archivos a GitHub.
    echo Asegúrate de tener permisos en el repositorio y de haber iniciado sesión en Git.
)

pause
