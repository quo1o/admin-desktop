/* eslint-disable no-console */

const { execSync } = require('child_process');

require('colors');
const args = require('args');

const { publish } = readFlags();
const commands = getCommands(publish);
execCommands(commands);

function readFlags () {
  args
  .option('publish', 'Publish or not', 'no', (value) => {
    if (!['yes', 'no'].includes(value)) {
      console.error('Publish flag must be \'yes\' or \'no\''.red);
      process.exit(1);
    }
    return value === 'yes';
  });

  return args.parse(process.argv);
}

function getCommands (shouldPublish) {
  return [
    'copyfiles -f src/installer-resources/* build',
    'copyfiles sb-pilot/**/* build',
    'copyfiles pos-proxy/**/* build',
    'copyfiles java-installer/**/* build',
    'copyfiles kkm-server/**/* build',
    'copyfiles release-notes.yml build',
    'node src/scripts/generate-registry-nsh',
    'node src/scripts/set-device-models',
    'symlink-dir ../../node_modules build/node_modules',
    'copyfiles package.json build',
    `electron-builder --project build --win --x64 --publish ${shouldPublish ? 'always' : 'never'}`,
  ];
}

function execCommands (commands) {
  for (const command of commands) {
    try {
      console.info(`${'Executing command'.bold.cyan} ${command.blue} ...`);
      execSync(command, { stdio: [null, process.stdout, process.stderr] });
    } catch (e) {
      console.error('Failed'.bold.red);
      console.error(e);
      break;
    }
    console.info('Successful'.bold.green);
  }
}
