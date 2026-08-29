import { expect, test, type Locator } from "@playwright/test";

const pagesBase = (process.env.PAGES_BASE_PATH ?? "").replace(/\/$/, "");
const route = (path: string) => `${pagesBase}${path}`;
const chapterPath = route(
  "/book/demo-book/2026-08/chapters/introduction/",
);
const productionChapterPath = route(
  "/book/what-is-ethical-ai/2026-07/chapters/executive-summary/",
);
const productionReferencesPath = route(
  "/book/what-is-ethical-ai/2026-07/chapters/references/",
);

async function turnLeafState(leaf: Locator) {
  return leaf.evaluate((node) => {
    const style = getComputedStyle(node);
    return {
      front: node.querySelector(".book-mode-turn-front")?.textContent ?? "",
      back: node.querySelector(".book-mode-turn-back")?.textContent ?? "",
      surfaces: node.querySelectorAll(".book-mode-turn-surface").length,
      inert: node.hasAttribute("inert"),
      width: Number.parseFloat(style.width),
      left: Number.parseFloat(style.left),
    };
  });
}

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
  await expect(
    page.getByRole("link", { name: "Open V2 book view" }),
  ).toHaveAttribute(
    "href",
    "./book/what-is-ethical-ai/2026-07/chapters/executive-summary/?view=book",
  );
  await expect(
    page.getByRole("link", { name: "Open semantic scroll view" }),
  ).toHaveAttribute(
    "href",
    "./book/what-is-ethical-ai/2026-07/chapters/executive-summary/",
  );
  await expect(
    page.getByRole("link", { name: /Enter the publication library/ }),
  ).toHaveAttribute("href", "./shelf/");
  await expect(
    page.getByRole("link", { name: "View functionality dashboard" }),
  ).toHaveAttribute("href", "./dashboard/");
});

test("documents implemented and planned capabilities on the dashboard", async ({
  page,
}) => {
  await page.goto(route("/dashboard/"));

  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Functionality & payload dashboard",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("row", { name: /Share current reading location Implemented/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("row", { name: /Local comments and annotations Planned/ }),
  ).toBeVisible();
  await expect(page.getByText("~99.2%")).toBeVisible();
  await expect(
    page.getByRole("link", { name: /Read What Is Ethical AI/ }),
  ).toHaveAttribute(
    "href",
    "../book/what-is-ethical-ai/2026-07/chapters/executive-summary/?view=book",
  );
});

test("renders the production library as optimized labeled bindings", async ({
  page,
}) => {
  await page.goto(route("/shelf/"));

  await expect(
    page.getByRole("heading", { level: 1, name: "Research, bound and shelved" }),
  ).toBeVisible();
  await expect(page.getByText("21 volumes")).toBeVisible();
  await expect(page.locator(".bookshelf-book")).toHaveCount(21);
  await expect(page.locator(".bookshelf-book-spine")).toHaveCount(21);
  await expect(page.locator("img")).toHaveCount(0);
  await expect(
    page.getByRole("heading", { level: 2, name: "Humanitarian Systems" }),
  ).toBeVisible();

  const loadedPublicationAssets = await page.evaluate(() =>
    performance
      .getEntriesByType("resource")
      .map((entry) => entry.name)
      .filter(
        (url) => url.includes("/pages/") || url.endsWith(".webp"),
      ),
  );
  expect(loadedPublicationAssets).toEqual([]);

  const thickBook = page.getByRole("button", {
    name: "What Is Ethical AI?, 46 pages",
  });
  const slimBook = page.getByRole("button", {
    name: "AI Research Assistant, 10 pages",
  });
  const [thickWidth, slimWidth] = await Promise.all([
    thickBook.evaluate((book) => book.getBoundingClientRect().width),
    slimBook.evaluate((book) => book.getBoundingClientRect().width),
  ]);
  expect(thickWidth).toBeGreaterThan(slimWidth);

  await thickBook.click();
  await expect(thickBook).toHaveAttribute("aria-pressed", "true");
  const selection = page.locator(".bookshelf-selection");
  await expect(selection).toBeVisible();
  await expect(
    selection.getByRole("heading", { name: "What Is Ethical AI?" }),
  ).toBeVisible();
  await expect(
    selection.getByRole("link", { name: "Read semantic edition" }),
  ).toHaveAttribute(
    "href",
    "../book/what-is-ethical-ai/2026-07/chapters/executive-summary/?view=book",
  );
  await expect(
    selection.getByRole("link", { name: "View designed pages" }),
  ).toHaveAttribute(
    "href",
    "../legacy/?book=what-is-ethical-ai&view=book",
  );
  await expect(
    selection.getByRole("link", { name: "Read semantic edition" }),
  ).toBeFocused();
  await expect(
    page.getByRole("button", {
      name: /FORCED LABOR RISK: Forced Labor Structural Risk Index/,
    }),
  ).toBeVisible();

  await thickBook.focus();
  await thickBook.press("ArrowRight");
  await expect(
    page.getByRole("button", { name: "AI Carbon Footprint, 18 pages" }),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(selection).toBeHidden();
  await expect(thickBook).toHaveAttribute("aria-pressed", "false");
});

test("pulls a shelf volume into the semantic reader", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(route("/shelf/"));
  await page
    .getByRole("button", { name: "What Is Ethical AI?, 46 pages" })
    .click();
  await page.getByRole("link", { name: "Read semantic edition" }).click();

  await expect(page).toHaveURL(
    /\/book\/what-is-ethical-ai\/2026-07\/chapters\/executive-summary\/\?view=book$/,
  );
  await expect(
    page.getByRole("dialog", { name: "What Is Ethical AI?" }),
  ).toBeVisible();
});

