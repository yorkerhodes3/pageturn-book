import { expect, test } from "@playwright/test";

const pagesBase = (process.env.PAGES_BASE_PATH ?? "").replace(/\/$/, "");
const route = (path: string) => `${pagesBase}${path}`;
const chapterPath = route(
  "/book/demo-book/2026-08/chapters/introduction/",
);

test("presents both reader versions from the comparison landing page", async ({
  page,
}) => {
  await page.goto(route("/"));

  await expect(
    page.getByRole("heading", { level: 1, name: "Compare the book readers" }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Open legacy demo" })).toHaveAttribute(
    "href",
    "./legacy/",
  );
  await expect(page.getByRole("link", { name: "Open V2 demo" })).toHaveAttribute(
    "href",
    "./book/demo-book/2026-08/chapters/introduction/",
  );
});

test("serves directly readable semantic content without JavaScript", async ({
  browser,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto(chapterPath);

  await expect(
    page.getByRole("heading", { level: 1, name: "Introduction" }),
  ).toBeVisible();
  await expect(
    page.getByText("Technology becomes ethical through choices"),
  ).toBeVisible();
  await expect(page.locator("body")).toHaveAttribute("data-reader-status", "static");
  await context.close();
});

test("enhances the existing semantic chapter through a reader session", async ({
  page,
}) => {
  await page.goto(`${chapterPath}#why-semantic-reading-matters`);

  await expect(page.locator("body")).toHaveAttribute(
    "data-reader-status",
    "ready",
  );
  await expect(page.locator(".book-reader-runtime-status")).toHaveText(
    "Semantic reader ready",
  );
  await expect(
    page.getByRole("navigation", { name: "Table of contents" }),
  ).toBeVisible();
  await expect(page.locator(".book-reader-progress")).toHaveText(
    "Chapter 1 of 2",
  );
  await expect(
    page.getByRole("link", { name: "Why semantic reading matters" }),
  ).toHaveAttribute("aria-current", "location");
  await expect(
    page.getByRole("heading", {
      level: 2,
      name: "Why semantic reading matters",
    }),
  ).toHaveAttribute("id", "why-semantic-reading-matters");

  await page.getByRole("button", { name: "Next" }).click();
  await expect(page).toHaveURL(
    /\/book\/demo-book\/2026-08\/chapters\/principles\/#principles$/,
  );
  await expect(page.locator("body")).toHaveAttribute(
    "data-reader-status",
    "ready",
  );
  await expect(
    page.getByRole("heading", { level: 1, name: "Principles in Practice" }),
  ).toHaveAttribute("id", "principles");
  await expect(
    page.getByText(
      "The original viewer remains pinned and separate while the new approach is tested.",
    ),
  ).toHaveAttribute("id", "keep-a-fallback");
  await expect(page.locator(".book-reader-progress")).toHaveText(
    "Chapter 2 of 2",
  );
  await expect(page.getByRole("button", { name: "Next" })).toBeDisabled();

  await page.goBack();
  await expect(page).toHaveURL(
    /\/book\/demo-book\/2026-08\/chapters\/introduction\/#why-semantic-reading-matters$/,
  );
  await expect(
    page.getByRole("heading", {
      level: 2,
      name: "Why semantic reading matters",
    }),
  ).toBeVisible();
  await expect(page.locator(".book-reader-progress")).toHaveText(
    "Chapter 1 of 2",
  );
});

test("opens and closes the pinned legacy page-turn viewer", async ({ page }) => {
  await page.goto(route("/legacy/"));
  const open = page.getByRole("button", { name: "Open legacy book viewer" });
  await open.click();

  await expect(
    page.getByRole("dialog", { name: /Legacy fixed-page comparison/ }),
  ).toBeVisible();
  await expect(page.locator(".rab-counter")).toHaveText("1 / 6");
  await expect(page.getByRole("status")).toHaveText("Legacy viewer open.");

  await page.getByRole("button", { name: "Close book view" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("status")).toHaveText("Legacy viewer closed.");
  await expect(open).toBeFocused();
});

test("loads both versions in the side-by-side comparison", async ({ page }) => {
  await page.goto(route("/compare/"));

  const legacy = page.frameLocator('iframe[title="Legacy fixed-page reader"]');
  const semantic = page.frameLocator('iframe[title="V2 semantic reader"]');
  await expect(
    legacy.getByRole("heading", { level: 1, name: "Fixed-page flipbook" }),
  ).toBeVisible();
  await expect(
    semantic.getByRole("heading", { level: 1, name: "Introduction" }),
  ).toBeVisible();
  await expect(semantic.locator(".book-reader-runtime-status")).toHaveText(
    "Semantic reader ready",
  );
});
