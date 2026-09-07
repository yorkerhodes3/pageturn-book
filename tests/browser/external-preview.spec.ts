import { expect, test } from "@playwright/test";

const pagesBase = (process.env.PAGES_BASE_PATH ?? "").replace(/\/$/, "");
const route = (path: string) => `${pagesBase}${path}`;

async function openPreviewCard(
  page: import("@playwright/test").Page,
  scenario: string,
) {
  await page.goto(route(`/sdk/?source=${scenario}`));
  const root = page.locator("#page-turn-book");
  await expect(root.locator("[data-v3-reader]")).toHaveAttribute(
    "data-v3-ready",
    "true",
  );
  await expect(root).toHaveAttribute("data-sdk-source-ready", "true");
  await root.locator("[data-sdk-source-link]").click();
  const dialog = root.locator("[data-v3-source-dialog]");
  await expect(dialog).toBeVisible();
  return { root, dialog };
}

test("approved preview makes no provider request before activation and uses strict attributes", async ({
  page,
}) => {
  const providerRequests: string[] = [];
  page.on("request", (request) => {
    if (new URL(request.url()).pathname.endsWith("/external-preview/")) {
      providerRequests.push(request.url());
    }
  });
  const { dialog } = await openPreviewCard(page, "preview-message");
  expect(providerRequests).toEqual([]);
  await expect(dialog.locator("iframe")).toHaveCount(0);
  await expect(dialog).toContainText("controlled-local-preview");
  await expect(dialog).toContainText("localhost");
  const direct = dialog.getByRole("link", { name: /^Open source/ });
  await expect(direct).toBeVisible();

  await dialog
    .getByRole("button", { name: "Load external preview" })
    .evaluate((button) => {
      (button as HTMLButtonElement).click();
      (button as HTMLButtonElement).click();
    });
  const frame = dialog.locator("[data-v3-source-preview-frame]");
  await expect(frame).toHaveAttribute(
    "sandbox",
    "allow-scripts allow-same-origin",
  );
  await expect(frame).toHaveAttribute("allow", "");
  await expect(frame).toHaveAttribute("referrerpolicy", "no-referrer");
  await expect(frame).toHaveAttribute(
    "title",
    /External preview from controlled-local-preview/,
  );
  await expect(frame).toHaveAttribute("src", /\/external-preview\//);
  const src = new URL((await frame.getAttribute("src"))!);
  expect(src.searchParams.get("authored")).toBe("preserved");
  expect(src.searchParams.get("pageturn_parent_origin")).toBe(
    new URL(page.url()).origin,
  );
  expect(src.searchParams.get("pageturn_nonce")).toMatch(
    /^[A-Za-z0-9_-]{22}$/,
  );
  expect(src.hash).toBe("#controlled-fragment");
  await expect(dialog.locator("[data-v3-source-preview-status]")).toHaveText(
    "External preview ready.",
  );
  await expect(direct).toBeVisible();
  expect(providerRequests).toHaveLength(1);
});

test("rejects script-capable previews served from the reader origin", async ({
  page,
}) => {
  const providerRequests: string[] = [];
  page.on("request", (request) => {
    if (new URL(request.url()).pathname.endsWith("/external-preview/")) {
      providerRequests.push(request.url());
    }
  });
  const { dialog } = await openPreviewCard(page, "preview-same-origin");
  await dialog.getByRole("button", { name: "Load external preview" }).click();
  await expect(dialog.locator("[data-v3-source-preview-status]")).toContainText(
    "require a dedicated origin",
  );
  await expect(dialog.locator("iframe")).toHaveCount(0);
  await expect(dialog.getByRole("link", { name: /^Open source/ })).toBeVisible();
  expect(providerRequests).toEqual([]);
});

for (const mode of [
  "invalid-nonce",
  "invalid-schema",
  "invalid-source",
  "invalid-origin",
]) {
  test(`${mode} readiness is ignored and ends in an honest timeout`, async ({
    page,
  }) => {
    const { dialog } = await openPreviewCard(page, `preview-${mode}`);
    await dialog.getByRole("button", { name: "Load external preview" }).click();
    await expect(dialog.locator("[data-v3-source-preview-status]")).toHaveText(
      "Preview did not become ready. Readiness could not be confirmed.",
    );
    await expect(
      dialog.getByRole("button", { name: "Retry external preview" }),
    ).toBeVisible();
    await expect(dialog.getByRole("link", { name: /^Open source/ })).toBeVisible();
  });
}

test("timeout providers never claim positive readiness", async ({ page }) => {
  const { dialog } = await openPreviewCard(page, "preview-timeout");
  await dialog.getByRole("button", { name: "Load external preview" }).click();
  await expect(dialog.locator("[data-v3-source-preview-status]")).toHaveText(
    "Preview did not become ready. Readiness could not be confirmed.",
  );
  await expect(dialog.locator("[data-v3-source-preview-status]")).not.toContainText(
    /blocked|CSP|X-Frame-Options/i,
  );
  await expect(dialog.getByRole("link", { name: /^Open source/ })).toBeVisible();
});

test("unapproved paths and ambiguous providers expose no load action", async ({
  page,
}) => {
  for (const scenario of ["preview-unapproved", "preview-ambiguous"]) {
    const { dialog } = await openPreviewCard(page, scenario);
    await expect(
      dialog.getByRole("button", { name: /external preview/i }),
    ).toHaveCount(0);
    await expect(dialog.locator("iframe")).toHaveCount(0);
    await expect(dialog.getByRole("link", { name: /^Open source/ })).toBeVisible();
  }
});

test("retry replaces the iframe and generates a fresh nonce", async ({ page }) => {
  const { dialog } = await openPreviewCard(page, "preview-invalid-nonce");
  await dialog.getByRole("button", { name: "Load external preview" }).click();
  const frame = dialog.locator("[data-v3-source-preview-frame]");
  const first = new URL((await frame.getAttribute("src"))!).searchParams.get(
    "pageturn_nonce",
  );
  await expect(
    dialog.getByRole("button", { name: "Retry external preview" }),
  ).toBeVisible();
  await dialog.getByRole("button", { name: "Retry external preview" }).click();
  await expect(frame).toHaveCount(1);
  const second = new URL((await frame.getAttribute("src"))!).searchParams.get(
    "pageturn_nonce",
  );
  expect(first).toMatch(/^[A-Za-z0-9_-]{22}$/);
  expect(second).toMatch(/^[A-Za-z0-9_-]{22}$/);
  expect(second).not.toBe(first);
});

test("close, book navigation, and destroy remove previews and ignore late messages", async ({
  page,
}) => {
  let result = await openPreviewCard(page, "preview-late");
  await result.dialog
    .getByRole("button", { name: "Load external preview" })
    .click();
  await result.dialog
    .getByRole("button", { name: "Close external preview" })
    .click();
  await expect(result.dialog.locator("iframe")).toHaveCount(0);
  await expect(result.dialog.locator("[data-v3-source-preview-status]")).toHaveText(
    "External preview closed.",
  );
  await result.dialog
    .getByRole("button", { name: "Load external preview" })
    .click();
  await result.dialog
    .getByRole("button", { name: "Close source card" })
    .click();
  await page.waitForTimeout(800);
  await expect(result.dialog).not.toBeVisible();
  await expect(result.dialog.locator("iframe")).toHaveCount(0);

  result = await openPreviewCard(page, "preview-late");
  await result.dialog
    .getByRole("button", { name: "Load external preview" })
    .click();
  await result.root
    .locator("[data-v3-chapter-select]")
    .evaluate((select: HTMLSelectElement) => {
      select.value = "principles";
      select.dispatchEvent(new Event("change", { bubbles: true }));
    });
  await expect(result.dialog).not.toBeVisible();
  await expect(result.dialog.locator("iframe")).toHaveCount(0);
  await page.waitForTimeout(800);
  await expect(result.dialog).not.toBeVisible();

  result = await openPreviewCard(page, "preview-late");
  await result.dialog
    .getByRole("button", { name: "Load external preview" })
    .click();
  await page
    .getByRole("button", { name: "Destroy SDK reader" })
    .evaluate((button) => (button as HTMLButtonElement).click());
  await page.waitForTimeout(800);
  await expect(page.locator("[data-v3-source-dialog]")).toHaveCount(0);
  await expect(page.locator("[data-v3-source-preview-frame]")).toHaveCount(0);
});

test("multiple readers accept only their own iframe handshake and teardown independently", async ({
  page,
}) => {
  await page.goto(route("/sdk/?source=preview-message&instances=2"));
  const roots = page.locator("#page-turn-book, [data-sdk-additional-shell]");
  await expect(roots).toHaveCount(2);
  await expect(roots.nth(0)).toHaveAttribute("data-sdk-source-ready", "true");
  await expect(roots.nth(1)).toHaveAttribute("data-sdk-source-ready", "true");

  await roots.nth(0).locator("[data-sdk-source-link]").evaluate((link) => {
    (link as HTMLAnchorElement).click();
  });
  await roots.nth(1).locator("[data-sdk-source-link]").evaluate((link) => {
    (link as HTMLAnchorElement).click();
  });
  for (let index = 0; index < 2; index += 1) {
    await roots
      .nth(index)
      .getByRole("button", { name: "Load external preview" })
      .evaluate((button) => (button as HTMLButtonElement).click());
  }
  await expect(
    roots.nth(0).locator("[data-v3-source-preview-status]"),
  ).toHaveText("External preview ready.");
  await expect(
    roots.nth(1).locator("[data-v3-source-preview-status]"),
  ).toHaveText("External preview ready.");
  await roots
    .nth(1)
    .getByRole("button", { name: "Close external preview" })
    .evaluate((button) => (button as HTMLButtonElement).click());
  await expect(roots.nth(1).locator("[data-v3-source-preview-frame]")).toHaveCount(
    0,
  );
  await expect(roots.nth(0).locator("[data-v3-source-preview-frame]")).toHaveCount(
    1,
  );
});
