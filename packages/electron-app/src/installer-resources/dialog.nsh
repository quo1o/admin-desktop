; =========================================================
; This file was generated by NSISDialogDesigner 1.4.4.0 and modified by Janealter
; http://coolsoft.altervista.org/nsisdialogdesigner
; =========================================================

!include nsDialogs.nsh

Page custom fnc_dialog_show

; handle variables
Var hCtl_dialog
Var hCtl_dialog_Font1
Var hCtl_dialog_Font2
Var hCtl_dialog_TerminalIPLabel
Var hCtl_dialog_TerminalIPTextBox
Var hCtl_dialog_TerminalIPTextBox_Text
Var hCtl_dialog_TerminalModelLabel
Var hCtl_dialog_TerminalModelDropList ; if renamed please check src/scripts/set-device-model.js
Var hCtl_dialog_TerminalModelDropList_Text
Var hCtl_dialog_AcquiringTypeLabel
Var hCtl_dialog_AcquiringTypeDropList
Var hCtl_dialog_AcquiringTypeDropList_Text
Var hCtl_dialog_TerminalIDLabel
Var hCtl_dialog_TerminalIDTextBox
Var hCtl_dialog_TerminalIDTextBox_Text
Var hCtl_dialog_OnlyForCassbyLabel
Var hCtl_dialog_PrinterIPLabel
Var hCtl_dialog_PrinterIPTextBox
Var hCtl_dialog_PrinterIPTextBox_Text
Var hCtl_dialog_PrinterModelLabel
Var hCtl_dialog_PrinterModelDropList ; if renamed please check src/scripts/set-device-model.js
Var hCtl_dialog_PrinterModelDropList_Text

; dialog create function
Function fnc_dialog_Create

  ; custom font definitions
  CreateFont $hCtl_dialog_Font1 "Microsoft Sans Serif" "9" "400"
  CreateFont $hCtl_dialog_Font2 "Microsoft Sans Serif" "7" "400"
  
  ; === dialog (type: Dialog) ===
  nsDialogs::Create 1018
  Pop $hCtl_dialog
  ${If} $hCtl_dialog == error
    Abort
  ${EndIf}

  ; === TerminalIPLabel (type: Label) ===
  ${NSD_CreateLabel} 8u 8u 83u 12u "IP-адрес терминала"
  Pop $hCtl_dialog_TerminalIPLabel
  SendMessage $hCtl_dialog_TerminalIPLabel ${WM_SETFONT} $hCtl_dialog_Font1 0

  ; === TerminalIPTextBox (type: Text) ===
  ${NSD_CreateText} 95u 8u 194u 12u ""
  Pop $hCtl_dialog_TerminalIPTextBox
  ${NSD_OnChange} $hCtl_dialog_TerminalIPTextBox fnc_onTerminalIPChange

  ; === TerminalModelLabel (type: Label) ===
  ${NSD_CreateLabel} 8u 24u 83u 13u "Модель терминала"
  Pop $hCtl_dialog_TerminalModelLabel
  SendMessage $hCtl_dialog_TerminalModelLabel ${WM_SETFONT} $hCtl_dialog_Font1 0

  ; === TerminalModelDropList (type: DropList) ===
  ${NSD_CreateDropList} 95u 24u 117u 13u ""
  Pop $hCtl_dialog_TerminalModelDropList
  ${NSD_OnChange} $hCtl_dialog_TerminalModelDropList fnc_onTerminalModelChange
  ; terminal-model-drop-list-items

  ; === AcquiringTypeLabel (type: Label) ===
  ${NSD_CreateLabel} 8u 41u 83u 13u "Тип эквайринга"
  Pop $hCtl_dialog_AcquiringTypeLabel
  SendMessage $hCtl_dialog_AcquiringTypeLabel ${WM_SETFONT} $hCtl_dialog_Font1 0
  
  ; === AcquiringTypeDropList (type: DropList) ===
  ${NSD_CreateDropList} 95u 41u 117u 13u ""
  Pop $hCtl_dialog_AcquiringTypeDropList
  ${NSD_OnChange} $hCtl_dialog_AcquiringTypeDropList fnc_onAcquiringTypeChange
  ${NSD_CB_AddString} $hCtl_dialog_AcquiringTypeDropList "Сбер"
  ${NSD_CB_AddString} $hCtl_dialog_AcquiringTypeDropList "Cassby"
  ${NSD_CB_SelectString} $hCtl_dialog_AcquiringTypeDropList "Сбер"
  StrCpy $hCtl_dialog_AcquiringTypeDropList_Text "sber"

  ; === TerminalIDLabel (type: Label) ===
  ${NSD_CreateLabel} 8u 57u 83u 12u "ID терминала"
  Pop $hCtl_dialog_TerminalIDLabel
  SendMessage $hCtl_dialog_TerminalIDLabel ${WM_SETFONT} $hCtl_dialog_Font1 0

  ; === TerminalIDTextBox (type: Text) ===
  ${NSD_CreateText} 95u 57u 38u 12u ""
  Pop $hCtl_dialog_TerminalIDTextBox
  ${NSD_OnChange} $hCtl_dialog_TerminalIDTextBox fnc_onTerminalIDChange

  ; === OnlyForCassbyLabel (type: Label) ===
  ${NSD_CreateLabel} 8u 70u 75u 9u "Только для Cassby"
  Pop $hCtl_dialog_OnlyForCassbyLabel
  SendMessage $hCtl_dialog_OnlyForCassbyLabel ${WM_SETFONT} $hCtl_dialog_Font2 0
  SetCtlColors $hCtl_dialog_OnlyForCassbyLabel 0xFF7F50 0xF0F0F0

  ; === PrinterIPLabel (type: Label) ===
  ${NSD_CreateLabel} 8u 96u 83u 12u "IP-адрес принтера"
  Pop $hCtl_dialog_PrinterIPLabel
  SendMessage $hCtl_dialog_PrinterIPLabel ${WM_SETFONT} $hCtl_dialog_Font1 0

  ; === PrinterIPTextBox (type: Text) ===
  ${NSD_CreateText} 95u 96u 194u 12u ""
  Pop $hCtl_dialog_PrinterIPTextBox
  ${NSD_OnChange} $hCtl_dialog_PrinterIPTextBox fnc_onPrinterIPChange

  ; === PrinterModelLabel (type: Label) ===
  ${NSD_CreateLabel} 8u 112u 83u 13u "Модель принтера"
  Pop $hCtl_dialog_PrinterModelLabel
  SendMessage $hCtl_dialog_PrinterModelLabel ${WM_SETFONT} $hCtl_dialog_Font1 0
  
  ; === PrinterModelDropList (type: DropList) ===
  ${NSD_CreateDropList} 95u 112u 117u 13u ""
  Pop $hCtl_dialog_PrinterModelDropList
  ${NSD_OnChange} $hCtl_dialog_PrinterModelDropList fnc_onPrinterModelChange
  ; printer-model-drop-list-items
  
