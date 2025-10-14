@echo off
title Instalar Tarefas Agendadas - Olha o Replay
REM Execute este arquivo como ADMINISTRADOR

REM Define raiz do projeto (este arquivo fica em scripts/)
pushd "%~dp0.."
set ROOT=%CD%

set SITE_TASK=OlhaReplay_Site
set API_TASK=OlhaReplay_Backend

echo Removendo tarefas antigas (se existirem)...
schtasks /Delete /TN "%SITE_TASK%" /F >nul 2>&1
schtasks /Delete /TN "%API_TASK%" /F >nul 2>&1

echo Criando tarefa do SITE (porta 8000)...
schtasks /Create /TN "%SITE_TASK%" /SC ONLOGON /RL LIMITED /TR "cmd /c cd /d \"%ROOT%\" && python -m http.server 8000" /F

echo Criando tarefa do BACKEND (porta 5000)...
schtasks /Create /TN "%API_TASK%" /SC ONLOGON /RL LIMITED /TR "cmd /c cd /d \"%ROOT%\" && python server\app.py" /F

echo Tarefas criadas com sucesso.
echo Para iniciar agora sem reiniciar:
echo - Abra o Agendador de Tarefas e execute %SITE_TASK% e %API_TASK%
echo Ou rode estes comandos:
echo   schtasks /Run /TN %SITE_TASK%
echo   schtasks /Run /TN %API_TASK%

pause