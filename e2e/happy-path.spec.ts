import { expect, test } from "@playwright/test";

test("happy path navigation", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /StudyBuddy AI/i })).toBeVisible();
  await page.getByRole("link", { name: /Start with an upload/i }).click();
  await expect(page.getByRole("heading", { name: /Upload a PDF/i })).toBeVisible();
  await page.getByRole("link", { name: /Course/i }).click();
  await expect(page.getByText(/Auto-generated outline/i)).toBeVisible();
  await page.getByRole("link", { name: /Daily/i }).click();
  await expect(page.getByText(/Daily session/i)).toBeVisible();
});