FunctionEnd

; dialog show function
Function fnc_dialog_show
  ${if} $hCtl_dialog_mode_Mode == 'classic'
    Call fnc_dialog_Create
    nsDialogs::Show
  ${endIf}
FunctionEnd


Function fnc_onTerminalIPChange
  ${NSD_GetText} $hCtl_dialog_TerminalIPTextBox $hCtl_dialog_TerminalIPTextBox_Text
FunctionEnd

Function fnc_onTerminalModelChange
  ${NSD_GetText} $hCtl_dialog_TerminalModelDropList $hCtl_dialog_TerminalModelDropList_Text
FunctionEnd

Function fnc_onAcquiringTypeChange
  ${NSD_GetText} $hCtl_dialog_AcquiringTypeDropList $hCtl_dialog_AcquiringTypeDropList_Text
  ${If} $hCtl_dialog_AcquiringTypeDropList_Text == Cassby
    StrCpy $hCtl_dialog_AcquiringTypeDropList_Text "cassby"
  ${EndIf}
  ${If} $hCtl_dialog_AcquiringTypeDropList_Text == Сбер
    StrCpy $hCtl_dialog_AcquiringTypeDropList_Text "sber"
  ${EndIf}
FunctionEnd

Function fnc_onTerminalIDChange
  ${NSD_GetText} $hCtl_dialog_TerminalIDTextBox $hCtl_dialog_TerminalIDTextBox_Text
FunctionEnd

Function fnc_onPrinterIPChange
  ${NSD_GetText} $hCtl_dialog_PrinterIPTextBox $hCtl_dialog_PrinterIPTextBox_Text
FunctionEnd

Function fnc_onPrinterModelChange
  ${NSD_GetText} $hCtl_dialog_PrinterModelDropList $hCtl_dialog_PrinterModelDropList_Text
FunctionEnd
