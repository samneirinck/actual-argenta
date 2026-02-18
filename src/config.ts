import { parseArgs } from "util";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { load, dump } from "js-yaml";
import { createRequire } from "module";
import Enquirer from "enquirer";

const require = createRequire(import.meta.url);
const keytar = require("keytar");

const Password = (Enquirer as any).Password;
const Input = (Enquirer as any).Input;

export interface Configuration {
  actualBudgetServerUrl: string;
  actualBudgetPassword: string;
  actualBudgetSyncId?: string;
}

const KEYTAR_SERVICE = "actual-argenta";
const KEYTAR_ACCOUNT = "actual-password";

export interface ConfigYaml {
  actual: {
    serverUrl: string;
    syncId?: string;
  };
}

async function promptForPassword(serverUrl: string): Promise<string> {
  const prompt = new Password({
    name: "password",
    message: `Enter password for ${serverUrl}:`,
  });
  try {
    const password = await prompt.run();
    if (!password) {
      throw new Error("Password cannot be empty");
    }
    return password;
  } catch (error) {
    throw new Error("Password input cancelled");
  }
}

export async function getActualPassword(serverUrl: string): Promise<string> {
  let actualPassword = await keytar.getPassword(KEYTAR_SERVICE, KEYTAR_ACCOUNT);

  if (actualPassword) {
    console.log("🔑 Using password from keychain");
  } else {
    actualPassword = await promptForPassword(serverUrl);
  }

  return actualPassword;
}

export async function savePasswordToKeychain(password: string): Promise<void> {
  await keytar.setPassword(KEYTAR_SERVICE, KEYTAR_ACCOUNT, password);
  console.log("✅ Password saved to keychain");
}

export async function clearPasswordFromKeychain(): Promise<void> {
  await keytar.deletePassword(KEYTAR_SERVICE, KEYTAR_ACCOUNT);
}

async function runConfigWizard(): Promise<ConfigYaml> {
  console.log("\n🔧 Configuration Wizard\n");
  console.log("Let's set up your Actual Budget configuration.\n");

  const serverUrlPrompt = new Input({
    name: "serverUrl",
    message: "Enter your Actual Budget server URL:",
    initial: "https://",
    validate: (value: string) => {
      if (!value) return "Server URL is required";
      try {
        new URL(value);
        return true;
      } catch {
        return "Please enter a valid URL";
      }
    },
  });

  const serverUrl = await serverUrlPrompt.run();

  const config: ConfigYaml = {
    actual: {
      serverUrl,
    },
  };

  const yamlContent = dump(config);
  writeFileSync("config.yaml", yamlContent, "utf8");

  console.log("\n✅ Server URL saved to config.yaml\n");

  return config;
}

export async function addSyncIdToConfig(syncId: string): Promise<void> {
  const config = await getConfigYaml();
  config.actual.syncId = syncId;

  const yamlContent = dump(config);
  writeFileSync("config.yaml", yamlContent, "utf8");

  console.log("✅ Sync ID saved to config.yaml");
}

export async function getConfigYaml(): Promise<ConfigYaml> {
  if (!existsSync("config.yaml")) {
    return await runConfigWizard();
  } else {
    const configFile = readFileSync("config.yaml", "utf8");
    return load(configFile) as ConfigYaml;
  }
}

export async function getConfiguration(): Promise<Configuration> {
  const { values } = parseArgs({
    args: process.argv,
    options: {
      actualBudgetServerUrl: {
        type: "string",
      },
    },
    strict: true,
    allowPositionals: true,
  });

  const config = await getConfigYaml();

  const actualBudgetServerUrl =
    values.actualBudgetServerUrl ?? config.actual.serverUrl;

  const actualPassword = await getActualPassword(actualBudgetServerUrl);

  return {
    actualBudgetServerUrl,
    actualBudgetPassword: actualPassword,
    actualBudgetSyncId: config.actual.syncId,
  };
}

