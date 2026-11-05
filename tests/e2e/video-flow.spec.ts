import { expect, test } from "@playwright/test";
import { resolve } from "node:path";

test("runs a complete mock video workflow without paid generation", async ({
  page,
}, testInfo) => {
  const email = `playwright-${Date.now()}@example.com`;
  const password = "Correct-Horse-Battery9";

  await page.goto("/en/register");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/en#assets$/);

  await page.goto("/en");
  await page
    .getByLabel("Start with an idea")
    .fill("A quiet Copenhagen morning told in one shot");
  await page.getByRole("button", { name: "Action" }).click();
  await expect(page).toHaveURL(/\/en\?start=1#conversation\/[^/?]+/);

  await expect(page.getByText("Cinematic establishing shot").first()).toBeVisible();
  for (let stage = 0; stage < 3; stage += 1) {
    const decisionResponse = page.waitForResponse(
      (response) =>
        response.request().method() === "POST" &&
        response.url().endsWith("/workflow/decision"),
    );
    await page
      .getByRole("button", { name: "Continue with this direction" })
      .click();
    expect((await decisionResponse).status()).toBe(200);
  }
  await expect(
    page.getByRole("button", { name: "Continue with this direction" }),
  ).toHaveCount(0);

  await page.getByRole("button", { name: /Shot 01/ }).click();
  const reorderResponsePromise = page.waitForResponse(
    (response) =>
      response.request().method() === "PATCH" &&
      response.url().endsWith("/storyboard/order"),
  );
  await page.getByRole("button", { name: "Move shot later" }).click();
  expect((await reorderResponsePromise).status()).toBe(200);
  await page.getByLabel("Upload reference").setInputFiles({
    name: "reference.png",
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl2nGQAAAAASUVORK5CYII=",
      "base64",
    ),
  });
  await expect(page.getByText("1 uploaded references")).toBeVisible();

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

test("does not expose the obsolete projects index", async ({ page }) => {
  const response = await page.goto("/en/projects");

  expect(response?.status()).toBe(404);
  await expect(page.getByText("VideoAgent Studio")).toHaveCount(0);
});

test("optimizes and persists a published Skill", async ({ page }) => {
  const email = `skill-e2e-${Date.now()}@example.com`;
  await page.goto("/en/register");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("Correct-Horse-Battery9");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/en#assets$/);

  await page.goto("/en");
  await page.getByRole("button", { name: "Skills", exact: true }).click();
  await page.getByRole("button", { name: "Publish skill", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog
    .getByLabel("Your idea")
    .fill("Create a reusable lip sync workflow for character videos");
  await dialog.getByRole("button", { name: "AI optimize" }).click();
  await expect(dialog.getByPlaceholder("my_skill")).toHaveValue(
    "create_a_reusable_lip_sync_workflow_for_character_videos",
  );
  await dialog
    .getByRole("button", { name: "Publish skill", exact: true })
    .click();
  await expect(dialog).toBeHidden();

  await expect(page.locator("#skills")).toContainText(
    "Create A Reusable Lip Sync Workflow For Character Videos",
  );
  await page.reload();
  await page.getByRole("button", { name: "Skills", exact: true }).click();
  await expect(page.locator("#skills")).toContainText(
    "Create A Reusable Lip Sync Workflow For Character Videos",
  );
});

test("publishes an uploaded Hots video and opens it in Assets", async ({ page }) => {
  const email = `hots-e2e-${Date.now()}@example.com`;
  await page.goto("/en/register");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("Correct-Horse-Battery9");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/en#assets$/);

  const createdProject = await page.request.post("/api/account/projects", {
    data: { title: "Sidebar project", brief: "A conversation history check" },
  });
  expect(createdProject.status()).toBe(201);
  await page.goto("/en");
  await expect(page.locator(".sidebar-history")).toContainText("Sidebar project");
  await page.getByRole("button", { name: "Create project" }).click();
  const projectDialog = page.getByRole("dialog");
  await projectDialog.getByLabel("Project name").fill("Campaign work");
  await projectDialog
    .getByRole("button", { name: "Create project", exact: true })
    .click();
  await expect(projectDialog).toBeHidden();
  await expect(page.locator(".sidebar-history")).toContainText("Campaign work");
  await page.getByRole("button", { name: "Skills", exact: true }).click();
  await page.getByRole("button", { name: "New conversation" }).click();
  await expect(page.getByLabel("Start with an idea")).toBeVisible();
  await page.getByRole("button", { name: "Collapse navigation" }).click();
  await expect(page.locator(".va-landing")).toHaveClass(/nav-collapsed/);
  await page.getByRole("button", { name: "Expand navigation" }).click();

  await page.goto("/en");
  await page.getByRole("button", { name: "Hots", exact: true }).click();
  await page.getByRole("button", { name: "Publish video", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Post title").fill("Rain study");
  await dialog
    .getByLabel("Describe the video you want to share...")
    .fill("A quiet rain study with slow editorial movement");
  await dialog
    .getByLabel("Video file")
    .setInputFiles(resolve("apps/web/public/media/vlog-hero.mp4"));
  await dialog
    .getByRole("button", { name: "Publish video", exact: true })
    .click();
  await expect(dialog).toBeHidden();
  await expect(page.locator("#hots")).toContainText("Rain study");

  await page.getByRole("button", { name: "Assets", exact: true }).click();
  await page.getByRole("button", { name: "View Rain study" }).click();
  const detail = page.getByRole("dialog");
  await expect(detail.getByRole("heading", { name: "Rain study" })).toBeVisible();
  await expect(detail.locator("video")).toBeVisible();
  await expect(detail).toContainText(
    "A quiet rain study with slow editorial movement",
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

test("administrator can pause generation from the administration console", async ({ page }) => {
  await page.goto("/en/register");
  await page.getByLabel("Email").fill("admin-playwright@example.com");
  await page.getByLabel("Password").fill("Correct-Horse-Battery9");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/en#assets$/);

  await page.goto("/en/admin");
  await expect(
    page.getByRole("heading", { name: "VideoAgent Administration" }),
  ).toBeVisible();
  await expect(page.getByText("admin-playwright@example.com")).toBeVisible();

  await page.getByRole("button", { name: "Platform settings" }).click();
  await page.getByRole("button", { name: "Pause generation" }).click();
  await expect(page.getByRole("button", { name: "Enable generation" })).toBeVisible();
});

test("keeps composer dropdowns inside a short viewport", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 560 });
  await page.goto("/en");

  for (const label of ["Length", "Quality"]) {
    const trigger = page.getByRole("button", { name: label, exact: true });
    await trigger.click();
    const menu = page.getByRole("listbox");
    await expect(menu).toBeVisible();
    const box = await menu.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.y).toBeGreaterThanOrEqual(0);
    expect(box!.y + box!.height).toBeLessThanOrEqual(560);
    await trigger.click();
  }
});

