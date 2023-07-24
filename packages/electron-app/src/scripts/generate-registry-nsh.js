const { writeFileSync } = require('fs');
const path = require('path');

const config = {
  BOOKING_ADMIN_URL: process.env.BOOKING_ADMIN_URL,
  BOOKING_API_URL: process.env.BOOKING_API_URL,
  WINSTRIKE_ID_URL: process.env.WINSTRIKE_ID_URL,
  PS_WS_URL: process.env.PS_WS_URL,
  PS_HTTP_URL: process.env.PS_HTTP_URL,
  SENTRY_DSN: process.env.SENTRY_DSN,
  LOKI_URL: process.env.LOKI_URL,
  LOKI_LOGIN: process.env.LOKI_LOGIN,
  LOKI_PASSWORD: process.env.LOKI_PASSWORD,
};

function generateRegistryCommands () {
  const header = 'WriteRegStr HKEY_LOCAL_MACHINE "SOFTWARE\\admin_desktop" "" ""';
  const body = Object.entries(config).reduce((acc, [key, value]) => {
    if (!value) return acc;
    return `${acc}WriteRegStr HKEY_LOCAL_MACHINE "SOFTWARE\\admin_desktop\\Env" "${key}" "${value}"\n`;
  }, '');
  return `${header}\n${body}`;
}

const registryNsh = generateRegistryCommands();

const registryNshPath = path.join(__dirname, '../../build/registry.nsh');
writeFileSync(registryNshPath, registryNsh);