test("animates a selected binding out of the case before reading", async ({
  page,
}) => {
  await page.goto(route("/shelf/"));
  await page
    .getByRole("button", { name: "What Is Ethical AI?, 46 pages" })
    .click();
  await page
    .getByRole("link", { name: "Read semantic edition" })
    .evaluate((link) => (link as HTMLAnchorElement).click());

  await expect(page.locator(".bookshelf-book-flight")).toBeVisible();
  await expect(page.locator(".bookshelf-flight-cover")).toHaveCount(1);
  await expect(page.locator(".bookshelf-navigating")).toBeVisible();
  await expect(page).toHaveURL(
    /\/book\/what-is-ethical-ai\/2026-07\/chapters\/executive-summary\/\?view=book$/,
  );
});

test("keeps the shelf and selection card inside a phone viewport", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(route("/shelf/"));

  const documentOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(documentOverflow).toBeLessThanOrEqual(1);
  const firstRow = page.locator(".bookshelf-volume-row").first();
  const rowDimensions = await firstRow.evaluate((row) => ({
    clientWidth: row.clientWidth,
    scrollWidth: row.scrollWidth,
  }));
  expect(rowDimensions.scrollWidth).toBeGreaterThan(rowDimensions.clientWidth);

  await page
    .getByRole("button", { name: "What Is Ethical AI?, 46 pages" })
    .click();
  const selectionBox = await page.locator(".bookshelf-selection").boundingBox();
  if (!selectionBox) {
    throw new Error("Expected selected publication card");
  }
  expect(selectionBox.x).toBeGreaterThanOrEqual(0);
  expect(selectionBox.x + selectionBox.width).toBeLessThanOrEqual(390);

  await page.setViewportSize({ width: 390, height: 320 });
  const [shortCard, closeButton] = await Promise.all([
    page.locator(".bookshelf-selection").boundingBox(),
    page.getByRole("button", { name: "Return book" }).boundingBox(),
  ]);
  if (!shortCard || !closeButton) {
    throw new Error("Expected short-screen selection controls");
  }
  expect(shortCard.y).toBeGreaterThanOrEqual(0);
  expect(shortCard.y + shortCard.height).toBeLessThanOrEqual(320);
  expect(closeButton.y).toBeGreaterThanOrEqual(shortCard.y);
});

test("opens any selected shelf facsimile from its pinned manifest", async ({
  page,
}) => {
  test.setTimeout(60_000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(route("/shelf/"));
  await page
    .getByRole("button", { name: "After the Corridor, 22 pages" })
    .click();
  await page.getByRole("link", { name: "Open designed pages" }).click();

  await expect(page).toHaveURL(
    /\/legacy\/\?book=after-the-corridor&view=book$/,
  );
  await expect(
    page.getByRole("dialog", { name: "After the Corridor — page view" }),
  ).toBeVisible();
  await expect(page.locator(".rab-counter")).toHaveText("1 / 22");
});

test("retries a selected publication after a transient manifest failure", async ({
  page,
}) => {
  test.setTimeout(60_000);
  let attempts = 0;
  await page.route("**/after-the-corridor/pages/manifest.json", async (route) => {
    attempts += 1;
    if (attempts === 1) {
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ error: "temporary failure" }),
      });
      return;
    }
    await route.continue();
  });
  await page.goto(
    route("/legacy/?book=after-the-corridor"),
  );
  const open = page.getByRole("button", {
    name: "Open legacy book viewer",
  });
  await open.click();
  await expect(page.getByRole("status")).toContainText(
    "Could not load After the Corridor page manifest (503)",
  );
  await expect(open).toBeEnabled();

  await open.click();
  await expect(
    page.getByRole("dialog", { name: "After the Corridor — page view" }),
  ).toBeVisible();
  expect(attempts).toBe(2);
});

test("uses the production Ethical Tech CoLab report in V2", async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto(productionChapterPath);

  await expect(
    page.getByRole("heading", { level: 1, name: "01. Executive Summary" }),
  ).toBeVisible();
  await expect(
    page.getByText(
      "Humanity has repeatedly transformed itself through technological innovation.",
    ),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Conclusion" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Works Cited" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Book view" }).click();
  await expect(
    page.getByRole("dialog", { name: "What Is Ethical AI?" }),
  ).toBeVisible();
  await expect(page.locator(".book-mode-counter")).toHaveText("Front cover");
  await page
    .getByRole("button", { name: "Turn page forward" })
    .click();
  await expect(page.locator(".book-mode-counter")).toHaveText("Screen 1 / 99");
  await expect(page.locator(".book-mode-page-fan-edge")).toHaveCount(22);
  await expect(page.locator(".book-mode-overlay")).toHaveCSS(
    "--book-page-count",
    "46",
  );
});

test("shares the current canonical location from scroll and book views", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: (data: ShareData) => {
        (
          globalThis as typeof globalThis & {
            __sharedReadingLocation?: ShareData;
          }
        ).__sharedReadingLocation = data;
        return Promise.resolve();
      },
    });
  });
  await page.goto(`${productionChapterPath}#executive-summary`);
  await page.getByRole("button", { name: "Share" }).click();
  await expect(page.locator(".book-reader-progress")).toHaveText(
    "Reading location shared",
  );
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (
            globalThis as typeof globalThis & {
              __sharedReadingLocation?: ShareData;
            }
          ).__sharedReadingLocation?.url,
      ),
    )
    .toContain("#executive-summary");

  await page.getByRole("button", { name: "Book view" }).click();
  const dialog = page.getByRole("dialog", { name: "What Is Ethical AI?" });
  await dialog.getByRole("button", { name: "Share" }).click();
  await expect(dialog.locator(".book-mode-counter")).toHaveText(
    "Reading location shared",
  );
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (
            globalThis as typeof globalThis & {
              __sharedReadingLocation?: ShareData;
            }
          ).__sharedReadingLocation?.url,
      ),
    )
    .toContain("view=book");
});

