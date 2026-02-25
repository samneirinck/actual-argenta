import { chromium, Browser, BrowserContext, Page } from "playwright";
import { existsSync } from "fs";
import type {
  ArgentaAccount,
  ArgentaMovement,
  ArgentaMovementsResponse,
  ArgentaAccountsResponse,
} from "../types/argenta.js";

const ARGENTA_LOGIN_URL = "https://homebank.argenta.be/webapp/nl/aanmelden";
const ARGENTA_API_BASE = "https://homebank.argenta.be";
const BROWSER_STATE_PATH = "data/browser-state.json";

export interface LoginResult {
  success: boolean;
  accounts?: ArgentaAccount[];
  error?: string;
}

export interface FetchMovementsResult {
  success: boolean;
  movements?: ArgentaMovement[];
  totalRowCount?: number;
  needsReauth?: boolean;
  error?: string;
}

export interface SessionStatus {
  hasSession: boolean;
  isValid: boolean;
}

export class ArgentaClient {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;

  isAuthenticated(): boolean {
    return existsSync(BROWSER_STATE_PATH);
  }

  async validateSession(): Promise<SessionStatus> {
    if (!existsSync(BROWSER_STATE_PATH)) {
      return { hasSession: false, isValid: false };
    }

    const browser = await chromium.launch({ headless: true });

    try {
      const context = await browser.newContext({
        storageState: BROWSER_STATE_PATH,
      });

      const response = await context.request.get(`${ARGENTA_API_BASE}/accounts`);
      await context.close();

      return {
        hasSession: true,
        isValid: response.ok(),
      };
    } catch {
      return { hasSession: true, isValid: false };
    } finally {
      await browser.close();
    }
  }

  async startLoginSession(): Promise<{
    browser: Browser;
    context: BrowserContext;
    page: Page;
  }> {
    this.browser = await chromium.launch({
      headless: false,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const contextOptions: any = { viewport: { width: 1280, height: 720 } };
    if (existsSync(BROWSER_STATE_PATH)) {
      contextOptions.storageState = BROWSER_STATE_PATH;
    }

    this.context = await this.browser.newContext(contextOptions);
    this.page = await this.context.newPage();

    this.page.on("framenavigated", (frame) => {
      if (frame === this.page?.mainFrame()) {
        console.log(`[NAV] ${frame.url()}`);
      }
    });

    await this.page.goto(ARGENTA_LOGIN_URL);
    return { browser: this.browser, context: this.context, page: this.page };
  }

  async waitForValidSession(timeoutMs: number = 300000): Promise<LoginResult> {
    if (!this.context) {
      return { success: false, error: "No browser context" };
    }

    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      const cookies = await this.context.cookies();
      const sessionCookie = cookies.find((c) => c.name === "SESSION");

      if (sessionCookie) {
        const response = await this.context.request.get(
          `${ARGENTA_API_BASE}/accounts`,
        );

        if (response.ok()) {
          const data: ArgentaAccountsResponse = await response.json();
          const accounts = (data.accounts || []).map((a) => ({
            id: a.id || "",
            iban: a.iban || "",
            alias: a.alias || "Unknown",
          }));

          await this.context.storageState({ path: BROWSER_STATE_PATH });

          return { success: true, accounts };
        }
      }

      await new Promise((resolve) => setTimeout(resolve, 5000));
    }

    return {
      success: false,
      error: "Timeout waiting for valid SESSION cookie",
    };
  }

  async closeLoginSession(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.context = null;
      this.page = null;
    }
  }

  async fetchMovements(
    iban: string,
    start: number = 0,
    maxResults: number = 200,
  ): Promise<FetchMovementsResult> {
    if (!existsSync(BROWSER_STATE_PATH)) {
      return { success: false, error: "Not authenticated" };
    }

    const browser = await chromium.launch({ headless: true });

    try {
      const context = await browser.newContext({
        storageState: BROWSER_STATE_PATH,
      });
      const url = `${ARGENTA_API_BASE}/accounts/accountingmovements?accountNumber=${iban}&start=${start}&maxResults=${maxResults}`;

      const response = await context.request.get(url);

      if (!response.ok()) {
        if (response.status() === 401) {
          return {
            success: false,
            needsReauth: true,
            error: "Session expired",
          };
        }
        return { success: false, error: `API error: ${response.status()}` };
      }

      const data: ArgentaMovementsResponse = await response.json();

      await context.close();

      return {
        success: true,
        movements: data.result || [],
        totalRowCount: data.rowCount,
      };
    } finally {
      await browser.close();
    }
  }

  async getMovementCount(iban: string): Promise<number | null> {
    if (!existsSync(BROWSER_STATE_PATH)) {
      return null;
    }

    const browser = await chromium.launch({ headless: true });

    try {
      const context = await browser.newContext({
        storageState: BROWSER_STATE_PATH,
      });
      const url = `${ARGENTA_API_BASE}/accounts/accountingmovements?accountNumber=${iban}&start=0&maxResults=1`;

      const response = await context.request.get(url);

      if (!response.ok()) {
        return null;
      }

      const data: ArgentaMovementsResponse = await response.json();
      await context.close();

      return data.rowCount ?? null;
    } catch {
      return null;
    } finally {
      await browser.close();
    }
  }
}
