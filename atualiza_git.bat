@echo off
REM Atualiza automaticamente o repositório Git do ERP PRO

cd "C:\caminho\para\Amazing Corporation ERP PRO"

REM Adiciona todos os arquivos
git add .

REM Cria um commit com mensagem automática e data
git commit -m "Atualização automática %date% %time%"

REM Envia para o GitHub
git push origin master

REM Mensagem de conclusão
echo Repositório atualizado com sucesso!
pause