test("keeps production book pages free of internal scrolling", async ({
  page,
}) => {
  test.setTimeout(90_000);
  for (const viewport of [
    { width: 1440, height: 1000, counter: "Screen 1 / 99" },
    { width: 390, height: 844, counter: "Screen 1 / 221" },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto(productionChapterPath);
    await page.getByRole("button", { name: "Book view" }).click();
    await expect(page.locator('.book-mode-spread[aria-busy="false"]')).toBeVisible();
    await page
      .getByRole("button", { name: "Turn page forward" })
      .click();
    await expect(page.locator(".book-mode-counter")).toHaveText(
      viewport.counter,
    );
    const sheets = await page
      .locator(".book-mode-sheet:not(.book-mode-sheet-blank)")
      .evaluateAll((nodes) =>
        nodes.map((node) => ({
          overflow: node.scrollHeight - node.clientHeight,
          overflowY: getComputedStyle(node).overflowY,
        })),
      );
    expect(sheets.every(({ overflow }) => overflow <= 1)).toBe(true);
    expect(sheets.every(({ overflowY }) => overflowY === "hidden")).toBe(true);
    if (viewport.width > 1000) {
      const next = page.getByRole("button", { name: "Next screen page" });
      for (const expected of [
        "Screens 2–3 / 99",
        "Screens 4–5 / 99",
      ]) {
        await next.click();
        await expect(page.locator(".book-mode-counter")).toHaveText(expected, {
          timeout: 15_000,
        });
        const spreadFits = await page
          .locator(".book-mode-sheet:not(.book-mode-sheet-blank)")
          .evaluateAll((nodes) =>
            nodes.every(
              (node) => node.scrollHeight - node.clientHeight <= 1,
            ),
          );
        expect(spreadFits).toBe(true);
      }
    }
    await page.getByRole("button", { name: "Close" }).click();
  }
});

test("repaginates production content when the book crosses its breakpoint", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(productionChapterPath);
  await page.getByRole("button", { name: "Book view" }).click();
  await page
    .getByRole("button", { name: "Turn page forward" })
    .click();
  await expect(page.locator(".book-mode-counter")).toHaveText("Screen 1 / 99");

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator(".book-mode-counter")).toHaveText("Screen 1 / 221");
  const resizedPage = page.locator(
    ".book-mode-sheet:not(.book-mode-sheet-blank)",
  );
  await expect
    .poll(() =>
      resizedPage.evaluate(
        (node) => node.scrollHeight - node.clientHeight,
      ),
    )
    .toBeLessThanOrEqual(1);

  const next = page.getByRole("button", { name: "Next screen page" });
  for (const counter of [
    "Screen 2 / 221",
    "Screen 3 / 221",
    "Screen 4 / 221",
    "Screen 5 / 221",
  ]) {
    await next.click();
    await expect(page.locator(".book-mode-counter")).toHaveText(counter);
  }
  const visibleFragment = await resizedPage
    .textContent()
    .then((text) => text?.trim().slice(0, 64) ?? "");
  expect(visibleFragment.length).toBeGreaterThan(20);

  await page.setViewportSize({ width: 1440, height: 1000 });
  await expect(page.locator(".book-mode-counter")).toContainText("/ 99");
  const spreadText = await page
    .locator(".book-mode-sheet:not(.book-mode-sheet-blank)")
    .allTextContents();
  expect(spreadText.join(" ")).toContain(visibleFragment);

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator(".book-mode-counter")).toContainText("/ 221");
  await page.setViewportSize({ width: 390, height: 320 });
  await expect
    .poll(() =>
      resizedPage.evaluate(
        (node) => node.scrollHeight - node.clientHeight,
      ),
    )
    .toBeLessThanOrEqual(1);
  await expect(page.locator(".book-mode-overlay")).toHaveCSS(
    "overflow-y",
    "auto",
  );
});

test("preserves cached chapters across navigation and repagination", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(productionChapterPath);
  await page.getByRole("button", { name: "Book view" }).click();
  const next = page.getByRole("button", { name: "Next screen page" });
  await next.click();
  for (let index = 0; index < 8; index += 1) {
    if (page.url().includes("/chapters/power/")) {
      break;
    }
    const previousCounter = await page.locator(".book-mode-counter").textContent();
    await next.click();
    await expect
      .poll(() => page.locator(".book-mode-counter").textContent())
      .not.toBe(previousCounter);
  }
  await expect(page).toHaveURL(/\/chapters\/power\/\?view=book#/);

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator(".book-mode-counter")).toContainText("/ 221");
  const previous = page.getByRole("button", { name: "Previous screen page" });
  for (let index = 0; index < 12; index += 1) {
    if (page.url().includes("/chapters/executive-summary/")) {
      break;
    }
    const previousCounter = await page.locator(".book-mode-counter").textContent();
    await previous.click();
    await expect
      .poll(() => page.locator(".book-mode-counter").textContent())
      .not.toBe(previousCounter);
  }
  await expect(page).toHaveURL(
    /\/chapters\/executive-summary\/\?view=book#/,
  );
  await expect(page.locator("body")).toHaveAttribute(
    "data-reader-status",
    "ready",
  );
  await expect(page.locator(".book-mode-error")).toHaveCount(0);
});

test("keeps the canonical right page visible when a final spread repaginates", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(`${productionReferencesPath}?view=book#disclaimer`);
  await expect(
    page.getByRole("dialog", { name: "What Is Ethical AI?" }),
  ).toBeVisible();
  await expect(page.locator(".book-mode-counter")).toHaveText(
    "Screens 98–99 / 99",
  );

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator(".book-mode-counter")).toContainText("/ 221");
  await expect(
    page
      .getByRole("dialog")
      .getByRole("heading", { level: 2, name: "Disclaimer" }),
  ).toBeVisible();
  await expect(page).toHaveURL(/\?view=book#disclaimer$/);
});

test("keeps pointer-turned continuation sheets at one canonical location", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(productionChapterPath);
  await page.getByRole("button", { name: "Book view" }).click();
  await page
    .getByRole("button", { name: "Turn page forward" })
    .click();
  await expect(page.locator(".book-mode-counter")).toHaveText("Screen 1 / 221");
  await page
    .getByRole("button", { name: "Next screen page" })
    .click();
  await expect(page.locator(".book-mode-counter")).toHaveText("Screen 2 / 221");
  const historyBeforeContinuation = await page.evaluate(() => history.length);
  const book = page.locator(".book-mode-book");
  const bookBox = await book.boundingBox();
  const cornerBox = await page.locator(".book-mode-corner").boundingBox();
  if (!bookBox || !cornerBox) {
    throw new Error("Expected production continuation turn bounds");
  }
  const y = cornerBox.y + cornerBox.height * 0.75;
  await page.mouse.move(cornerBox.x + cornerBox.width * 0.75, y);
  await page.mouse.down();
  await page.mouse.move(bookBox.x + bookBox.width * 0.2, y, { steps: 5 });
  await page.mouse.up();

  await expect(page.locator(".book-mode-counter")).toHaveText("Screen 3 / 221");
  expect(await page.evaluate(() => history.length)).toBe(
    historyBeforeContinuation,
  );
});

