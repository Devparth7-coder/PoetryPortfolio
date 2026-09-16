import { test, expect } from "@playwright/test";
test("home → archive → poem reading page with theme & reading mode", async ({ page }) => {
  await page.goto("/"); await expect(page).toHaveTitle(/Dev Parth/);
  await page.goto("/poems"); const first = page.locator("main li.group a").first(); const title = (await first.locator("h3").textContent())!.trim(); await first.click();
  await expect(page.locator("h1")).toHaveText(title);
  await expect(page.locator("body")).toHaveAttribute("data-reading", "false"); await page.keyboard.press("r"); await expect(page.locator("body")).toHaveAttribute("data-reading", "true"); await page.keyboard.press("Escape"); await expect(page.locator("body")).toHaveAttribute("data-reading", "false");
  const html = page.locator("html"); await page.getByRole("button", { name: /^Theme:/ }).first().click(); await expect(html).toHaveAttribute("data-theme", /light|sepia|dark/);
});
test("search palette and API", async ({ page, request }) => {
  await page.goto("/poems"); await page.keyboard.press("Control+k"); await expect(page.getByRole("dialog")).toBeVisible();
  const r = await request.get("/api/v1/search?q=love"); expect(r.ok()).toBeTruthy(); const j = await r.json(); expect(Array.isArray(j.data.poems)).toBe(true);
});
test("admin is protected and login works", async ({ page }) => {
  await page.goto("/admin"); await expect(page).toHaveURL(/\/admin\/login/);
  await page.fill("input[name=email]", process.env.E2E_ADMIN_EMAIL ?? "admin@example.com"); await page.fill("input[name=password]", process.env.E2E_ADMIN_PASSWORD ?? "DevParth-Archive-2026!"); await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page).toHaveURL(/\/admin$/); await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});
