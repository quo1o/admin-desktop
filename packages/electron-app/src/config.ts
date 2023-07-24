import { promisify } from 'util';
import { platform } from 'os';
import path from 'path';
import Registry from 'winreg';
import electronIsDev from 'electron-is-dev';
import { writeConfigFile } from '@winstrike/admin-desktop-common-node';

const REGISTRY_ENV_KEY = '\\SOFTWARE\\admin_desktop\\Env';

async function readConfig () {
  let registryEnv: Partial<TGlobalConfig>;
  try {
    registryEnv = platform() === 'win32' && !electronIsDev ? await readRegistryEnv() : {};
  } catch (e) {
    console.error(e);
    throw new Error('Не удалось прочитать данные из реестра');
  }

  return {
    ...process.env,
    ...registryEnv,
  };
}

async function readRegistryEnv () {
  const registry = new Registry({
    hive: Registry.HKLM,
    key: REGISTRY_ENV_KEY,
  });

  const registryValues = promisify(registry.values.bind(registry));

  const registryItems = await registryValues();
  return registryItems.reduce<Partial<TGlobalConfig>>((acc, { name, value }) => ({ ...acc, [name]: value }), {});
}

type TEnv = { [key: string]: string | number };

async function writeConfig (env: TEnv) {
  if (electronIsDev) {
    const stringifiedEnvs = Object.entries(env)
      .reduce<{ [key: string]: string }>((acc, [key, value]) => ({ ...acc, [key]: value.toString() }), {});
    const filePath = path.join(__dirname, '../../../.env');

    await writeConfigFile(filePath, stringifiedEnvs);

    Object.assign(process.env, stringifiedEnvs);
  } else if (platform() === 'win32') {
    try {
      await writeRegistryEnv(env);
    } catch (e) {
      console.error(e);
      throw new Error(`Не удалось записать данные в реестр, проверьте наличие ключа ${REGISTRY_ENV_KEY}`);
    }
  }
}

function writeRegistryEnv (env: TEnv) {
  const registry = new Registry({
    hive: Registry.HKLM,
    key: REGISTRY_ENV_KEY,
  });

  const registrySet = promisify(registry.set.bind(registry));

  const promises: Promise<void>[] = [];
  Object.entries(env).forEach(([key, value]) => {
    promises.push(registrySet(key, Registry.REG_SZ, value.toString()));
  });

  return Promise.all(promises);
}

export { readConfig, writeConfig };
