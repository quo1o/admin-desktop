@echo off

set KKMSERVER_HOME=C:\Program Files (x86)\kkm-server

echo Installing KKMserver...

echo Home: %USERPROFILE%
echo Current: %~dp0
echo KKMserver Home: %KKMSERVER_HOME%

"%~dp0\Setup_KkmServer.exe" /SP- /VERYSILENT /SUPPRESSMSGBOXES /NOCANCEL /NOICONS /NORESTART /LOG=%USERPROFILE%\kkmserver-install.log /DIR="%KKMSERVER_HOME%"
echo App installed

copy "%~dp0\SettingsServ.ini" "%KKMSERVER_HOME%\Settings"
echo Settings copied

C:\Windows\Microsoft.NET\Framework\v4.0.30319\InstallUtil.exe "%KKMSERVER_HOME%\KkmServer.exe" /LogFile=%USERPROFILE%\kkmserver-service-install.log /LogToConsole=true
echo Service installed

sc config KkmServer binpath= "%KKMSERVER_HOME%\KkmServer.exe RunAsService"
echo Service registered

sc start KkmServer
echo Service started

echo Done
