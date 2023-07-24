!include '${PROJECT_DIR}\dialog-mode.nsh'
!include '${PROJECT_DIR}\dialog.nsh'

!macro customInstall
  ; Create registry entries
  !include '${PROJECT_DIR}\registry.nsh'
  ${ifNot} ${isUpdated}
    ; Create directory to store databases
    CreateDirectory 'C:\Users\Default\AppData\Roaming\admin-desktop\db'
    ; Insert input values to registry
    WriteRegStr HKEY_LOCAL_MACHINE "SOFTWARE\admin_desktop\Env" "MODE" $hCtl_dialog_mode_Mode
    ${if} $hCtl_dialog_mode_Mode == 'classic'
      WriteRegStr HKEY_LOCAL_MACHINE "SOFTWARE\admin_desktop\Env" "TERMINAL_ADDRESS" $hCtl_dialog_TerminalIPTextBox_Text
      WriteRegStr HKEY_LOCAL_MACHINE "SOFTWARE\admin_desktop\Env" "TERMINAL_MODEL" $hCtl_dialog_TerminalModelDropList_Text
      WriteRegStr HKEY_LOCAL_MACHINE "SOFTWARE\admin_desktop\Env" "TERMINAL_ACQUIRING" $hCtl_dialog_AcquiringTypeDropList_Text
      WriteRegStr HKEY_LOCAL_MACHINE "SOFTWARE\admin_desktop\Env" "ENDPOINT_ID" $hCtl_dialog_TerminalIDTextBox_Text
      WriteRegStr HKEY_LOCAL_MACHINE "SOFTWARE\admin_desktop\Env" "PRINTER_ADDRESS" $hCtl_dialog_PrinterIPTextBox_Text
      WriteRegStr HKEY_LOCAL_MACHINE "SOFTWARE\admin_desktop\Env" "PRINTER_MODEL" $hCtl_dialog_PrinterModelDropList_Text
      WriteRegStr HKEY_LOCAL_MACHINE "SOFTWARE\admin_desktop\Env" "DISABLE_AUTO_CLOSE_SHIFT" "false"
      WriteRegStr HKEY_LOCAL_MACHINE "SOFTWARE\admin_desktop\Env" "DISABLE_PRINTER_HEALTHCHECK" "false"
      ; Install Java
      ExecWait '$INSTDIR\resources\jre-8u251-windows-x64.exe INSTALLCFG="$INSTDIR\resources\jre-install.cfg"'
    ${endIf}
    ${if} $hCtl_dialog_mode_Mode == 'kkm-server'
      ExecWait '$INSTDIR\resources\install-kkm-server.bat'
    ${endIf}
    ; Write 'AUTOUPDATE = true' to registry if checkbox checked
    ${if} $hCtl_dialog_mode_EnableAutoupdateCheckBox_State == ${BST_CHECKED}
      WriteRegStr HKEY_LOCAL_MACHINE "SOFTWARE\admin_desktop\Env" "AUTOUPDATE" "true"
    ${endIf}
  ${endIf}

  ${if} ${isUpdated}
    ; Reinstall KKMServer if needed
    IfFileExists 'C:\Program Files (x86)\kkm-server' reinstall_start reinstall_end
    reinstall_start:
    ExecWait '$INSTDIR\resources\reinstall-kkm-server.bat'
    reinstall_end:
    Exec '$INSTDIR\Касса Winstrike.exe'
  ${endIf}
!macroend

!macro customUnInit
  SetSilent normal
  ${ifNot} ${isUpdated}
    ; Uninstall KKMServer if needed
    IfFileExists 'C:\Program Files (x86)\kkm-server' uninstall_start uninstall_end
    uninstall_start:
    ExecWait '$INSTDIR\resources\uninstall-kkm-server.bat'
    uninstall_end:
  ${endIf}
!macroend
