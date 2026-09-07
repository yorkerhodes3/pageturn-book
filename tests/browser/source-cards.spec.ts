import { expect, test } from "@playwright/test";

const pagesBase = (process.env.PAGES_BASE_PATH ?? "").replace(/\/$/, "");
const route = (path: string) => `${pagesBase}${path}`;

async function waitForReader(page: import("@playwright/test").Page) {
  await expect(page.locator("#page-turn-book [data-v3-reader]")).toHaveAttribute(
    "data-v3-ready",
    "true",
  );
}

test("hosted known source opens a no-fetch local-first card and exact edition", async ({
  page,
}) => {
  await page.goto(
    route(
      "/v3/?book=human-choice-source-guide&chapter=plurality-dot-net#plurality-dot-net",
    ),
  );
  await waitForReader(page);
  const thirdPartyRequests: string[] = [];
  const localOrigin = new URL(page.url()).origin;
  page.on("request", (request) => {
    if (new URL(request.url()).origin !== localOrigin) {
      thirdPartyRequests.push(request.url());
    }
  });

  const citation = page
    .locator('[data-v3-stationary] a[href="https://plurality.net/"]')
    .first();
  await expect(citation).toHaveAttribute("aria-haspopup", "dialog");
  await citation.click();
  const dialog = page.getByRole("dialog", { name: "Plurality" });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("Available in the PageTurn Library");
  await expect(dialog).toContainText("plurality.net");
  await expect(dialog).toContainText("Complete local edition");
  await expect(dialog).toContainText("2026-07");
  const read = dialog.getByRole("link", { name: "Read in PageTurn" });
  await expect(read).toBeFocused();
  await expect(read).toHaveAttribute(
    "href",
    /\/v3\/\?.*book=plurality.*edition=2026-07.*chapter=1#1$/,
  );
  await expect(
    dialog.getByRole("link", { name: /Open original source/ }),
  ).toHaveAttribute("rel", "noopener noreferrer");
  await expect(
    dialog.getByRole("link", { name: "View on shelf" }),
  ).toHaveAttribute("href", /\/shelf\/$/);
  expect(thirdPartyRequests).toEqual([]);

  await read.click();
  await expect(page).toHaveURL(/book=plurality/);
  await expect(page).toHaveURL(/edition=2026-07/);
  await expect(page).toHaveURL(/chapter=1#1$/);
});

test("unknown hosted citation opens external card without requests and restores focus", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async (value: string) => {
          document.documentElement.dataset.copiedSource = value;
        },
      },
    });
  });
  await page.goto(
    route(
      "/v3/?book=human-choice-source-guide&chapter=ai-2027#ai-2027",
    ),
  );
  await waitForReader(page);
  const requests: string[] = [];
  page.on("request", (request) => requests.push(request.url()));
  const link = page
    .locator('[data-v3-stationary] a[href="https://ai-2027.com/"]')
    .first();
  await link.focus();
  const before = requests.length;
  await link.press("Enter");
  const dialog = page.getByRole("dialog", { name: "External source" });
  await expect(dialog).toContainText("ai-2027.com");
  await expect(dialog).toContainText("website (unreviewed)");
  const open = dialog.getByRole("link", { name: /Open source/ });
  await expect(open).toHaveAttribute("target", "_blank");
  await expect(open).toHaveAttribute("referrerpolicy", "no-referrer");
  await dialog.getByRole("button", { name: "Copy link" }).click();
  await expect(page.locator("html")).toHaveAttribute(
    "data-copied-source",
    "https://ai-2027.com/",
  );
  await expect(dialog.locator("[data-v3-source-status]")).toHaveText(
    "Source link copied.",
  );
  expect(requests).toHaveLength(before);
  await dialog.getByRole("button", { name: "Close source card" }).click();
  await expect(link).toBeFocused();
});

test("ambiguous course mapping does not auto-navigate", async ({ page }) => {
  await page.goto(
    route(
      "/v3/?book=human-choice-source-guide&chapter=ai-2027&courseReading=human-choice-plurality#ai-2027",
    ),
  );
  await waitForReader(page);
  const link = page
    .locator('[data-v3-stationary] a[href="https://ai-2027.com/"]')
    .first();
  const originalUrl = page.url();
  await link.click();
  const dialog = page.getByRole("dialog", { name: "External source" });
  await expect(dialog).toContainText("Several reviewed sources match");
  await expect(dialog).toContainText("PageTurn will not choose one automatically");
  await expect(dialog.locator("[data-v3-source-candidate-list] li")).toHaveCount(2);
  expect(page.url()).toBe(originalUrl);
});

