import dotenv from 'dotenv';
import fs from 'fs';
import { promisify } from 'util';

async function writeConfigFile (path: string, config: { [key: string]: string }) {
  // Merge with existing values
  try {
    const existing = dotenv.parse(await promisify(fs.readFile)(path, 'utf-8'));
    config = Object.assign(existing, config);
  } catch (err) {
    if (err.code !== 'ENOENT') {
      throw err;
    }
  }

  const contents = Object.keys(config).map(key => format(key, config[key])).join('\n');
  await promisify(fs.writeFile)(path, contents);

  return config;
}

function format (key: string, value: string) {
  return `${key}=${escapeNewlines(value)}`;
}

// WTF?!
function escapeNewlines (str: string) {
  return str.replace(/\n/g, '\\n');
}

export default writeConfigFile;
