import { expect, test } from "@playwright/test";

test("runs a complete mock video workflow without paid generation", async ({
  page,
}, testInfo) => {
  const email = `playwright-${Date.now()}@example.com`;
  const password = "Correct-Horse-Battery9";

  await page.goto("/en/register");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/en\/projects$/);

  await page.goto("/en");
  await page
    .getByLabel("Start with an idea")
    .fill("A quiet Copenhagen morning told in one shot");
  await page.getByRole("button", { name: "Action" }).click();
  await expect(page).toHaveURL(/\/en\/projects\/[^/?]+/);

  await expect(page.getByText("Cinematic establishing shot").first()).toBeVisible();
  const reorderResponsePromise = page.waitForResponse(
    (response) =>
      response.request().method() === "PATCH" &&
      response.url().endsWith("/storyboard/order"),
  );
  await page.getByRole("button", { name: "Move shot later" }).click();
  expect((await reorderResponsePromise).status()).toBe(200);
  await page.locator('input[type="file"]').setInputFiles({
    name: "reference.png",
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl2nGQAAAAASUVORK5CYII=",
      "base64",
    ),
  });
  await expect(page.getByText("1 uploaded references")).toBeVisible();

  await page.getByRole("button", { name: "Estimate cost" }).click();
  await expect(page.getByText("Estimated credits: 5")).toBeVisible();
  const pollResponsePromise = page.waitForResponse(
    (response) =>
      response.request().method() === "GET" &&
      /\/api\/v1\/jobs\/[^/]+$/.test(new URL(response.url()).pathname),
  );
  await page.getByRole("button", { name: "Generate shot" }).click();
  const pollResponse = await pollResponsePromise;
  expect((await pollResponse.json()) as { status: string }).toMatchObject({
    status: "succeeded",
  });

  const exportButton = page.getByRole("button", { name: "Export film" });
  await expect(exportButton).toBeEnabled();
  await exportButton.click();
  await expect(page.getByRole("heading", { name: "Export ready" })).toBeVisible();

  const downloadLink = page.locator('a[download]').first();
  await expect(downloadLink).toBeVisible();
  const downloadPromise = page.waitForEvent("download");
  await downloadLink.click();
  const download = await downloadPromise;
  const downloadedPath = testInfo.outputPath("delivered-video.mp4");
  await download.saveAs(downloadedPath);

  const shareButton = page.getByRole("button", { name: /^Share / }).first();
  await shareButton.click();
  await expect(page.getByLabel(/Share link, valid for 24 hours/)).toHaveValue(
    /\/api\/v1\/shares\//,
  );
});

test("switches the complete documentation set", async ({ page }) => {
  await page.goto("/en");
  await page.getByRole("button", { name: "Docs", exact: true }).click();

  await expect(page.getByRole("tab")).toHaveText([
    "PRD",
    "Playbook",
    "Arch",
    "API",
    "Dev",
    "Test",
    "Ops",
    "FAQ",
    "TODO",
  ]);

  await page.getByRole("tab", { name: "Playbook", exact: true }).click();
  await expect(page.locator("iframe")).toHaveAttribute(
    "src",
    /\/docs\/playbooks\.html/,
  );
});

