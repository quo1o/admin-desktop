const path = require('path');
const { readFileSync, writeFileSync } = require('fs');

const args = require('args');

const packageJsonPath = path.join(__dirname, '../../package.json');
const bucketPostfixError = new Error('Bucket postfix flag must be defined and string');
const buildNumberError = new Error('Build number flag must be defined and integer');

args
  .option('bucket-postfix', 'Bucket postfix to set', undefined, (value) => {
    if (!value || typeof value !== 'string') throw bucketPostfixError;
    return value;
  })
  .option('number', 'Build number to set', undefined, (value) => {
    if (!value || isNaN(parseInt(value, 10))) throw buildNumberError;
    return value;
  });

const flags = args.parse(process.argv);

if (!flags.bucketPostfix) throw bucketPostfixError;
if (!flags.number) throw buildNumberError;

const packageJson = JSON.parse(readFileSync(packageJsonPath, 'UTF-8'));

if (!packageJson.version.includes('beta')) packageJson.version += `-beta.${flags.number}`;
if (!packageJson.build.publish.bucket.includes('test')) packageJson.build.publish.bucket += `-${flags.bucketPostfix}`;

writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
