import { test, expect } from "@playwright/test";

test.describe("Dashboard UI", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("page loads with correct title", async ({ page }) => {
    await expect(page).toHaveTitle("Claude Code Manager");
  });

  test("header renders with app title", async ({ page }) => {
    const heading = page.locator("header h1");
    await expect(heading).toContainText("Claude Code Manager");
  });

  test("version badge renders from API", async ({ page }) => {
    // The version badge is populated via Alpine.js fetching /api/health
    const badge = page.locator(".version-badge");
    await expect(badge).toBeAttached();
    // Wait for Alpine.js to hydrate and fetch version
    await expect(badge).toHaveText(/v\d+\.\d+\.\d+/, { timeout: 5000 });
  });

  test("connection status shows Connected when WebSocket connects", async ({ page }) => {
    const status = page.locator(".status-bar .status-item .dot");
    // WebSocket should connect and show green dot
    await expect(status.first()).toHaveClass(/connected/, { timeout: 5000 });
  });

  test("running and pending counters render", async ({ page }) => {
    // These are Alpine.js reactive bindings
    const statusItems = page.locator(".status-bar .status-item");
    await expect(statusItems.nth(1)).toContainText("Running:");
    await expect(statusItems.nth(2)).toContainText("Pending:");
  });

  test("Projects section renders", async ({ page }) => {
    const projectsHeader = page.locator(".sidebar h2", { hasText: "Projects" });
    await expect(projectsHeader).toBeVisible();
  });

  test("Active Tasks section renders", async ({ page }) => {
    const tasksHeader = page.locator(".main-content h2", { hasText: "Active Tasks" });
    await expect(tasksHeader).toBeVisible();
  });

  test("Task History section renders", async ({ page }) => {
    const historyHeader = page.locator(".main-content h2", { hasText: "Task History" });
    await expect(historyHeader).toBeVisible();
  });

  test("empty state shows when no active tasks", async ({ page }) => {
    const emptyState = page.locator(".empty-state", { hasText: "No active tasks" });
    await expect(emptyState).toBeVisible({ timeout: 3000 });
  });

  test("navigation buttons render in header", async ({ page }) => {
    await expect(page.locator("button", { hasText: "Summary" })).toBeVisible();
    await expect(page.locator("header button", { hasText: "Configure" })).toBeVisible();
    await expect(page.locator("button", { hasText: "Stop Server" })).toBeVisible();
  });

  test("health API returns valid data", async ({ request }) => {
    const response = await request.get("/api/health");
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.status).toBe("ok");
    expect(data.version).toMatch(/\d+\.\d+\.\d+/);
    expect(data.timestamp).toBeDefined();
    expect(typeof data.uptime).toBe("number");
  });
});
