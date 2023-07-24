/* eslint-disable no-console */
const net = require('net');

const port = 5000;
process.env.DEV_SERVER_URL = `http://localhost:${port}`;

const client = new net.Socket();

let isElectronStarted = false;

const tryConnection = () => {
  console.log('Try to connect');
  client.connect({ port }, () => {
    client.end();

    if (!isElectronStarted) {
      console.log('Starting electron');
      isElectronStarted = true;
      const exec = require('child_process').exec;
      const electronProcess = exec('npm run start-electron');
      electronProcess.stdout.pipe(process.stdout);
    }
  });
};

console.log(`Electron is waiting for dev server to start on ${process.env.DEV_SERVER_URL}`);
tryConnection();

client.on('error', () => {
  setTimeout(tryConnection, 1000);
});
