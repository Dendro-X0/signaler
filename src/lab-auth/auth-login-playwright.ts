import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { chromium } from "playwright";
import type { ApexAuthLoginConfig } from "../core/types.js";

export async function runAuthLoginPlaywright(params: {
  readonly baseUrl: string;
  readonly login: ApexAuthLoginConfig;
  readonly cookieOutPath: string;
}): Promise<void> {
  const login = params.login;
  const loginUrl = login.loginUrl
    ? new URL(login.loginUrl, params.baseUrl).toString()
    : new URL("/login", params.baseUrl).toString();

  const emailEnv = login.emailEnv ?? "SIGNALER_AUTH_EMAIL";
  const passwordEnv = login.passwordEnv ?? "SIGNALER_AUTH_PASSWORD";
  const email = login.email ?? process.env[emailEnv];
  const password = login.password ?? process.env[passwordEnv];
  if (!email || !password) {
    throw new Error(
      `Auth login requires email/password in config or env (${emailEnv}, ${passwordEnv})`,
    );
  }

  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(loginUrl, { waitUntil: "domcontentloaded" });

    const emailSelector = login.emailSelector ?? 'input[type="email"], input[name="email"]';
    const passwordSelector = login.passwordSelector ?? 'input[type="password"], input[name="password"]';
    const submitSelector = login.submitSelector ?? 'button[type="submit"]';

    await page.fill(emailSelector, email);
    await page.fill(passwordSelector, password);
    await page.click(submitSelector);

    const successPrefix = login.successPathPrefix ?? "/";
    await page.waitForURL(
      (url) => url.pathname.startsWith(successPrefix) || !url.pathname.toLowerCase().includes("login"),
      { timeout: 30_000 },
    );

    const cookies = await context.cookies();
    const lines = cookies.map((cookie) => `${cookie.name}=${cookie.value}`);
    await mkdir(dirname(params.cookieOutPath), { recursive: true });
    await writeFile(params.cookieOutPath, `${lines.join("\n")}\n`, "utf8");
  } finally {
    await browser.close();
  }
}
