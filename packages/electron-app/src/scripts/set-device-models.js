const path = require('path');
const { readFileSync, writeFileSync } = require('fs');
const { terminalModels, printerModels } = require('@winstrike/proxy-payment-service');

const dialogNshPath = path.join(__dirname, '../../build/dialog.nsh');

const dialogNsh = readFileSync(dialogNshPath, { encoding: 'UTF-8' });

const terminalModelDropListItemsCode = generateDropListItemsCode('hCtl_dialog_TerminalModelDropList', terminalModels);
const printerModelDropListItemsCode = generateDropListItemsCode('hCtl_dialog_PrinterModelDropList', printerModels);

let newDialogNsh = '';

newDialogNsh = dialogNsh.replace('; terminal-model-drop-list-items', terminalModelDropListItemsCode);
newDialogNsh = newDialogNsh.replace('; printer-model-drop-list-items', printerModelDropListItemsCode);

writeFileSync(dialogNshPath, newDialogNsh);

function generateDropListItemsCode (dropListVar, itemNames) {
  const itemsCode = itemNames.reduce((acc, name) => `${acc}\${NSD_CB_AddString} $${dropListVar} "${name}"\n  `, '');
  const defaultItemCode = `\${NSD_CB_SelectString} $${dropListVar} "${itemNames[0]}"`;
  const setDefaultItemToVarCode = `StrCpy $${dropListVar}_Text "${itemNames[0]}"`;
  return `${itemsCode}${defaultItemCode}\n  ${setDefaultItemToVarCode}`;
}