test("preserves the production references and disclaimer", async ({ page }) => {
  await page.goto(productionReferencesPath);

  await expect(
    page.getByRole("heading", { level: 1, name: "17. Works Cited" }),
  ).toBeVisible();
  await expect(page.locator('[id^="reference-"]')).toHaveCount(122);
  await expect(
    page.getByRole("link", {
      name: /Choking Off China's Access to the Future of AI/,
    }),
  ).toHaveAttribute(
    "href",
    "https://www.csis.org/analysis/choking-chinas-access-future-ai",
  );
  await expect(
    page.getByRole("heading", { level: 2, name: "Disclaimer" }),
  ).toBeVisible();
  await expect(
    page.getByText(
      "Views and findings are those of the researchers and do not represent the official positions",
    ),
  ).toBeVisible();
});

test("fits the production cover on a narrow screen", async ({ page }) => {
  test.setTimeout(60_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(productionChapterPath);
  await page.getByRole("button", { name: "Book view" }).click();

  const book = page.locator(".book-mode-book");
  const cover = page.locator(".book-mode-cover");
  const coverContent = page.locator(".book-mode-cover-content");
  await expect(page.locator('.book-mode-spread[aria-busy="false"]')).toBeVisible();
  await expect(book).toBeVisible();
  await expect(cover).toBeVisible();
  const [bookBox, coverBox, contentBox] = await Promise.all([
    book.boundingBox(),
    cover.boundingBox(),
    coverContent.boundingBox(),
  ]);
  if (!bookBox || !coverBox || !contentBox) {
    throw new Error("Expected production cover bounds");
  }
  expect(coverBox.width / bookBox.width).toBeGreaterThan(0.95);
  expect(coverBox.width / coverBox.height).toBeCloseTo(0.7727, 2);
  expect(contentBox.x).toBeGreaterThanOrEqual(coverBox.x);
  expect(contentBox.x + contentBox.width).toBeLessThanOrEqual(
    coverBox.x + coverBox.width,
  );
  expect(contentBox.y).toBeGreaterThanOrEqual(coverBox.y);
  expect(contentBox.y + contentBox.height).toBeLessThanOrEqual(
    coverBox.y + coverBox.height,
  );
  const coverContentOverflow = await coverContent.evaluate(
    (node) => node.scrollHeight - node.clientHeight,
  );
  expect(coverContentOverflow).toBeLessThanOrEqual(1);
  await expect(cover).toHaveCSS("overflow-y", "hidden");
  await expect(cover).toHaveCSS("scrollbar-width", "none");
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

test("opens a semantic spread and keeps scroll navigation in sync", async ({
  page,
}) => {
  await page.route("**/chapters/principles/index.html", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 500));
    await route.continue();
  });
  await page.goto(chapterPath);
  await page.locator("[data-reader-content]").evaluate((article) => {
    const relation = document.createElement("div");
    relation.innerHTML =
      '<label for="book-mode-test-input">Related note</label>' +
      '<input id="book-mode-test-input" type="text">';
    article.append(relation);
  });
  const trigger = page.getByRole("button", { name: "Book view" });
  await trigger.click();

  const dialog = page.getByRole("dialog", {
    name: "A Small Book About Ethical Technology",
  });
  await expect(dialog).toBeVisible();
  await expect(page.getByRole("button", { name: "Close" })).toBeFocused({
    timeout: 250,
  });
  await expect(page.locator(".book-mode-counter")).toHaveText("Front cover", {
    timeout: 250,
  });
  await expect(page.locator(".book-mode-spread")).toHaveAttribute(
    "aria-busy",
    "true",
  );
  await expect(page).toHaveURL(/\?view=book$/);
  await expect(page.locator(".book-mode-counter")).toHaveText("Front cover");
  await expect(page.locator(".book-mode-cover")).toHaveCount(1);
  await expect(
    dialog.getByRole("heading", {
      level: 1,
      name: "A Small Book About Ethical Technology",
    }),
  ).toBeVisible();
  await expect(page.locator(".book-mode-overlay")).toHaveAttribute(
    "data-book-binding-material",
    "leather",
  );
  await expect(page.locator(".book-mode-overlay")).toHaveCSS(
    "--book-binding-color",
    "#301713",
  );
  await expect(page.locator(".book-mode-binding-hub")).toHaveCount(5);
  await expect(page.locator(".book-mode-cover")).toHaveCSS(
    "overflow-y",
    "hidden",
  );
  await expect(page.locator(".book-mode-cover")).toHaveCSS(
    "scrollbar-width",
    "none",
  );
  await page.locator(".book-mode-overlay").evaluate((node) => {
    node.style.zoom = "1.25";
  });
  await expect(page.locator(".book-mode-cover")).toHaveCSS(
    "overflow-y",
    "hidden",
  );
  await page.locator(".book-mode-overlay").evaluate((node) => {
    node.style.removeProperty("zoom");
  });
  await expect(page.locator(".book-mode-spread")).toHaveAttribute(
    "aria-busy",
    "false",
  );
  await page.addStyleTag({
    content:
      ".book-mode-turn-leaf-forward,.book-mode-turn-leaf-backward," +
      ".book-mode-turn-front,.book-mode-turn-back," +
      ".book-mode-turn-shadow,.book-mode-turn-fold{animation-duration:2s!important}",
  });

  const closedCoverBox = await page.locator(".book-mode-cover").boundingBox();
  const closedPageBlockBox = await page
    .locator(".book-mode-page-block")
    .boundingBox();
  if (!closedCoverBox || !closedPageBlockBox) {
    throw new Error("Expected closed cover and page-block bounds");
  }
  expect(closedPageBlockBox.y).toBeGreaterThanOrEqual(closedCoverBox.y);
  expect(closedPageBlockBox.y + closedPageBlockBox.height).toBeLessThanOrEqual(
    closedCoverBox.y + closedCoverBox.height,
  );
  const overlayBackground = await page
    .locator(".book-mode-overlay")
    .evaluate((node) => getComputedStyle(node).backgroundColor);
  await page
    .getByRole("button", { name: "Turn page forward" })
    .evaluate((button) => (button as HTMLButtonElement).click());
  await expect(page.locator(".book-mode-book-sliding")).toBeVisible();
  await expect(page.locator(".book-mode-binding-board-left")).toHaveCSS(
    "display",
    "none",
  );
  await expect(page.locator(".book-mode-overlay")).toHaveCSS(
    "background-color",
    overlayBackground,
  );
  const coverLeaf = page.locator(".book-mode-turn-leaf-from-cover");
  await expect(coverLeaf).toBeVisible();
  const coverFaces = await turnLeafState(coverLeaf);
  expect(coverFaces.surfaces).toBe(1);
  expect(coverFaces.front).toContain("A Small Book About Ethical Technology");
  expect(coverFaces.back).not.toContain("Introduction");
  expect(coverFaces.inert).toBe(true);
  expect(Math.abs(coverFaces.width - closedCoverBox.width)).toBeLessThan(2);
  expect(coverFaces.left).toBeGreaterThan(closedCoverBox.width * 0.8);
  await expect(page.locator(".book-mode-counter")).toHaveText("Opening cover");
  await expect(
    page.locator(".book-mode-spread > .book-mode-sheet-left"),
  ).toHaveCount(0);
  await expect(
    page.locator(".book-mode-spread > .book-mode-cover"),
  ).toHaveCount(0);
  await expect(page.locator(".book-mode-page-fan-edge")).toHaveCount(5);
  await expect(
    page.locator(".book-mode-spread > .book-mode-sheet-right"),
  ).toContainText("Introduction");
  const openingPageBox = await page
    .locator(".book-mode-spread > .book-mode-sheet-right")
    .boundingBox();
  const openingBookBox = await page.locator(".book-mode-book").boundingBox();
  if (!openingPageBox || !openingBookBox) {
    throw new Error("Expected opening page and book bounds");
  }
  expect(openingPageBox.x).toBeGreaterThan(
    openingBookBox.x + openingBookBox.width * 0.45,
  );
  expect(openingPageBox.x + openingPageBox.width).toBeLessThanOrEqual(
    openingBookBox.x + openingBookBox.width + 1,
  );
  await expect(coverLeaf).toHaveCount(0, { timeout: 3000 });
  await expect(page.locator(".book-mode-counter")).toHaveText("Screen 1 / 7");
  await expect(page.locator(".book-mode-sheet")).toHaveCount(2);
  await expect(page.locator(".book-mode-page-fan-edge")).toHaveCount(10);
  await expect(
    page.locator(".book-mode-sheet-blank-inside-cover"),
  ).toHaveCount(1);
  await expect(page.locator(".book-mode-sheet-right")).not.toHaveCSS(
    "transform",
    "none",
  );
  await expect(
    dialog.getByRole("heading", { level: 1, name: "Introduction" }),
  ).toBeVisible();
  const openingLink = dialog.getByRole("link", {
    name: "this opening section",
  });
  await expect(openingLink).toHaveAttribute(
    "href",
    "#book-mode-introduction-1-1",
  );
  await expect(page.locator("main.book-layout")).toHaveAttribute("inert", "");

  await page
    .getByRole("button", { name: "Previous screen page" })
    .evaluate((button) => (button as HTMLButtonElement).click());
  const closingLeaf = page.locator(".book-mode-turn-leaf-to-cover");
  await expect(closingLeaf).toBeVisible();
  const closingFaces = await turnLeafState(closingLeaf);
  expect(closingFaces.back).toContain("A Small Book About Ethical Technology");
  await expect(
    page.locator(".book-mode-spread > .book-mode-sheet-right"),
  ).toContainText("Introduction");
  await expect(
    page.locator(".book-mode-spread > .book-mode-cover"),
  ).toHaveCount(0);
  await expect(closingLeaf).toHaveCount(0, { timeout: 3000 });
  await expect(page.locator(".book-mode-counter")).toHaveText("Front cover");
  await expect(page.locator(".book-mode-cover")).toHaveCount(1);
  await page.waitForTimeout(450);
  const reclosedCoverBox = await page.locator(".book-mode-cover").boundingBox();
  if (!reclosedCoverBox) {
    throw new Error("Expected reclosed cover bounds");
  }
  expect(Math.abs(reclosedCoverBox.x - closedCoverBox.x)).toBeLessThan(3);

  await page
    .getByRole("button", { name: "Next screen page", exact: true })
    .evaluate((button) => (button as HTMLButtonElement).click());
  await expect(page.locator(".book-mode-turn-leaf")).toHaveCount(0, {
    timeout: 3000,
  });
  await expect(page.locator(".book-mode-counter")).toHaveText("Screen 1 / 7");

  await page
    .getByRole("button", { name: "Next screen page", exact: true })
    .evaluate((button) => (button as HTMLButtonElement).click());
  const firstPageLeaf = page.locator(".book-mode-turn-leaf-forward");
  await expect(firstPageLeaf).toBeVisible();
  const firstPageFaces = await turnLeafState(firstPageLeaf);
  expect(firstPageFaces.front).toContain("Introduction");
  expect(firstPageFaces.back).toContain("Why semantic reading matters");
  await expect(firstPageLeaf.locator(".book-mode-turn-segment")).toHaveCount(0);
  const automaticSurface = await firstPageLeaf
    .locator(".book-mode-turn-surface")
    .evaluate((node) => ({
      animation: getComputedStyle(node).animationName,
      sheen: getComputedStyle(node, "::after").animationName,
    }));
  expect(automaticSurface.animation).toBe("book-mode-surface-forward");
  expect(automaticSurface.sheen).toBe("book-mode-surface-sheen");
  await expect(
    page.locator(".book-mode-spread > .book-mode-sheet-right"),
  ).toContainText("What this first slice proves");
  await expect(firstPageLeaf).toHaveCount(0, { timeout: 3000 });
  await expect(page.locator(".book-mode-counter")).toHaveText(
    "Screens 2–3 / 7",
  );
  await expect(page).toHaveURL(
    /\/chapters\/introduction\/\?view=book#why-semantic-reading-matters$/,
  );
  const relatedInput = dialog.getByRole("textbox", { name: "Related note" });
  const relatedInputId = await relatedInput.getAttribute("id");
  expect(relatedInputId).toMatch(/^book-mode-introduction-3-\d+$/);
  expect(relatedInputId?.length).toBeLessThan(40);
  await expect(dialog.getByText("Related note")).toHaveAttribute(
    "for",
    relatedInputId ?? "",
  );

  await page
    .getByRole("button", { name: "Next screen page", exact: true })
    .evaluate((button) => (button as HTMLButtonElement).click());
  const forwardLeaf = page.locator(".book-mode-turn-leaf-forward");
  await expect(forwardLeaf).toBeVisible();
  const forwardFaces = await turnLeafState(forwardLeaf);
  expect(forwardFaces.front).toContain("What this first slice proves");
  expect(forwardFaces.back).toContain("Principles in Practice");
  await expect(
    page.locator(".book-mode-spread > .book-mode-sheet-right"),
  ).toContainText("Preserve meaning");
  await expect(forwardLeaf).toHaveCount(0, { timeout: 3000 });
  await expect(page.locator(".book-mode-counter")).toHaveText(
    "Screens 4–5 / 7",
  );
  await expect(page).toHaveURL(
    /\/chapters\/principles\/\?view=book#principles$/,
  );
  await expect(
    dialog.getByRole("heading", { level: 1, name: "Principles in Practice" }),
  ).toBeVisible();

  await page
    .getByRole("button", { name: "Previous screen page" })
    .evaluate((button) => (button as HTMLButtonElement).click());
  const backwardLeaf = page.locator(".book-mode-turn-leaf-backward");
  await expect(backwardLeaf).toBeVisible();
  const backwardFaces = await turnLeafState(backwardLeaf);
  expect(backwardFaces.front).toContain("Principles in Practice");
  expect(backwardFaces.back).toContain("What this first slice proves");
  await expect(backwardLeaf).toHaveCount(0, { timeout: 3000 });
  await expect(page.locator(".book-mode-counter")).toHaveText(
    "Screens 2–3 / 7",
  );

  await page
    .getByRole("button", { name: "Next screen page", exact: true })
    .click();
  await expect(page.locator(".book-mode-counter")).toHaveText(
    "Screens 4–5 / 7",
  );
  await page
    .getByRole("button", { name: "Next screen page", exact: true })
    .click();
  await expect(page.locator(".book-mode-counter")).toHaveText(
    "Screens 6–7 / 7",
  );
  await expect(
    page.locator(".book-mode-sheet:not(.book-mode-sheet-blank)"),
  ).toHaveCount(2);
  await expect(page).toHaveURL(
    /\/chapters\/principles\/\?view=book#h-keep-a-fallback$/,
  );
  await expect(
    dialog.getByRole("heading", { level: 2, name: "Keep a fallback" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Next screen page" }),
  ).toBeDisabled();

  await page.goBack();
  await expect(page.locator(".book-mode-counter")).toHaveText(
    "Screens 4–5 / 7",
  );
  await expect(page).toHaveURL(
    /\/chapters\/principles\/\?view=book#principles$/,
  );

  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await expect(page).toHaveURL(
    /\/chapters\/principles\/#principles$/,
  );
  await expect(
    page.getByRole("heading", { level: 1, name: "Principles in Practice" }),
  ).toBeVisible();
  await expect(page.locator("main.book-layout")).not.toHaveAttribute("inert", "");
  await expect(page.locator("body")).not.toHaveClass(/book-mode-active/);
});

test("uses one semantic sheet on a narrow screen", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(chapterPath);
  await page.getByRole("button", { name: "Book view" }).click();

  await expect(page.locator(".book-mode-counter")).toHaveText("Front cover");
  await expect(page.locator(".book-mode-sheet")).toHaveCount(1);
  const closedBook = await page.locator(".book-mode-book").boundingBox();
  const closedCover = await page.locator(".book-mode-cover").boundingBox();
  if (!closedBook || !closedCover) {
    throw new Error("Expected responsive book and cover bounds");
  }
  expect(closedCover.width / closedBook.width).toBeGreaterThan(0.95);
  await expect(page.locator(".book-mode-cover-title")).toHaveCSS(
    "font-size",
    /.+/,
  );
  const overlay = page.locator(".book-mode-overlay");
  await expect
    .poll(async () =>
      overlay.evaluate((node) => node.scrollWidth === node.clientWidth),
    )
    .toBe(true);

  await page
    .getByRole("button", { name: "Turn page forward" })
    .click();
  await expect(page.locator(".book-mode-counter")).toHaveText("Screen 1 / 14");

  const book = page.locator(".book-mode-book");
  const box = await book.boundingBox();
  if (!box) {
    throw new Error("Expected book mode bounds");
  }
  const cornerBox = await page.locator(".book-mode-corner").boundingBox();
  if (!cornerBox) {
    throw new Error("Expected page corner bounds");
  }
  const cornerY = cornerBox.y + cornerBox.height * 0.75;
  await page.mouse.move(
    cornerBox.x + cornerBox.width * 0.75,
    cornerY,
  );
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.2, cornerY, {
    steps: 5,
  });
  const peel = page.locator(".book-mode-turn-leaf-interactive");
  await expect(peel).toBeVisible();
  await expect(peel.locator(".book-mode-turn-surface")).toHaveCount(1);
  await expect(peel.locator(".book-mode-turn-segment")).toHaveCount(0);
  await expect(peel).toHaveClass(/book-mode-turn-past-half/);
  await expect(peel.locator(".book-mode-turn-front").first()).toHaveCSS(
    "opacity",
    "0",
  );
  await expect(peel.locator(".book-mode-turn-back").first()).toHaveCSS(
    "opacity",
    "1",
  );
  await expect(peel.locator(".book-mode-turn-back").first()).toContainText(
    "Technology becomes ethical through choices",
  );
  const surface = await peel.locator(".book-mode-turn-surface").evaluate((node) => ({
    transform: getComputedStyle(node).transform,
    borderRadius: getComputedStyle(node).borderRadius,
  }));
  expect(surface.transform).not.toBe("none");
  expect(surface.borderRadius).not.toBe("0px");
  await expect(
    page.locator(".book-mode-spread > .book-mode-sheet-right"),
  ).toContainText("Technology becomes ethical through choices");
  await page.mouse.up();
  await expect(page.locator(".book-mode-turn-leaf-interactive")).toHaveCount(0);
  await expect(page.locator(".book-mode-counter")).toHaveText("Screen 2 / 14");
  const openedBox = await book.boundingBox();
  if (!openedBox) {
    throw new Error("Expected opened book bounds");
  }

  await page.mouse.move(
    openedBox.x + openedBox.width * 0.08,
    openedBox.y + openedBox.height * 0.5,
  );
  await page.mouse.down();
  await page.mouse.move(
    openedBox.x + openedBox.width * 0.8,
    openedBox.y + openedBox.height * 0.5,
    { steps: 5 },
  );
  const backwardPeel = page.locator(".book-mode-turn-leaf-interactive");
  await expect(
    backwardPeel.locator(".book-mode-turn-front").first(),
  ).toContainText(
    "Technology becomes ethical through choices",
  );
  await expect(
    backwardPeel.locator(".book-mode-turn-back").first(),
  ).toContainText(
    "Introduction",
  );
  await page.mouse.up();
  await expect(page.locator(".book-mode-counter")).toHaveText("Screen 1 / 14");

  await page
    .getByRole("button", { name: "Previous screen page" })
    .click();
  await expect(page.locator(".book-mode-counter")).toHaveText("Front cover");
  await expect(page).toHaveURL(/\?view=book$/);
});

