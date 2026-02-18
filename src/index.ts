import * as actual from "@actual-app/api";
import Enquirer from "enquirer";
import {
  getConfigYaml,
  getActualPassword,
  savePasswordToKeychain,
  clearPasswordFromKeychain,
  addSyncIdToConfig,
} from "./config.js";

const Select = (Enquirer as any).Select;

async function main() {
  const config = await getConfigYaml();
  const serverUrl = config.actual.serverUrl;

  let authenticated = false;

  while (!authenticated) {
    try {
      const password = await getActualPassword(serverUrl);

      await actual.init({
        serverURL: serverUrl,
        password: password,
      });

      console.log("✅ Initialized Actual Budget API");
      await savePasswordToKeychain(password);

      authenticated = true;
    } catch (error: any) {
      if (error?.message?.includes("Authentication failed")) {
        console.error(`❌ ${error.message}`);
        await clearPasswordFromKeychain();
        console.log("🔄 Please try again with the correct password.\n");
      } else {
        throw error;
      }
    }
  }

  let syncId: string = config.actual.syncId || "";

  if (!syncId) {
    console.log("\n📋 Now let's select your budget.\n");

    const budgets = await actual.getBudgets();

    if (budgets.length === 0) {
      console.error("❌ No budgets found on the server.");
      process.exit(1);
    }

    if (budgets.length === 1) {
      const budget = budgets[0];
      if (!budget) {
        console.error("❌ Error accessing budget data.");
        process.exit(1);
      }
      syncId = budget.groupId;
      console.log(`✅ Using budget: ${budget.name} (${syncId})`);
      await addSyncIdToConfig(syncId);
    } else {
      const budgetChoices = budgets.map((budget) => ({
        name: budget.groupId,
        message: `${budget.name} (${budget.groupId})`,
      }));

      const budgetPicker = new Select({
        name: "budget",
        message: "Select a budget:",
        choices: budgetChoices,
      });

      syncId = await budgetPicker.run();
      await addSyncIdToConfig(syncId);
    }
  }

  await actual.downloadBudget(syncId);

  console.log("\n🧪 Testing transaction import...\n");

  let accounts = await actual.getAccounts();
  console.log(`Found ${accounts.length} accounts:`);
  accounts.forEach((account) => {
    console.log(`  - ${account.name} (${account.id})`);
  });

  let testAccount;
  if (accounts.length === 0) {
    console.log("\n📝 No accounts found. Creating a test account...\n");
    const accountId = await actual.createAccount({
      name: "Argenta Test Account",
      offbudget: false,
    });
    console.log(`✅ Created account: Argenta Test Account (${accountId})\n`);

    accounts = await actual.getAccounts();
    testAccount = accounts.find((acc) => acc.id === accountId);
  } else {
    testAccount = accounts[0];
  }

  if (testAccount) {
    console.log(`📝 Importing test transaction to: ${testAccount.name}\n`);

    const result = await actual.importTransactions(testAccount.id, [
      {
        account: testAccount.id,
        date: "2026-02-10",
        amount: -2590,
        payee_name: "Test Argenta Import",
        notes: "This is a test transaction from Argenta import",
        cleared: true,
      },
      {
        account: testAccount.id,
        date: "2026-02-09",
        amount: -235009,
        imported_id: "111",
        payee_name: "Test Argenta Import 2",
        notes: "This is a test transaction from Argenta import",
        cleared: true,
      },
    ]);

    console.log("✅ Import result:", result);
    console.log(`   - Added: ${result.added.length} transaction(s)`);
    console.log(`   - Updated: ${result.updated.length} transaction(s)`);
    if (result.errors && result.errors.length > 0) {
      console.log(`   - Errors: ${result.errors.length}`);
      result.errors.forEach((error: any) => {
        console.log(`     • ${error.message}`);
      });
    }
  } else {
    console.log("❌ Could not create or access account");
  }

  await actual.shutdown();
}
main().catch((error) => {
  console.error("Error:", error.message);
  console.log(error);
  process.exit(1);
});
