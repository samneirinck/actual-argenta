import express from "express";
import { createProxyMiddleware } from "http-proxy-middleware";
import { configRepository, accountRepository } from "./database.js";
import { ArgentaClient } from "./clients/ArgentaClient.js";
import { ActualBudgetClient } from "./clients/ActualBudgetClient.js";
import { SyncService } from "./services/SyncService.js";

const app = express();
const PORT = process.env["PORT"] || 3000;
const WEBSOCKIFY_PORT = 6080;
const NOVNC_PATH = process.env["NOVNC_PATH"] || "/usr/share/novnc";

const argentaClient = new ArgentaClient();
const actualBudgetClient = new ActualBudgetClient();
const syncService = new SyncService(
  argentaClient,
  actualBudgetClient,
  configRepository,
  accountRepository,
);

app.use(express.json());

app.use(
  "/websockify",
  createProxyMiddleware({
    target: `http://localhost:${WEBSOCKIFY_PORT}`,
    ws: true,
    changeOrigin: true,
  }),
);

app.use("/vnc", express.static(NOVNC_PATH));
app.use(express.static("public"));

app.get("/api/status", async (_req, res) => {
  const state = syncService.getSyncState();
  const sessionStatus = await argentaClient.validateSession();
  const accounts = accountRepository.findAll();

  const accountsWithStats = await Promise.all(
    accounts.map(async (acc) => {
      const argentaCount = sessionStatus.isValid
        ? await argentaClient.getMovementCount(acc.iban)
        : null;
      const pendingFromArgenta =
        argentaCount !== null && acc.lastSyncedRowCount
          ? Math.max(0, argentaCount - acc.lastSyncedRowCount)
          : null;

      return {
        ...acc,
        argentaMovementCount: argentaCount,
        pendingFromArgenta,
      };
    })
  );

  const status = {
    lastLoginTime: configRepository.getLastLoginTime(),
    lastLoginSuccess: sessionStatus.isValid,
    lastError: sessionStatus.hasSession && !sessionStatus.isValid ? "Session expired" : configRepository.getLastError(),
    accounts: accountsWithStats,
    sessionValid: sessionStatus.isValid,
    syncInProgress: state.inProgress,
  };
  res.json(status);
});

app.post("/api/sync", async (_req, res) => {
  const state = syncService.getSyncState();
  if (state.inProgress) {
    res.status(409).json({ error: "Sync already in progress" });
    return;
  }

  syncService.startLogin();
  res.json({ message: "Sync started", vncUrl: "/vnc.html" });
});

app.post("/api/sync/:accountId", async (req, res) => {
  const { accountId } = req.params;
  const fullSync = req.query["full"] === "true";
  const result = await syncService.syncAccount(accountId, fullSync);

  if (result.success) {
    res.json(result);
  } else {
    res.status(400).json(result);
  }
});

app.get("/api/actual/status", async (_req, res) => {
  const config = configRepository.getActualBudgetConfig();
  const status = await actualBudgetClient.getConnectionStatus(config);
  res.json(status);
});

app.post("/api/actual/test", async (req, res) => {
  const { serverUrl, password } = req.body;

  if (!serverUrl || !password) {
    res
      .status(400)
      .json({ success: false, message: "serverUrl and password are required" });
    return;
  }

  const result = await actualBudgetClient.testConnection(serverUrl, password);
  res.json(result);
});

app.post("/api/actual/config", async (req, res) => {
  const { serverUrl, password, syncId } = req.body;

  if (!serverUrl || !password || !syncId) {
    res
      .status(400)
      .json({
        success: false,
        message: "serverUrl, password, and syncId are required",
      });
    return;
  }

  configRepository.setActualBudgetConfig({ serverUrl, password, syncId });
  res.json({ success: true, message: "Configuration saved" });
});

app.get("/api/actual/accounts", async (_req, res) => {
  const config = configRepository.getActualBudgetConfig();
  if (!config) {
    res.json([]);
    return;
  }

  const connected = await actualBudgetClient.ensureConnected(config);
  if (!connected) {
    res.json([]);
    return;
  }

  const accounts = await actualBudgetClient.getAccounts();
  res.json(accounts);
});

app.post("/api/actual/accounts", async (req, res) => {
  const { name } = req.body;
  if (!name) {
    res.status(400).json({ success: false, message: "name is required" });
    return;
  }

  const config = configRepository.getActualBudgetConfig();
  if (!config) {
    res
      .status(400)
      .json({ success: false, message: "Actual Budget not configured" });
    return;
  }

  const connected = await actualBudgetClient.ensureConnected(config);
  if (!connected) {
    res
      .status(500)
      .json({ success: false, message: "Failed to connect to Actual Budget" });
    return;
  }

  const accountId = await actualBudgetClient.createAccount(name);
  if (accountId) {
    res.json({ success: true, accountId });
  } else {
    res
      .status(500)
      .json({ success: false, message: "Failed to create account" });
  }
});

app.post("/api/link-account", async (req, res) => {
  const { argentaAccountId, actualAccountId } = req.body;
  if (!argentaAccountId || !actualAccountId) {
    res
      .status(400)
      .json({
        success: false,
        message: "argentaAccountId and actualAccountId are required",
      });
    return;
  }

  accountRepository.linkActualAccount(argentaAccountId, actualAccountId);
  res.json({ success: true, message: "Account linked" });
});

app.post("/api/unlink-account", async (req, res) => {
  const { argentaAccountId } = req.body;
  if (!argentaAccountId) {
    res
      .status(400)
      .json({ success: false, message: "argentaAccountId is required" });
    return;
  }

  accountRepository.unlinkActualAccount(argentaAccountId);
  res.json({ success: true, message: "Account unlinked" });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