test("preserves native text selection away from page edges", async ({ page }) => {
  await page.goto(`${chapterPath}#introduction`);
  await page.getByRole("button", { name: "Book view" }).click();
  await expect(page.locator(".book-mode-counter")).toHaveText("Screen 1 / 7");
  const paragraph = page
    .locator(".book-mode-sheet-content p")
    .filter({ hasText: "Technology becomes ethical" });

  await expect(paragraph).not.toHaveCSS("user-select", "none");
  await paragraph.selectText();
  await expect(page.locator(".book-mode-turn-leaf-interactive")).toHaveCount(0);
  const selection = await page.evaluate(() => getSelection()?.toString() ?? "");
  expect(selection.length).toBeGreaterThan(0);
});

test("cancels a peel that reverses away from its chosen direction", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(chapterPath);
  await page.getByRole("button", { name: "Book view" }).click();
  await page
    .getByRole("button", { name: "Turn page forward" })
    .click();
  await expect(page.locator(".book-mode-counter")).toHaveText("Screen 1 / 14");
  const book = page.locator(".book-mode-book");
  const box = await book.boundingBox();
  if (!box) {
    throw new Error("Expected book mode bounds");
  }

  const cornerBox = await page.locator(".book-mode-corner").boundingBox();
  if (!cornerBox) {
    throw new Error("Expected page corner bounds");
  }
  const startX = cornerBox.x + cornerBox.width * 0.75;
  const y = cornerBox.y + cornerBox.height * 0.75;
  await page.mouse.move(startX, y);
  await page.mouse.down();
  await page.mouse.move(startX - 12, y);
  await expect(page.locator(".book-mode-turn-leaf-interactive")).toBeVisible();
  await page.mouse.move(startX + 110, y, { steps: 4 });
  await page.mouse.up();

  await expect(page.locator(".book-mode-turn-leaf-interactive")).toHaveCount(0);
  await expect(page.locator(".book-mode-counter")).toHaveText("Screen 1 / 14");
});

