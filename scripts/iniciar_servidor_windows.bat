@echo off
title Olha o Replay - Servidor
REM Vai para a raiz do projeto (este arquivo fica em scripts/)
pushd "%~dp0.."

echo Iniciando Site (porta 8000)...
start "Site Olha o Replay" cmd /k "python -m http.server 8000"

echo Iniciando Backend (porta 5000)...
start "Backend Olha o Replay" cmd /k "python server\app.py"

echo Pronto! Acesse o site em: http://localhost:8000/search.html
echo Se outro aparelho for usar, acesse: http://SEU_IP:8000/search.html
echo (Descubra o IP com o comando: ipconfig)

pause