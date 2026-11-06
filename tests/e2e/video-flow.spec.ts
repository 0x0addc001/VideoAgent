import { expect, test } from "@playwright/test";
import { resolve } from "node:path";

test("serves the localized Chinese product experience", async ({ page }) => {
  await page.goto("/en");
  await page.getByRole("button", { name: "Account" }).click();
  await page.locator(".profile-language-row").click();
  await page
    .locator(".profile-language-options button")
    .filter({ hasText: "中文" })
    .click();

  await expect(page).toHaveURL(/\/zh-CN$/);
  await expect(
    page.getByRole("heading", { name: "视频小秘 把想象拍成片" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "小秘", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Agents", exact: true })).toHaveCount(0);
});

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
  await expect(page).toHaveURL(/\/en#conversation\/[^/?]+/);

  await expect(page.getByTestId("agent-activity")).toContainText(
    "Load project context",
  );
  await expect(page.getByTestId("agent-activity")).toContainText(
    "Read project memory",
  );
  await expect(
    page.getByRole("progressbar", { name: "Progress" }),
  ).toHaveCount(0);
  await expect(page.getByTestId("workspace-header-canvas")).toContainText(
    "Storyboard",
  );
  await page.setViewportSize({ width: 2560, height: 1440 });
  const workspaceWidths = await Promise.all([
    page.locator(".site-header").boundingBox(),
    page.locator(".workspace-grid > div").first().boundingBox(),
    page.locator(".workspace-grid > section").boundingBox(),
    page.locator(".workspace-grid > aside").boundingBox(),
  ]);
  const resolvedWidths = workspaceWidths.map((box) => {
    expect(box).not.toBeNull();
    return box!.width;
  });
  expect(
    Math.max(...resolvedWidths) - Math.min(...resolvedWidths),
  ).toBeLessThanOrEqual(1);
  await page.setViewportSize({ width: 1280, height: 720 });
  const profileTrigger = page.getByRole("button", { name: "Account" });
  await profileTrigger.click();
  const profileMenu = page.locator(".profile-menu");
  await expect(profileMenu).toContainText("Languages");
  await expect(profileMenu).toContainText("English");
  await expect(profileMenu).toContainText("Notifications");
  await expect(profileMenu).toContainText("Credits");
  await expect(profileMenu).not.toContainText("Settings");
  await expect(profileMenu).not.toContainText("No notifications");
  await expect(profileTrigger).toContainText(email);
  await expect(profileMenu).not.toContainText(email);
  const profileNavBox = await page.locator(".site-header").boundingBox();
  const profileMenuBox = await profileMenu.boundingBox();
  expect(profileNavBox).not.toBeNull();
  expect(profileMenuBox).not.toBeNull();
  expect(profileMenuBox!.x - profileNavBox!.x).toBeCloseTo(13, 0);
  expect(
    profileNavBox!.x +
      profileNavBox!.width -
      (profileMenuBox!.x + profileMenuBox!.width),
  ).toBeCloseTo(13, 0);
  await expect(page.locator(".account-avatar")).not.toHaveClass(/has-updates/);
  await profileMenu.locator(".profile-language-row").click();
  const languageFlyout = page.locator(".profile-language-flyout");
  await expect(languageFlyout).toBeVisible();
  await expect(
    profileMenu.locator(".profile-language-options"),
  ).toHaveCount(0);
  const flyoutBox = await languageFlyout.boundingBox();
  expect(flyoutBox).not.toBeNull();
  expect(flyoutBox!.x).toBeGreaterThan(
    profileMenuBox!.x + profileMenuBox!.width,
  );
  const languageOptions = await languageFlyout
    .getByRole("menuitemradio")
    .evaluateAll((options) =>
      options.map((option) => option.getBoundingClientRect()),
    );
  expect(languageOptions).toHaveLength(2);
  expect(languageOptions[1]!.top).toBeGreaterThan(languageOptions[0]!.bottom);
  await expect(
    profileTrigger.locator(".profile-settings-indicator"),
  ).toBeVisible();
  await expect(
    profileMenu.locator(".profile-notification-chevron"),
  ).toBeVisible();
  await expect(
    profileMenu.locator(".account-action .lucide-log-out"),
  ).toBeVisible();
  const workspaceHeaderBottoms = await Promise.all(
    [
      "workspace-header-history",
      "workspace-header-assets",
      "workspace-header-canvas",
      "workspace-header-agents",
    ].map(async (testId) => {
      const box = await page.getByTestId(testId).boundingBox();
      expect(box).not.toBeNull();
      return box!.y + box!.height;
    }),
  );
  expect(
    Math.max(...workspaceHeaderBottoms) - Math.min(...workspaceHeaderBottoms),
  ).toBeLessThanOrEqual(1);
  await expect(page.getByRole("button", { name: "Review" })).toHaveCount(0);
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
  await expect(page.getByRole("button", { name: "Scenes" })).toBeVisible();
  await expect(
    page.getByText("Cinematic establishing shot").first(),
  ).toBeVisible();

  await page.getByRole("button", { name: "Lead", exact: true }).click();
  await expect(page.getByLabel("Image model")).toHaveValue("kling-image-v3_0");
  const characterGeneration = page.waitForResponse(
    (response) =>
      response.request().method() === "POST" &&
      /\/api\/v1\/characters\/[^/]+\/generate$/.test(
        new URL(response.url()).pathname,
      ),
  );
  await page.getByRole("button", { name: "Generate", exact: true }).click();
  const characterResponse = await characterGeneration;
  expect(characterResponse.status()).toBe(201);
  const characterAsset = (await characterResponse.json()) as { id: string };
  await expect(
    page.getByText(`@${characterAsset.id.slice(0, 8)}`).first(),
  ).toBeVisible();

  await page.getByRole("button", { name: "Shot 1" }).click();
  await page.getByLabel("Video model").selectOption("kling-video-v4_0");
  await expect(page.getByTestId("workspace-header-canvas")).toContainText(
    "Storyboard",
  );
  const uploadResponsePromise = page.waitForResponse(
    (response) =>
      response.request().method() === "POST" &&
      /\/api\/v1\/projects\/[^/]+\/assets$/.test(
        new URL(response.url()).pathname,
      ),
  );
  await page
    .getByLabel("Upload shot reference")
    .setInputFiles(resolve("apps/web/public/media/vlog-hero-poster.jpg"));
  const uploadedAsset = (await (await uploadResponsePromise).json()) as {
    id: string;
  };
  await expect(page.getByLabel("Shot prompt")).toHaveValue(
    new RegExp(`@${uploadedAsset.id}`),
  );

  const pollResponsePromise = page.waitForResponse(
    (response) =>
      response.request().method() === "GET" &&
      /\/api\/v1\/jobs\/[^/]+$/.test(new URL(response.url()).pathname),
  );
  await page.getByRole("button", { name: "Generate", exact: true }).click();
  const pollResponse = await pollResponsePromise;
  expect((await pollResponse.json()) as { status: string }).toMatchObject({
    status: "succeeded",
  });

  for (const shotName of ["Shot 2", "Shot 3"]) {
    await page.getByRole("button", { name: shotName }).click();
    const generationResponsePromise = page.waitForResponse(
      (response) =>
        response.request().method() === "POST" &&
        /\/api\/v1\/shots\/[^/]+\/generate$/.test(
          new URL(response.url()).pathname,
        ),
    );
    await page.getByRole("button", { name: "Generate", exact: true }).click();
    const generationResponse = await generationResponsePromise;
    expect([200, 201, 202]).toContain(generationResponse.status());
    const generation = (await generationResponse.json()) as {
      id: string;
      status: string;
    };
    if (generation.status !== "succeeded") {
      const nextPoll = await page.waitForResponse(
        (response) =>
          response.request().method() === "GET" &&
          response.url().endsWith(`/api/v1/jobs/${generation.id}`),
      );
      expect((await nextPoll.json()) as { status: string }).toMatchObject({
        status: "succeeded",
      });
    }
  }

  const shareAction = page.getByRole("button", { name: "Share", exact: true });
  await expect(shareAction).toBeEnabled();
  await shareAction.click();
  const collaborationDialog = page.getByRole("dialog", {
    name: "Share and collaborate",
  });
  await expect(collaborationDialog).toBeVisible();
  await expect(
    collaborationDialog.getByRole("button", { name: "Collaboration access" }),
  ).toContainText("Can view");
  await expect(collaborationDialog).not.toContainText("VideoAgent");
  const collaborationResponsePromise = page.waitForResponse(
    (response) =>
      response.request().method() === "POST" &&
      /\/api\/v1\/projects\/[^/]+\/collaborations$/.test(
        new URL(response.url()).pathname,
      ),
  );
  await collaborationDialog
    .getByRole("button", { name: "Create link" })
    .click();
  expect((await collaborationResponsePromise).status()).toBe(200);
  await expect(
    collaborationDialog.getByLabel("Collaboration link"),
  ).toHaveValue(/\/en\/collaboration\//);
  await collaborationDialog.getByRole("button", { name: "Cancel" }).click();

  const renderResponsePromise = page.waitForResponse(
    (response) =>
      response.request().method() === "POST" &&
      /\/api\/v1\/projects\/[^/]+\/messages$/.test(
        new URL(response.url()).pathname,
      ),
  );
  await page
    .getByPlaceholder("Describe the next move or ask VideoAgent…")
    .fill("Render the final cut");
  await page.getByRole("button", { name: "Send" }).click();
  expect((await renderResponsePromise).status()).toBe(200);
  await expect(page.getByRole("heading", { name: "Export ready" })).toBeVisible();
  await page.getByRole("button", { name: /^Share .+\.mp4$/ }).first().click();
  await expect(page.getByLabel(/Share link, valid for 24 hours/)).toHaveValue(
    /\/api\/v1\/shares\//,
  );

  const publishResponsePromise = page.waitForResponse(
    (response) =>
      response.request().method() === "POST" &&
      /\/api\/v1\/hots\/from-asset\/[^/]+$/.test(
        new URL(response.url()).pathname,
      ),
  );
  await page.getByRole("button", { name: /^Publish .+\.mp4$/ }).first().click();
  const publishDialog = page.getByRole("dialog", { name: "Publish final cut" });
  await expect(publishDialog).toBeVisible();
  await publishDialog.getByLabel("Title").fill("Rain study");
  await publishDialog.getByRole("button", { name: "Publish", exact: true }).click();
  expect((await publishResponsePromise).status()).toBe(201);
  await expect(publishDialog).toContainText("Published to Videos");
  await publishDialog.getByRole("button", { name: "Cancel" }).click();

  const downloadLink = page.locator('a[download]').first();
  await expect(downloadLink).toBeVisible();
  const downloadPromise = page.waitForEvent("download");
  await downloadLink.click();
  const download = await downloadPromise;
  const downloadedPath = testInfo.outputPath("delivered-video.mp4");
  await download.saveAs(downloadedPath);

});

test("does not expose the obsolete projects index", async ({ page }) => {
  const response = await page.goto("/en/projects");

  expect(response?.status()).toBe(404);
  await expect(page.getByText("VideoAgent Studio")).toHaveCount(0);

  const detailResponse = await page.goto(
    "/en/projects/41432c53-ad62-4e42-8073-1dac36e2f9de?start=1",
  );
  expect(detailResponse?.status()).toBe(404);
});

test("keeps navigation responsive when the account API is unavailable", async ({
  page,
}) => {
  await page.route("**/api/account/**", (route) => route.abort());
  await page.goto("/en");

  for (const label of ["Skills", "Videos", "Assets", "Docs", "Agents"]) {
    await page.getByRole("button", { name: label, exact: true }).click();
    await expect(
      page.getByRole("button", { name: label, exact: true }),
    ).toHaveAttribute("aria-current", "page");
  }
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

test("publishes an uploaded video and opens it in Assets", async ({ page }) => {
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
  const recentProject = page
    .locator(".sidebar-recent-list .sidebar-thread")
    .filter({ hasText: "Sidebar project" });
  const projectFolder = page
    .locator(".sidebar-project-list details")
    .filter({ hasText: "Campaign work" });
  await recentProject.dragTo(projectFolder);
  await expect(projectFolder).toContainText("Sidebar project");
  await expect(recentProject).toHaveCount(0);
  await page.getByRole("button", { name: "Skills", exact: true }).click();
  await page.getByRole("button", { name: "New conversation" }).click();
  await expect(page.getByLabel("Start with an idea")).toBeVisible();
  await page.getByRole("button", { name: "Collapse navigation" }).click();
  await expect(page.locator(".va-landing")).toHaveClass(/nav-collapsed/);
  await page.getByRole("button", { name: "Expand navigation" }).click();

  await page.goto("/en");
  await page.getByRole("button", { name: "Videos", exact: true }).click();
  const hots = page.locator("#hots");
  await expect(hots.locator(".ranking-panel")).toContainText(
    "Creator leaderboard",
  );
  await hots.getByRole("tab", { name: "Product", exact: true }).click();
  const productLike = hots.getByRole("button", {
    name: "Like Product reveal",
  });
  await productLike.click();
  await expect(productLike).toHaveAttribute("aria-pressed", "true");
  await expect(
    hots
      .locator(".community-card")
      .filter({ hasText: "Product reveal" })
      .locator(".community-likes"),
  ).toHaveText("54");
  await hots.getByRole("tab", { name: "All", exact: true }).click();
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

  const navBox = await page.locator(".site-header").boundingBox();
  const docsBox = await page.locator(".docs-view").boundingBox();
  const directory = page.getByTestId("docs-directory");
  const directoryBox = await directory.boundingBox();
  const docsSearchBox = await page.locator(".docs-search-wrap").boundingBox();
  expect(navBox).not.toBeNull();
  expect(docsBox).not.toBeNull();
  expect(directoryBox).not.toBeNull();
  expect(docsSearchBox).not.toBeNull();
  expect(docsBox!.x).toBeGreaterThanOrEqual(navBox!.x + navBox!.width);
  expect(docsSearchBox!.y).toBeLessThan(directoryBox!.y);
  expect(
    Math.abs(directoryBox!.width - navBox!.width),
  ).toBeLessThanOrEqual(1);
  await expect(page.locator("iframe")).toHaveAttribute(
    "src",
    /\/docs\/product-requirements\.html/,
  );

  const resizeHandle = page.getByRole("button", {
    name: "Resize document directory",
  });
  await resizeHandle.focus();
  await resizeHandle.press("ArrowRight");
  await resizeHandle.press("ArrowRight");
  await resizeHandle.press("ArrowRight");
  await expect
    .poll(async () => (await directory.boundingBox())?.width ?? 0)
    .toBeGreaterThan(directoryBox!.width + 40);
  await page.getByRole("button", { name: "Collapse document list" }).click();
  await expect
    .poll(async () => (await directory.boundingBox())?.width ?? 0)
    .toBeLessThanOrEqual(60);
  await page.getByRole("button", { name: "Expand document list" }).click();

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
  await expect(page.frameLocator("iframe").locator("body")).toContainText(
    "VideoAgent",
  );

  await page.getByRole("button", { name: "Skills", exact: true }).click();
  await page.getByRole("button", { name: "Docs", exact: true }).click();
  await expect(page.locator("iframe")).toHaveAttribute(
    "src",
    /\/docs\/product-requirements\.html/,
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