test("does not turn a page when a pointer gesture is cancelled", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(chapterPath);
  await page.getByRole("button", { name: "Book view" }).click();
  await page
    .getByRole("button", { name: "Turn page forward" })
    .click();
  await expect(page.locator(".book-mode-counter")).toHaveText("Screen 1 / 14");
  const book = page.locator(".book-mode-book");
  const box = await book.boundingBox();
  if (!box) {
    throw new Error("Expected book mode bounds");
  }

  const cornerBox = await page.locator(".book-mode-corner").boundingBox();
  if (!cornerBox) {
    throw new Error("Expected page corner bounds");
  }
  const cornerY = cornerBox.y + cornerBox.height * 0.75;
  await page.mouse.move(
    cornerBox.x + cornerBox.width * 0.75,
    cornerY,
  );
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.3, cornerY, {
    steps: 4,
  });
  await expect(page.locator(".book-mode-turn-leaf-interactive")).toBeVisible();
  await book.dispatchEvent("pointercancel", {
    pointerId: 1,
    isPrimary: true,
    clientX: box.x,
    clientY: box.y + box.height * 0.5,
  });
  await page.mouse.up();

  await expect(page.locator(".book-mode-turn-leaf-interactive")).toHaveCount(0);
  await expect(page.locator(".book-mode-counter")).toHaveText("Screen 1 / 14");
});