test("direct-external resolver result stays in a no-fetch card", async ({
  page,
}) => {
  await page.goto(route("/sdk/?source=direct-external"));
  await waitForReader(page);
  await expect(page.locator("#page-turn-book")).toHaveAttribute(
    "data-sdk-source-ready",
    "true",
  );
  const requests: string[] = [];
  page.on("request", (request) => requests.push(request.url()));
  const originalUrl = page.url();
  const before = requests.length;
  await page.locator("[data-sdk-source-link]").click();
  const dialog = page.getByRole("dialog", { name: "External source" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("link", { name: /^Open source/ })).toHaveAttribute(
    "href",
    /\/resolved-source$/,
  );
  await expect(
    dialog.getByRole("link", { name: /^Open authored source/ }),
  ).toHaveAttribute("href", /\/source-fixture$/);
  await expect(dialog.getByRole("button", { name: "Copy link" })).toHaveAttribute(
    "data-v3-source-copy",
    /\/source-fixture$/,
  );
  expect(page.url()).toBe(originalUrl);
  expect(requests).toHaveLength(before);
});

test("link-only alias match exposes canonical and authored source actions", async ({
  page,
}) => {
  await page.goto(route("/sdk/?source=canonical-alias"));
  await waitForReader(page);
  await expect(page.locator("#page-turn-book")).toHaveAttribute(
    "data-sdk-source-ready",
    "true",
  );
  await page.locator("[data-sdk-source-link]").click();
  const dialog = page.getByRole("dialog", { name: "SDK source fixture" });
  await expect(dialog.getByRole("link", { name: /^Open source/ })).toHaveAttribute(
    "href",
    /\/source-fixture-alias$/,
  );
  await expect(
    dialog.getByRole("link", { name: /^Open reviewed canonical source/ }),
  ).toHaveAttribute("href", /\/source-fixture$/);
  await expect(dialog.getByRole("button", { name: "Copy link" })).toHaveAttribute(
    "data-v3-source-copy",
    /\/source-fixture-alias$/,
  );
});

test("SDK default remains direct and direct-local is gated", async ({ page }) => {
  await page.goto(route("/sdk/?source=direct"));
  await waitForReader(page);
  await expect(page.locator("#page-turn-book")).toHaveAttribute(
    "data-sdk-source-ready",
    "true",
  );
  const direct = page.locator("[data-sdk-source-link]");
  await expect(direct).toHaveAttribute("href", /source-fixture-unknown/);
  await expect(page.locator("[data-v3-source-dialog]")).not.toBeVisible();
  await direct.click();
  await expect(page).toHaveURL(/source-fixture-unknown\/$/);

  await page.goto(route("/sdk/?source=direct-local"));
  await waitForReader(page);
  await expect(page.locator("#page-turn-book")).toHaveAttribute(
    "data-sdk-source-ready",
    "true",
  );
  await page.locator("[data-sdk-source-link]").click();
  await expect(page).toHaveURL(/book=demo-book/);
  await expect(page).toHaveURL(/edition=2026-08/);
  await expect(page).toHaveURL(/chapter=principles#principles$/);

  await page.goto(route("/sdk/?source=direct-local-unknown"));
  await waitForReader(page);
  await expect(page.locator("#page-turn-book")).toHaveAttribute(
    "data-sdk-source-ready",
    "true",
  );
  await page.locator("[data-sdk-source-link]").click();
  await expect(page).toHaveURL(/source-fixture-unknown\/$/);
});

test("resolver rejection retains authored action and reports status", async ({
  page,
}) => {
  await page.goto(route("/sdk/?source=reject"));
  await waitForReader(page);
  await expect(page.locator("#page-turn-book")).toHaveAttribute(
    "data-sdk-source-ready",
    "true",
  );
  await page.locator("[data-sdk-source-link]").click();
  const dialog = page.getByRole("dialog", { name: "External source" });
  await expect(dialog).toContainText(
    "Source resolution failed: Test resolver rejected the source",
  );
  await expect(dialog.getByRole("link", { name: /Open source/ })).toHaveAttribute(
    "href",
    /source-fixture$/,
  );
  await expect(page.locator("[data-v3-status]")).toContainText(
    "could not resolve the external source",
  );
});

test("navigation, close, and destroy abort delayed resolution without reopening", async ({
  page,
}) => {
  await page.goto(route("/sdk/?source=delayed"));
  await waitForReader(page);
  await expect(page.locator("#page-turn-book")).toHaveAttribute(
    "data-sdk-source-ready",
    "true",
  );
  const link = page.locator("[data-sdk-source-link]");
  await link.click();
  const dialog = page.locator("[data-v3-source-dialog]");
  await page
    .locator("[data-v3-chapter-select]")
    .evaluate((select: HTMLSelectElement) => {
      const readerRoot =
        document.querySelector<HTMLElement>("#page-turn-book");
      if (readerRoot) {
        delete readerRoot.dataset.sdkSourceAborted;
      }
      select.value = "principles";
      select.dispatchEvent(new Event("change", { bubbles: true }));
    });
  await expect(page.locator("#page-turn-book")).toHaveAttribute(
    "data-sdk-source-aborted",
    "true",
  );
  await page.waitForTimeout(350);
  await expect(dialog).not.toBeVisible();

  await page.goto(route("/sdk/?source=delayed"));
  await waitForReader(page);
  await expect(page.locator("#page-turn-book")).toHaveAttribute(
    "data-sdk-source-ready",
    "true",
  );
  const restoredLink = page.locator("[data-sdk-source-link]");
  await restoredLink.click();
  await dialog.getByRole("button", { name: "Close source card" }).click();
  await expect(page.locator("#page-turn-book")).toHaveAttribute(
    "data-sdk-source-aborted",
    "true",
  );
  await page.waitForTimeout(350);
  await expect(dialog).not.toBeVisible();
  await expect(restoredLink).toBeFocused();

  await restoredLink.click();
  await page
    .getByRole("button", { name: "Destroy SDK reader" })
    .evaluate((button: HTMLButtonElement) => button.click());
  await page.waitForTimeout(350);
  await expect(page.locator("[data-v3-source-dialog]")).toHaveCount(0);
});

test("navigation start aborts delayed direct-local resolution before it can redirect", async ({
  page,
}) => {
  await page.goto(route("/sdk/?source=direct-local-delayed"));
  await waitForReader(page);
  await expect(page.locator("#page-turn-book")).toHaveAttribute(
    "data-sdk-source-ready",
    "true",
  );
  await page.locator("[data-sdk-source-link]").click();
  await page
    .locator("[data-v3-chapter-select]")
    .evaluate((select: HTMLSelectElement) => {
      select.value = "principles";
      select.dispatchEvent(new Event("change", { bubbles: true }));
    });
  await expect(page.locator("#page-turn-book")).toHaveAttribute(
    "data-sdk-source-aborted",
    "true",
  );
  await expect(page.locator("[data-v3-chapter-select]")).toHaveValue(
    "principles",
  );
  await page.waitForTimeout(1_100);
  await expect(page).not.toHaveURL(/chapter=introduction/);
  await expect(page.locator("[data-v3-chapter-select]")).toHaveValue(
    "principles",
  );
});

test("page-turn navigation aborts delayed direct-local resolution", async ({
  page,
}) => {
  await page.goto(route("/sdk/?source=direct-local-delayed"));
  await waitForReader(page);
  await expect(page.locator("#page-turn-book")).toHaveAttribute(
    "data-sdk-source-ready",
    "true",
  );
  await page.locator("[data-sdk-source-link]").click();
  await page.getByRole("button", { name: "Next spread" }).click();
  await expect(page.locator("#page-turn-book")).toHaveAttribute(
    "data-sdk-source-aborted",
    "true",
  );
  await page.waitForTimeout(1_100);
  await expect(page).not.toHaveURL(/chapter=introduction/);
});

test("multiple shells receive unique source dialog relationships", async ({
  page,
}) => {
  await page.goto(route("/sdk/?instances=2"));
  await waitForReader(page);
  const labels = await page
    .locator("[data-v3-source-dialog]")
    .evaluateAll((dialogs) => dialogs.map((dialog) => dialog.getAttribute("aria-labelledby")));
  expect(labels).toHaveLength(2);
  expect(new Set(labels).size).toBe(2);
  for (const label of labels) {
    expect(label).toBeTruthy();
    await expect(page.locator(`#${label}`)).toHaveCount(1);
  }
});
