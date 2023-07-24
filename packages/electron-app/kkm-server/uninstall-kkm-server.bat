@echo off

set KKMSERVER_HOME=C:\Program Files (x86)\kkm-server

echo Unistalling KKMserver...

echo Home: %USERPROFILE%
echo Current: %~dp0
echo KKMserver Home: %KKMSERVER_HOME%

sc stop KkmServer
echo Service stopped

sc delete KkmServer
echo Service unregistered

C:\Windows\Microsoft.NET\Framework\v4.0.30319\InstallUtil.exe /u "%KKMSERVER_HOME%\KkmServer.exe" /LogFile=%USERPROFILE%\Appkkmserver-service-uninstall.log /LogToConsole=true
echo Service uninstalled

"%KKMSERVER_HOME%\unins000.exe" /VERYSILENT /SUPPRESSMSGBOXES /NORESTART /LOG=%USERPROFILE%\kkmserver-uninstall.log
echo App uninstalled

echo Done