test("does not navigate after closing during an automatic turn", async ({
  page,
}) => {
  await page.goto(chapterPath);
  await page.getByRole("button", { name: "Book view" }).click();
  await page.addStyleTag({
    content:
      ".book-mode-turn-leaf-forward,.book-mode-turn-front," +
      ".book-mode-turn-back{animation-duration:2s!important}",
  });
  await page
    .getByRole("button", { name: "Next screen page", exact: true })
    .evaluate((button) => (button as HTMLButtonElement).click());
  await expect(page.locator(".book-mode-turn-leaf")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.waitForTimeout(2200);

  await expect(page).toHaveURL(/\/chapters\/introduction\/$/);
});

test("browser Back cancels an in-flight page turn", async ({ page }) => {
  await page.goto(chapterPath);
  await page.getByRole("button", { name: "Book view" }).click();
  await page
    .getByRole("button", { name: "Next screen page", exact: true })
    .click();
  await expect(page.locator(".book-mode-counter")).toHaveText("Screen 1 / 7");
  await page.addStyleTag({
    content:
      ".book-mode-turn-leaf-forward,.book-mode-turn-surface{" +
      "animation-duration:2s!important}",
  });
  await page
    .getByRole("button", { name: "Next screen page", exact: true })
    .evaluate((button) => (button as HTMLButtonElement).click());
  await expect(page.locator(".book-mode-turn-leaf")).toBeVisible();

  await page.goBack();
  await expect(page.locator(".book-mode-counter")).toHaveText("Front cover");
  await expect(page).toHaveURL(/\?view=book$/);
  await page.waitForTimeout(2_200);
  await expect(page.locator(".book-mode-counter")).toHaveText("Front cover");
  await expect(page).toHaveURL(/\?view=book$/);
});

test("does not navigate after closing a committed pointer peel", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(chapterPath);
  await page.getByRole("button", { name: "Book view" }).click();
  await page
    .getByRole("button", { name: "Turn page forward" })
    .click();
  await expect(page.locator(".book-mode-counter")).toHaveText("Screen 1 / 14");
  const book = page.locator(".book-mode-book");
  const box = await book.boundingBox();
  if (!box) {
    throw new Error("Expected book mode bounds");
  }
  const cornerBox = await page.locator(".book-mode-corner").boundingBox();
  if (!cornerBox) {
    throw new Error("Expected page corner bounds");
  }
  const cornerY = cornerBox.y + cornerBox.height * 0.75;
  await page.mouse.move(
    cornerBox.x + cornerBox.width * 0.75,
    cornerY,
  );
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.2, cornerY, {
    steps: 5,
  });
  await page.mouse.up();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.waitForTimeout(500);

  await expect(page).toHaveURL(/\/chapters\/introduction\/#introduction$/);
});

test("restores book view through browser Back and Forward", async ({ page }) => {
  await page.goto(chapterPath);
  await page.getByRole("button", { name: "Book view" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page).toHaveURL(/\?view=book$/);

  await page
    .getByRole("button", { name: "Next screen page", exact: true })
    .click();
  await expect(page.locator(".book-mode-counter")).toHaveText("Screen 1 / 7");
  await expect(page).toHaveURL(/\?view=book#introduction$/);

  await page.goBack();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.locator(".book-mode-counter")).toHaveText("Front cover");
  await expect(page).toHaveURL(/\?view=book$/);

  await page.goBack();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page).toHaveURL(/\/chapters\/introduction\/$/);

  await page.goForward();
  await expect(
    page.getByRole("dialog", {
      name: "A Small Book About Ethical Technology",
    }),
  ).toBeVisible();
  await expect(page.locator(".book-mode-counter")).toHaveText("Front cover");
});

test("realigns a pending mobile turn when the viewport becomes a spread", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(chapterPath);
  await page.getByRole("button", { name: "Book view" }).click();
  const next = page.getByRole("button", {
    name: "Next screen page",
    exact: true,
  });

  await next.click();
  await expect(page.locator(".book-mode-counter")).toHaveText("Screen 1 / 14");
  const turn = next.click();
  await page.setViewportSize({ width: 1280, height: 800 });
  await turn;

  await expect(page.locator(".book-mode-counter")).toHaveText(
    "Screens 2–3 / 7",
  );
  await expect(page.locator(".book-mode-sheet")).toHaveCount(2);
});

test("removes the book-turn delay for reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(chapterPath);
  await page.getByRole("button", { name: "Book view" }).click();
  await page
    .getByRole("button", { name: "Next screen page", exact: true })
    .click();

  await expect(page.locator(".book-mode-counter")).toHaveText(
    "Screen 1 / 7",
    { timeout: 250 },
  );
  await expect(page.locator(".book-mode-turn-leaf")).toHaveCount(0);
});

test("opens and closes the pinned legacy page-turn viewer", async ({ page }) => {
  const runtimeErrors: string[] = [];
  page.on("pageerror", (error) => runtimeErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") {
      runtimeErrors.push(message.text());
    }
  });
  page.on("response", (response) => {
    if (response.status() >= 400) {
      runtimeErrors.push(`${response.status()} ${response.url()}`);
    }
  });
  await page.goto(route("/legacy/"));
  const open = page.getByRole("button", { name: "Open legacy book viewer" });
  await open.click();

  await expect(
    page.getByRole("dialog", { name: "What Is Ethical AI? — page view" }),
  ).toBeVisible();
  await expect(page.locator(".rab-counter")).toHaveText("1 / 46");
  await expect(page.getByRole("status")).toHaveText("Legacy viewer open.");

  await page.getByRole("button", { name: "Close book view" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("status")).toHaveText("Legacy viewer closed.");
  await expect(open).toBeFocused();
  expect(runtimeErrors).toEqual([]);
});

test("loads both versions in the side-by-side comparison", async ({ page }) => {
  await page.goto(route("/compare/"));

  const legacy = page.frameLocator('iframe[title="Legacy fixed-page reader"]');
  const semantic = page.frameLocator('iframe[title="V2 semantic reader"]');
  await expect(
    legacy.getByRole("dialog", { name: "What Is Ethical AI? — page view" }),
  ).toBeVisible();
  await expect(
    semantic.getByRole("dialog", {
      name: "What Is Ethical AI?",
    }),
  ).toBeVisible();
  await expect(semantic.locator(".book-mode-counter")).toHaveText(
    "Front cover",
  );
});
