import { expect, test, type Locator, type Page } from "@playwright/test";
import { LIBRARY_BOOKS } from "../../apps/demo/src/library-catalog.js";

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
const flowingChapterBookIds = [
  "agentic-behavior-observatory",
  "ai-research-assistant",
  "cerai",
  "vango",
];
const worksCitedBookIds = LIBRARY_BOOKS.filter(
  ({ id }) => id !== "plurality" && id !== "cyber-dictionary",
).map(({ id }) => id);

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

async function advanceBookToContent(
  page: Page,
  expectedCounter: string,
): Promise<void> {
  const counter = page.locator(".book-mode-counter");
  for (let index = 0; index < 30; index += 1) {
    if ((await counter.textContent()) === expectedCounter) {
      return;
    }
    await advanceBookPage(page);
  }
  throw new Error(`Book did not reach ${expectedCounter}`);
}

async function advanceBookPage(page: Page): Promise<string> {
  const counter = page.locator(".book-mode-counter");
  const before = await counter.textContent();
  await page.getByRole("button", { name: "Next screen page" }).click();
  await expect.poll(() => counter.textContent()).not.toBe(before);
  await expect(counter).not.toHaveText("Turning page");
  return (await counter.textContent()) ?? "";
}

async function selectLeadingText(
  page: Page,
  locator: Locator,
  maximumCharacters = 52,
): Promise<string> {
  return locator.evaluate((node, maximum) => {
    const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
    const text = walker.nextNode();
    if (!(text instanceof Text) || text.data.trim().length < 8) {
      throw new Error("Expected selectable paragraph text");
    }
    const start = text.data.search(/\S/);
    const end = Math.min(text.data.length, start + maximum);
    const range = document.createRange();
    range.setStart(text, start);
    range.setEnd(text, end);
    const selection = document.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    document.dispatchEvent(new Event("selectionchange"));
    return selection?.toString().trim() ?? "";
  }, maximumCharacters);
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
  page.getByRole("link", { name: "Open V3 geometry prototype" }),
  ).toHaveAttribute("href", "./v3/");
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
    page.getByRole("row", { name: /Bounded chapter-window loading V3 implemented/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("row", { name: /Durable V3 reading location V3 implemented/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("row", { name: /Local comments and annotations V3 beta/ }),
  ).toBeVisible();
  await expect(page.getByText("~99.6%")).toBeVisible();
  await expect(
    page.getByRole("link", { name: /Read What Is Ethical AI/ }),
  ).toHaveAttribute(
    "href",
    "../book/what-is-ethical-ai/2026-07/chapters/executive-summary/?view=book",
  );
  await expect(
  page.getByRole("link", { name: /Review the isolated V3 fold/ }),
  ).toHaveAttribute("href", "../v3/");
});

test("renders isolated V3 geometry with real semantic page faces", async ({
  page,
}) => {
  test.setTimeout(60_000);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(route("/v3/"));

  await expect(page.locator(".v3-header")).toHaveCount(0);
  await expect(page.locator(".v3-review-note")).toHaveCount(0);
  await expect(page.locator(".v3-reader-toolbar")).toBeVisible();
  const reader = page.locator("[data-v3-reader]");
  await expect(reader).toHaveAttribute("data-v3-ready", "true");
  await expect(reader).toHaveAttribute("data-v3-opening", "false");
  await expect(reader).toHaveAttribute("data-v3-chapter-count", "17");
  await expect
    .poll(() =>
      reader
        .getAttribute("data-v3-loaded-chapters")
        .then((value) => Number(value)),
    )
    .toBeLessThanOrEqual(2);
  await expect(page.locator("[data-v3-status]")).toContainText(
    "/17 chapters loaded",
  );
  await expect(page.locator("[data-v3-stationary] .v3-sheet")).toHaveCount(2);
  await expect(page.locator("[data-v3-counter]")).toHaveText(/Spread 1 of/);
  await expect(page.locator("[data-v3-stationary]")).toContainText(
  "What Is Ethical AI?",
  );
  await expect(page.locator(".book-mode-overlay")).toHaveCount(0);

  const spread = page.locator("[data-v3-spread]");
  const bounds = await spread.boundingBox();
  const corner = page.getByRole("button", {
  name: "Turn the next page from its top corner",
  });
  const cornerBounds = await corner.boundingBox();
  if (!bounds || !cornerBounds) {
  throw new Error("Expected V3 spread and corner bounds");
  }

  const startX = cornerBounds.x + cornerBounds.width * 0.75;
  const startY = cornerBounds.y + cornerBounds.height * 0.25;
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(
  bounds.x + bounds.width * 0.27,
  bounds.y + bounds.height * 0.18,
  { steps: 12 },
  );

  const moving = page.locator(".v3-turn-surface");
  const revealed = page.locator(".v3-revealed-page");
  await expect(moving).toBeVisible();
  await expect(revealed).toBeVisible();
  await expect(moving).toContainText("The question");
  await expect(revealed).toContainText("Executive Summary");
  await expect(moving).toHaveAttribute("aria-hidden", "true");
  await expect(revealed).toHaveAttribute("aria-hidden", "true");
  const opaqueTurn = await moving.evaluate((node) => {
    const sheet = node.querySelector(".v3-sheet");
    const backing = node.querySelector(".v3-paper-occluder");
    const surface = getComputedStyle(node);
    const backingStyle = backing ? getComputedStyle(backing) : undefined;
    const paper = sheet ? getComputedStyle(sheet) : undefined;
    return {
      surfaceColor: surface.backgroundColor,
      surfaceOpacity: surface.opacity,
      backingColor: backingStyle?.backgroundColor,
      backingOpacity: backingStyle?.opacity,
      backingInset: backingStyle?.inset,
      paperColor: paper?.backgroundColor,
      paperOpacity: paper?.opacity,
    };
  });
  expect(opaqueTurn).toMatchObject({
    surfaceColor: "rgb(255, 253, 248)",
    surfaceOpacity: "1",
    backingColor: "rgb(255, 253, 248)",
    backingOpacity: "1",
    backingInset: "-1px",
    paperColor: "rgb(255, 253, 248)",
    paperOpacity: "1",
  });
  expect(
  await moving.evaluate((node) => getComputedStyle(node).clipPath),
  ).toMatch(/^polygon\(/);
  expect(
  await revealed.evaluate((node) => getComputedStyle(node).clipPath),
  ).toMatch(/^polygon\(/);
  await expect(page.locator(".v3-turn-layer [id]")).toHaveCount(0);

  await page.mouse.up();
  await expect(page.locator(".v3-turn-surface")).toHaveCount(0);
  await expect(page.locator("[data-v3-counter]")).toHaveText(/Spread 2 of/);
  await expect(page.locator("[data-v3-stationary]")).toContainText(
  "Executive Summary",
  );
  const dropCap = await page
  .locator(
    "[data-v3-stationary] .v3-sheet-chapter-opening h1 + p",
  )
  .evaluate((paragraph) =>
    getComputedStyle(paragraph, "::first-letter").float,
  );
  expect(dropCap).toBe("left");

  const backwardCorner = page.getByRole("button", {
  name: "Turn the previous page from its top corner",
  });
  const backwardCornerBounds = await backwardCorner.boundingBox();
  if (!backwardCornerBounds) {
  throw new Error("Expected V3 backward corner bounds");
  }
  await page.mouse.move(
  backwardCornerBounds.x + backwardCornerBounds.width * 0.25,
  backwardCornerBounds.y + backwardCornerBounds.height * 0.25,
  );
  await page.mouse.down();
  await page.mouse.move(
  bounds.x + bounds.width * 0.39,
  bounds.y + bounds.height * 0.18,
  { steps: 6 },
  );
  await expect(page.locator(".v3-turn-surface")).toContainText(
  "What Is Ethical AI?",
  );
  await expect(page.locator(".v3-revealed-page")).toContainText(
  "Publication record",
  );
  await page.mouse.up();
  await expect(page.locator(".v3-turn-surface")).toHaveCount(0);
  await expect(page.locator("[data-v3-counter]")).toHaveText(/Spread 1 of/);
});

test("shows only the book shell and returns to the referring page", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(route("/shelf/"));
  const shelfUrl = page.url();
  await page.goto(route("/v3/?book=vango"), { referer: shelfUrl });

  const reader = page.locator("[data-v3-reader]");
  await expect(reader).toHaveAttribute("data-v3-ready", "true");
  await expect(page.locator(".v3-header")).toHaveCount(0);
  await expect(page.locator(".v3-review-note")).toHaveCount(0);
  await expect(
    page.getByText("Geometry with bounded reading state"),
  ).toHaveCount(0);

  const toolbar = page.locator(".v3-reader-toolbar");
  await expect(toolbar).toBeVisible();
  const toolbarRows = await toolbar.evaluate(
    (node) => getComputedStyle(node).gridTemplateRows,
  );
  expect(toolbarRows.trim().split(/\s+/)).toHaveLength(1);
  expect(
    await toolbar.evaluate((node) => node.getBoundingClientRect().height),
  ).toBeLessThanOrEqual(56);
  for (const liveRegion of [
    page.locator("[data-v3-status]"),
    page.locator("[data-v3-share-status]"),
  ]) {
    await expect(liveRegion).toHaveClass(/v3-visually-hidden/);
    expect(
      await liveRegion.evaluate((node) => ({
        width: node.getBoundingClientRect().width,
        height: node.getBoundingClientRect().height,
        clipPath: getComputedStyle(node).clipPath,
      })),
    ).toEqual({
      width: 1,
      height: 1,
      clipPath: "inset(50%)",
    });
  }

  const back = page.getByRole("link", { name: "Back" });
  await expect(back).toHaveAttribute("data-v3-back-mode", "referrer");
  await expect(back).toHaveAttribute("href", shelfUrl);
  await back.click();
  await expect(page).toHaveURL(shelfUrl);
});

test("uses the library as the direct-entry back destination", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 320, height: 844 });
  await page.goto(route("/v3/?book=vango"));
  await expect(page.locator("[data-v3-reader]")).toHaveAttribute(
    "data-v3-ready",
    "true",
  );
  const toolbar = page.getByRole("toolbar", { name: "Reading controls" });
  await expect(toolbar).toBeVisible();
  const toolbarLayout = await toolbar.evaluate((node) => {
    const back = node.querySelector("[data-v3-back]")?.getBoundingClientRect();
    const explore = node
      .querySelector("[data-v3-explore]")
      ?.getBoundingClientRect();
    const counter = node
      .querySelector("[data-v3-counter]")
      ?.getBoundingClientRect();
    const font = node
      .querySelector(".v3-font-controls")
      ?.getBoundingClientRect();
    const share = node.querySelector("[data-v3-share]")?.getBoundingClientRect();
    const chapter = node
      .querySelector(".v3-chapter-picker")
      ?.getBoundingClientRect();
    return {
      rows: getComputedStyle(node).gridTemplateRows.trim().split(/\s+/).length,
      height: node.getBoundingClientRect().height,
      firstRowCenters: [back, explore, counter].map((bounds) =>
        bounds ? bounds.top + bounds.height / 2 : undefined,
      ),
      thirdRowCenters: [font, share].map((bounds) =>
        bounds ? bounds.top + bounds.height / 2 : undefined,
      ),
      chapterTop: chapter?.top,
      chapterBottom: chapter?.bottom,
      thirdRowTop: Math.min(
        font?.top ?? Number.POSITIVE_INFINITY,
        share?.top ?? Number.POSITIVE_INFINITY,
      ),
      overflow:
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    };
  });
  expect(toolbarLayout.rows).toBe(3);
  expect(toolbarLayout.height).toBeLessThanOrEqual(132);
  const rowCenters = toolbarLayout.firstRowCenters.filter(
    (value): value is number => value !== undefined,
  );
  expect(
    Math.max(...rowCenters) - Math.min(...rowCenters),
  ).toBeLessThanOrEqual(1);
  expect(toolbarLayout.chapterTop).toBeGreaterThan(
    toolbarLayout.firstRowCenters[0] ?? 0,
  );
  const thirdRowCenters = toolbarLayout.thirdRowCenters.filter(
    (value): value is number => value !== undefined,
  );
  expect(
    Math.max(...thirdRowCenters) - Math.min(...thirdRowCenters),
  ).toBeLessThanOrEqual(1);
  expect(toolbarLayout.thirdRowTop).toBeGreaterThanOrEqual(
    toolbarLayout.chapterBottom ?? 0,
  );
  expect(toolbarLayout.overflow).toBeLessThanOrEqual(1);
  await expect(
    page.getByRole("button", { name: "Share location" }),
  ).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "Page navigation" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Next spread" })).toBeVisible();
  const back = page.getByRole("link", { name: "Library" });
  await expect(back).toHaveAttribute("data-v3-back-mode", "library");
  await expect(back).toHaveAttribute("href", /\/shelf\/$/);
});

test("uses clean opening focus and compact mobile running heads", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(
    route(
      "/v3/?book=what-is-ethical-ai&chapter=responsible-ai#responsible-ai",
    ),
  );
  const heading = page.getByRole("heading", {
    level: 1,
    name: "The Rise of Responsible AI",
  });
  await expect(heading).toBeFocused();
  const focusStyle = await heading.evaluate((node) => {
    const style = getComputedStyle(node);
    return { outline: style.outlineStyle, shadow: style.boxShadow };
  });
  expect(focusStyle.outline).toBe("none");
  expect(focusStyle.shadow).not.toBe("none");

  await page.setViewportSize({ width: 320, height: 844 });
  await page.goto(
    route(
      "/v3/?book=plurality&chapter=2-0#2-0",
    ),
  );
  const mobileHeading = page.getByRole("heading", {
    level: 1,
    name: "Information Technology and Democracy: a Widening Gulf",
  });
  await expect(mobileHeading).toBeVisible();
  const openingSheet = mobileHeading.locator("xpath=ancestor::article[1]");
  await expect(openingSheet.locator(".v3-sheet-running")).toHaveCSS(
    "display",
    "none",
  );
  const overlap = await openingSheet.evaluate((sheet) => {
    const label = sheet.querySelector(".v3-chapter-opening-label");
    const title = sheet.querySelector("h1");
    if (!label || !title) {
      throw new Error("Expected a mobile chapter label and title");
    }
    const labelBox = label.getBoundingClientRect();
    const titleBox = title.getBoundingClientRect();
    return labelBox.bottom - titleBox.top;
  });
  expect(overlap).toBeLessThanOrEqual(0);
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    ),
  ).toBeLessThanOrEqual(1);
});

test("shows V1, V2, and V3 in the comparison view", async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto(route("/compare/"));

  await expect(page.locator(".compare-panel")).toHaveCount(3);
  await expect(
  page.getByTitle("Legacy fixed-page reader"),
  ).toHaveAttribute("src", "../legacy/?view=book");
  await expect(page.getByTitle("V2 semantic reader")).toHaveAttribute(
  "src",
  "../book/what-is-ethical-ai/2026-07/chapters/executive-summary/?view=book",
  );
  await expect(
  page.getByTitle("V3 semantic geometry prototype"),
  ).toHaveAttribute("src", "../v3/?embed=1");
  const v3 = page.frameLocator('iframe[title="V3 semantic geometry prototype"]');
  await expect(v3.locator("[data-v3-reader]")).toHaveAttribute(
  "data-v3-ready",
  "true",
  );
  await expect(v3.locator("[data-v3-status]")).toContainText(
  "Geometry ready",
  );
});

test("repaginates V3 semantic pages for a narrow review viewport", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(route("/v3/?embed=1"));

  await expect(page.locator("[data-v3-reader]")).toHaveAttribute(
  "data-v3-ready",
  "true",
  );
  await expect(page.locator("[data-v3-reader]")).toHaveAttribute(
  "data-v3-opening",
  "false",
  );
  const wideCount = await page
  .locator("[data-v3-status]")
  .textContent();
  await page.setViewportSize({ width: 320, height: 844 });
  await expect(page.locator("[data-v3-status]")).toContainText(
  "Geometry ready",
  );
  await expect
  .poll(() => page.locator("[data-v3-status]").textContent())
  .not.toBe(wideCount);
  await expect(page.locator("[data-v3-reader]")).toHaveAttribute(
  "data-v3-ready",
  "true",
  );
  const fit = await page
  .locator("[data-v3-stationary] .v3-sheet-content")
  .evaluateAll((nodes) =>
    nodes.every(
      (node) => node.scrollHeight <= node.clientHeight + 1,
    ),
  );
  expect(fit).toBe(true);
  await expect(page.locator("[data-v3-counter]")).toHaveText(/Page 1 of/);
  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);

  const spread = page.locator("[data-v3-spread]");
  const bounds = await spread.boundingBox();
  const corner = page.getByRole("button", {
    name: "Turn the next page from its top corner",
  });
  const cornerBounds = await corner.boundingBox();
  if (!bounds || !cornerBounds) {
    throw new Error("Expected V3 phone turn bounds");
  }
  await page.mouse.move(
    cornerBounds.x + cornerBounds.width * 0.75,
    cornerBounds.y + cornerBounds.height * 0.25,
  );
  await page.mouse.down();
  const initialProgress = Number(
    await page
      .locator(".v3-turn-surface")
      .getAttribute("data-v3-progress"),
  );
  expect(initialProgress).toBeLessThan(0.1);
  await page.mouse.move(
    bounds.x + bounds.width * 0.2,
    bounds.y + bounds.height * 0.18,
    { steps: 6 },
  );
  await expect(page.locator(".v3-turn-surface")).toContainText(
    "Publication record",
  );
  await expect(page.locator(".v3-revealed-page")).toContainText(
    "What Is Ethical AI?",
  );
  await page.mouse.up();
  await expect(page.locator("[data-v3-counter]")).toHaveText(/Page 2 of/);

  await page.emulateMedia({ reducedMotion: "reduce" });
  for (let index = 0; index < 5; index += 1) {
    await page.getByRole("button", { name: "Next spread" }).click();
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await expect(page.locator("[data-v3-reader]")).toHaveAttribute(
    "data-v3-ready",
    "true",
  );
  await expect(page.locator("[data-v3-counter]")).toHaveText(
    / · Spread \d+ of \d+$/,
  );
});

test("turns backward with distinct current and destination phone faces", async ({
  page,
}) => {
  test.setTimeout(60_000);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(route("/v3/?embed=1"));
  const reader = page.locator("[data-v3-reader]");
  await expect(reader).toHaveAttribute("data-v3-opening", "false");

  await page.getByRole("button", { name: "Next spread" }).click();
  await expect(page.locator("[data-v3-counter]")).toHaveText(/Page 2 of/);
  const spread = page.locator("[data-v3-spread]");
  const bounds = await spread.boundingBox();
  const corner = page.getByRole("button", {
    name: "Turn the previous page from its top corner",
  });
  const cornerBounds = await corner.boundingBox();
  if (!bounds || !cornerBounds) {
    throw new Error("Expected V3 backward phone turn bounds");
  }
  await page.mouse.move(
    cornerBounds.x + cornerBounds.width * 0.25,
    cornerBounds.y + cornerBounds.height * 0.25,
  );
  await page.mouse.down();
  const initialProgress = Number(
    await page
      .locator(".v3-turn-surface")
      .getAttribute("data-v3-progress"),
  );
  expect(initialProgress).toBeLessThan(0.1);
  await page.mouse.move(
    bounds.x + bounds.width * 0.8,
    bounds.y + bounds.height * 0.18,
    { steps: 6 },
  );
  await expect(page.locator(".v3-turn-surface")).toContainText(
    "What Is Ethical AI?",
  );
  await expect(page.locator(".v3-turn-surface")).not.toContainText(
    "Publication record",
  );
  await expect(page.locator(".v3-revealed-page")).toContainText(
    "Publication record",
  );
  const progress = await page
    .locator(".v3-turn-surface")
    .evaluate((node) => getComputedStyle(node).clipPath);
  expect(progress).toMatch(/^polygon\(/);
  await page.mouse.up();
  await expect(page.locator("[data-v3-counter]")).toHaveText(/Page 1 of/);
});

test("traverses every page in the complete V3 Ethical AI edition", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(route("/v3/?embed=1"));
  await expect(page.locator("[data-v3-status]")).toContainText(
    "/17 chapters loaded",
  );

  const seen: string[] = [];
  const chapterHeadings = new Set<string>();
  const chapterLabels = new Set<string>();
  const next = page.getByRole("button", { name: "Next spread" });
  for (let index = 0; index < 100; index += 1) {
    const contents = page.locator(
      "[data-v3-stationary] .v3-sheet-content",
    );
    const fits = await contents.evaluateAll((nodes) =>
      nodes.every(
        (node) => node.scrollHeight <= node.clientHeight + 1,
      ),
    );
    expect(fits).toBe(true);
    const openings = await page
      .locator(
        "[data-v3-stationary] .v3-sheet-chapter-opening .v3-sheet-content h1",
      )
      .evaluateAll((headings) =>
        headings.map((heading) => ({
          text: heading.textContent?.trim() ?? "",
          label: heading.previousElementSibling?.textContent?.trim() ?? "",
          first:
            heading.previousElementSibling?.classList.contains(
              "v3-chapter-opening-label",
            ) ?? false,
        })),
      );
    for (const opening of openings) {
      expect(opening.first).toBe(true);
      chapterHeadings.add(opening.text);
      chapterLabels.add(opening.label);
    }
    seen.push((await contents.allTextContents()).join(" "));
    if (await next.isDisabled()) {
      if (
        (await page
          .locator("[data-v3-reader]")
          .getAttribute("data-v3-at-end")) === "true"
      ) {
        break;
      }
      await expect(next).toBeEnabled({ timeout: 15_000 });
    }
    const before = await page.locator("[data-v3-counter]").textContent();
    await next.click();
    await expect
      .poll(() => page.locator("[data-v3-counter]").textContent())
      .not.toBe(before);
  }

  await expect(next).toBeDisabled();
  await expect(page.locator("[data-v3-counter]")).toHaveText(
    /Spread \d+ of \d+/,
  );
  expect(seen.join(" ")).toContain("Works Cited");
  expect(seen.join(" ")).toContain("Disclaimer");
  expect(chapterHeadings.size).toBe(17);
  expect(chapterHeadings).toContain("Executive Summary");
  expect(chapterHeadings).toContain("Works Cited");
  expect(chapterLabels).toContain("Chapter 1");
  expect(chapterLabels).toContain("Chapter 17");
  expect(seen.join(" ")).toContain("34.7 percent");
  expect(seen.join(" ")).toContain("magnitude 7.0 earthquake");
  expect(seen.join(" ")).not.toContain("34. 7 percent");
});

test("does not decorate Works Cited markers in any CoLab book", async ({
  page,
}) => {
  test.setTimeout(600_000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 1440, height: 1000 });
  for (const book of LIBRARY_BOOKS.filter(({ id }) =>
    worksCitedBookIds.includes(id),
  )) {
    await page.goto(
      route(
        `/v3/?book=${encodeURIComponent(book.id)}&chapter=references&embed=1#references`,
      ),
    );
    await expect(
      page.locator("[data-v3-reader]"),
      `${book.title} should initialize its reference chapter`,
    ).toHaveAttribute("data-v3-ready", "true", { timeout: 120_000 });
    await expect(page.locator("[data-v3-reader]")).toHaveAttribute(
      "data-v3-loaded-chapters",
      "2",
      { timeout: 30_000 },
    );
    const opening = page.locator(
      '[data-v3-stationary] .v3-sheet-chapter-opening[data-v3-chapter-role="references"]',
    );
    await expect(
      opening.getByRole("heading", { level: 1, name: "Works Cited" }),
      `${book.title} should expose its Works Cited opening`,
    ).toBeVisible({ timeout: 30_000 });
    await expect(opening).toHaveAttribute(
      "data-v3-chapter-role",
      "references",
    );
    const firstEntry = opening
      .locator(
        '.v3-sheet-content > p[data-v3-leading-marker="reference"]',
      )
      .first();
    await expect(
      firstEntry,
      `${book.title} should mark its first bracketed citation`,
    ).toContainText(/^\[0?1\]/);
    const firstLetterFloat = await firstEntry.evaluate((paragraph) =>
      getComputedStyle(paragraph, "::first-letter").float,
    );
    expect(firstLetterFloat, `${book.title} should not use a citation drop cap`).toBe(
      "none",
    );
    const markerOnlyFloat = await firstEntry.evaluate((paragraph) => {
      paragraph
        .closest(".v3-sheet")
        ?.removeAttribute("data-v3-chapter-role");
      return getComputedStyle(paragraph, "::first-letter").float;
    });
    expect(
      markerOnlyFloat,
      `${book.title} should remain protected by its content marker`,
    ).toBe("none");
  }
});

test("loads configured Ethical AI figures only when a pop-out opens", async ({
  page,
}) => {
  test.setTimeout(90_000);
  const mediaResponses: string[] = [];
  page.on("response", (response) => {
    if (
      response.ok() &&
      response.url().includes("/media/what-is-ethical-ai/")
    ) {
      mediaResponses.push(response.url());
    }
  });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(
    route(
      "/v3/?book=what-is-ethical-ai&chapter=responsible-ai&embed=1&media=popout#responsible-ai",
    ),
  );

  const reader = page.locator("[data-v3-reader]");
  await expect(reader).toHaveAttribute("data-v3-ready", "true");
  await expect(reader).toHaveAttribute("data-v3-media-mode", "popout");
  const treatment = page.getByLabel("Image treatment");
  await expect(treatment).toHaveValue("popout");
  expect(mediaResponses).toEqual([]);

  const open = page.getByRole("button", {
    name: "Open Figure 4. Ten landmark resources for building an AI ethics framework.",
  });
  const next = page.getByRole("button", { name: "Next spread" });
  for (let index = 0; index < 8 && !(await open.isVisible()); index += 1) {
    const before = await page.locator("[data-v3-counter]").textContent();
    await next.click();
    await expect
      .poll(() => page.locator("[data-v3-counter]").textContent())
      .not.toBe(before);
  }
  await expect(open).toBeVisible();
  expect(mediaResponses).toEqual([]);

  await open.click();
  const dialog = page.getByRole("dialog", {
    name: "Figure 4. Ten landmark resources for building an AI ethics framework.",
  });
  await expect(dialog).toBeVisible();
  const image = page.locator("[data-v3-media-dialog-image]");
  await expect(image).toHaveAttribute(
    "alt",
    /Circular diagram of ten landmark resources/,
  );
  await expect
    .poll(() => image.evaluate((node) => (node as HTMLImageElement).naturalWidth))
    .toBe(1656);
  expect(new Set(mediaResponses).size).toBe(1);
  const counterBeforeDialogKey = await page
    .locator("[data-v3-counter]")
    .textContent();
  await image.click();
  await page.keyboard.press("ArrowRight");
  await expect(page.locator("[data-v3-counter]")).toHaveText(
    counterBeforeDialogKey ?? "",
  );
  await dialog.getByRole("button", { name: "Close figure" }).click();
  await expect(dialog).toBeHidden();
  await expect(open).toBeFocused();
  await expect(image).not.toHaveAttribute("src");

  await page.locator("[data-v3-chapter-select]").selectOption("colab");
  await expect(
    page.getByRole("heading", { level: 1, name: "The Ethical Tech CoLab" }),
  ).toBeVisible();
  await treatment.selectOption("off");
  await expect(reader).toHaveAttribute("data-v3-media-mode", "off");
  await expect(page).toHaveURL(/media=off/);
  await expect(page.locator("[data-v3-stationary] .v3-media-figure")).toHaveCount(
    0,
  );
  await page.goBack();
  await expect(reader).toHaveAttribute("data-v3-media-mode", "popout");
  await expect(treatment).toHaveValue("popout");
  await expect(page).toHaveURL(/chapter=responsible-ai.*media=popout/);
});

test("defers on-page Ethical AI figures until their page is reached", async ({
  page,
}) => {
  test.setTimeout(90_000);
  const mediaResponses: string[] = [];
  page.on("response", (response) => {
    if (
      response.ok() &&
      response.url().includes("/media/what-is-ethical-ai/")
    ) {
      mediaResponses.push(response.url());
    }
  });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(
    route(
      "/v3/?book=what-is-ethical-ai&chapter=responsible-ai&embed=1&media=on#responsible-ai",
    ),
  );

  const reader = page.locator("[data-v3-reader]");
  await expect(reader).toHaveAttribute("data-v3-ready", "true");
  await expect(reader).toHaveAttribute("data-v3-media-mode", "on");
  expect(mediaResponses).toEqual([]);

  const image = page.locator(
    '[data-v3-stationary] .v3-media-on img[alt^="Circular diagram"]',
  );
  const next = page.getByRole("button", { name: "Next spread" });
  for (let index = 0; index < 8 && !(await image.isVisible()); index += 1) {
    const before = await page.locator("[data-v3-counter]").textContent();
    await next.click();
    await expect
      .poll(() => page.locator("[data-v3-counter]").textContent())
      .not.toBe(before);
  }
  await expect(image).toBeVisible();
  await expect
    .poll(() => image.evaluate((node) => (node as HTMLImageElement).naturalWidth))
    .toBe(1656);
  expect(new Set(mediaResponses).size).toBe(1);
  await expect(page).toHaveURL(/#v3-media-ai-ethics-frameworks$/);
  await page
    .getByRole("button", { name: "Increase book text size" })
    .click();
  await expect(page.locator("[data-v3-font-status]")).toHaveText("110%");
  await expect(image).toBeVisible();
  await expect(page).toHaveURL(/#v3-media-ai-ethics-frameworks$/);
  await expect(
    page.locator("[data-v3-stationary] .v3-media-on figcaption"),
  ).toContainText("Ten landmark resources");
});

test("inserts Ethical AI figures after complete source blocks", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(
    route(
      "/v3/?book=what-is-ethical-ai&chapter=colab&embed=1&media=popout#colab",
    ),
  );

  const next = page.getByRole("button", { name: "Next spread" });
  const figure = page.locator(
    '[data-v3-stationary] [data-v3-media-id="colab-portfolio-maturity"]',
  );
  for (let index = 0; index < 10 && !(await figure.isVisible()); index += 1) {
    const before = await page.locator("[data-v3-counter]").textContent();
    await next.click();
    await expect
      .poll(() => page.locator("[data-v3-counter]").textContent())
      .not.toBe(before);
  }
  await expect(figure).toBeVisible();
  const continuationAfterFigure = await figure.evaluate((node) => {
    const anchor =
      "p-each-project-is-best-understood-through-three-le-e0fb4bfc09";
    let sibling = node.nextElementSibling;
    while (sibling) {
      if (
        sibling instanceof HTMLElement &&
        sibling.dataset.sourceAnchor === anchor
      ) {
        return sibling.textContent?.trim() ?? "";
      }
      sibling = sibling.nextElementSibling;
    }
    return "";
  });
  expect(continuationAfterFigure).toBe("");
});

test("opens hierarchical contents and builds search only on demand", async ({
  page,
}) => {
  test.setTimeout(120_000);
  const chapterResponses: string[] = [];
  page.on("response", (response) => {
    if (response.ok() && response.url().includes("/chapters/")) {
      chapterResponses.push(response.url());
    }
  });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(
    route(
      "/v3/?book=what-is-ethical-ai&chapter=executive-summary#executive-summary",
    ),
  );
  await expect(page.locator("[data-v3-reader]")).toHaveAttribute(
    "data-v3-loaded-chapters",
    "2",
  );
  const requestsBeforeExplore = chapterResponses.length;

  await page.getByRole("button", { name: "Explore" }).click();
  const dialog = page.getByRole("dialog", { name: "Explore this book" });
  await expect(dialog).toBeVisible();
  await expect(dialog.locator("[data-v3-contents] > ol > li")).toHaveCount(17);
  expect(
    await dialog.locator("[data-v3-contents] ol ol").count(),
  ).toBeGreaterThan(0);
  expect(chapterResponses.length).toBe(requestsBeforeExplore);

  await dialog.getByRole("searchbox", { name: "Search this book" }).fill(
    "technocolonialism",
  );
  await dialog.getByRole("button", { name: "Search", exact: true }).click();
  await expect(dialog.locator("[data-v3-search-status]")).toContainText(
    /result/,
    { timeout: 30_000 },
  );
  expect(chapterResponses.length).toBeGreaterThan(requestsBeforeExplore);
  const result = dialog.locator("[data-v3-search-results] button").first();
  await expect(result).toContainText(/humanitarian|technocolonialism/i);
  await result.click();
  await expect(dialog).toBeHidden();
  await expect(page).toHaveURL(/chapter=/);
  await expect(page.locator("[data-v3-stationary]")).toContainText(
    /technocolonialism/i,
  );
});

test("persists bookmarks and offers a visible resume restart", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(
    route("/v3/?book=vango&chapter=background#background"),
  );
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.locator("[data-v3-reader]")).toHaveAttribute(
    "data-v3-loaded-chapters",
    "3",
    { timeout: 30_000 },
  );
  await page.getByRole("button", { name: "Explore" }).click();
  const dialog = page.getByRole("dialog", { name: "Explore this book" });
  const bookmark = dialog.locator("[data-v3-bookmark-current]");
  await bookmark.click();
  await expect(bookmark).toHaveAttribute("aria-pressed", "true");
  await expect(bookmark).toHaveText("Remove current bookmark");
  await expect(dialog.locator("[data-v3-bookmark-list] > li")).toHaveCount(1);
  await dialog.getByRole("button", { name: "Close book tools" }).click();

  await page.goto(route("/v3/?book=vango"));
  const resume = page.locator("[data-v3-resume-notice]");
  await expect(resume).toBeVisible();
  await expect(resume).toContainText("Background and Rationale");
  await expect(
    page.getByRole("heading", { level: 1, name: "Background and Rationale" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Start from beginning" }).click();
  await expect(resume).toBeHidden();
  await expect(page.locator("[data-v3-counter]")).toContainText("Front matter");
  await expect(page).not.toHaveURL(/chapter=/);

  await page.getByRole("button", { name: "Explore" }).click();
  const saved = dialog.locator("[data-v3-bookmark-list] > li button").first();
  await expect(saved).toContainText("Background and Rationale");
  await saved.click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Background and Rationale" }),
  ).toBeVisible();
});

test("shares selected text and exports local-only annotations", async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.clear();
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: (data: ShareData) => {
        (
          globalThis as typeof globalThis & {
            __sharedV3Selection?: ShareData;
          }
        ).__sharedV3Selection = data;
        return Promise.resolve();
      },
    });
  });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(
    route(
      "/v3/?book=what-is-ethical-ai&chapter=power&media=off#power",
    ),
  );
  await expect(page.locator("[data-v3-reader]")).toHaveAttribute(
    "data-v3-loaded-chapters",
    "3",
  );
  const paragraph = page.locator(
    "[data-v3-stationary] .v3-sheet-left .v3-sheet-content p[data-source-anchor]",
  ).first();
  const selectedLocation = await paragraph.evaluate((node) => ({
    chapterId:
      node.closest<HTMLElement>(".v3-sheet")?.dataset.v3Chapter ?? "",
    anchor: (node as HTMLElement).dataset.sourceAnchor ?? "",
  }));
  const selected = await selectLeadingText(page, paragraph);
  expect(selected.length).toBeGreaterThan(10);
  await page
    .getByRole("button", { name: "Share selected text and location" })
    .click();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (
            globalThis as typeof globalThis & {
              __sharedV3Selection?: ShareData;
            }
          ).__sharedV3Selection?.text,
      ),
    )
    .toBe(selected);
  const sharedUrl = await page.evaluate(
    () =>
      (
        globalThis as typeof globalThis & {
          __sharedV3Selection?: ShareData;
        }
      ).__sharedV3Selection?.url ?? "",
  );
  const parsedSharedUrl = new URL(sharedUrl);
  expect(parsedSharedUrl.searchParams.get("chapter")).toBe(
    selectedLocation.chapterId,
  );
  expect(decodeURIComponent(parsedSharedUrl.hash.slice(1))).toBe(
    selectedLocation.anchor,
  );

  await selectLeadingText(page, paragraph);
  await page.getByRole("button", { name: "Explore" }).click();
  const dialog = page.getByRole("dialog", { name: "Explore this book" });
  await expect(dialog.getByText("Nothing is uploaded")).toBeVisible();
  await expect(dialog.locator("[data-v3-selection-preview]")).toContainText(
    selected,
  );
  await dialog
    .getByRole("textbox", { name: "Note on selected text" })
    .fill("Connect this passage to institutional accountability.");
  await dialog.getByRole("button", { name: "Save selected text" }).click();
  await expect(dialog.locator("[data-v3-annotation-list] > li")).toHaveCount(1);
  await dialog.getByRole("button", { name: "Close book tools" }).click();
  await expect(
    page.locator("[data-v3-stationary] .v3-annotated"),
  ).toHaveCount(1);

  await page.getByRole("button", { name: "Explore" }).click();
  const downloadPromise = page.waitForEvent("download");
  await dialog.getByRole("button", { name: "Export Markdown" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe(
    "what-is-ethical-ai-annotations.md",
  );
  const stream = await download.createReadStream();
  if (!stream) {
    throw new Error("Expected annotation export stream");
  }
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.from(chunk));
  }
  const markdown = Buffer.concat(chunks).toString("utf8");
  expect(markdown).toContain("local-only V3 reader");
  expect(markdown).toContain(selected);
  expect(markdown).toContain("institutional accountability");
  await dialog
    .getByRole("button", { name: "Delete private annotation" })
    .click();
  await expect(dialog.locator("[data-v3-annotation-list] > li")).toHaveCount(0);
  await page.goto(sharedUrl);
  await expect(page.locator("[data-v3-reader]")).toHaveAttribute(
    "data-v3-ready",
    "true",
  );
  await expect(page).toHaveURL(
    new RegExp(
      `chapter=${encodeURIComponent(selectedLocation.chapterId)}.*#${selectedLocation.anchor}$`,
    ),
  );
});

test("defaults chapters to right pages and lets short books flow", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(
    route("/v3/?book=vango&chapter=foreword&embed=1#foreword"),
  );

  const reader = page.locator("[data-v3-reader]");
  const foreword = page.getByRole("heading", {
    level: 1,
    name: "Foreword",
  });
  await expect(foreword).toBeVisible();
  await expect(reader).toHaveAttribute(
    "data-v3-loaded-chapter-ids",
    "foreword,executive-summary",
    { timeout: 15_000 },
  );
  const counter = page.locator("[data-v3-counter]");
  const before = await counter.textContent();
  await page.getByRole("button", { name: "Next spread" }).click();
  await expect.poll(() => counter.textContent()).not.toBe(before);
  const executiveSummary = page.getByRole("heading", {
    level: 1,
    name: "Executive Summary",
  });
  await expect(executiveSummary).toBeVisible();
  await expect(
    executiveSummary.locator("xpath=ancestor::article[1]"),
  ).toHaveClass(/v3-sheet-left/);
  await expect(
    page.locator("[data-v3-stationary] .v3-sheet-blank"),
  ).toHaveCount(0);

  await page.goto(
    route(
      "/v3/?book=ai-carbon-footprint&chapter=conclusion&embed=1#conclusion",
    ),
  );
  const conclusion = page.getByRole("heading", {
    level: 1,
    name: "Conclusion",
  });
  await expect(conclusion).toBeVisible();
  await expect(
    conclusion.locator("xpath=ancestor::article[1]"),
  ).toHaveClass(/v3-sheet-right/);
});

test("traverses every VANGO chapter without forced blank versos", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(route("/v3/?book=vango&embed=1"));

  const reader = page.locator("[data-v3-reader]");
  const seen = new Set<string>();
  const next = page.getByRole("button", { name: "Next spread" });
  for (let index = 0; index < 50; index += 1) {
    for (const heading of await page
      .locator(
        "[data-v3-stationary] .v3-sheet-chapter-opening .v3-sheet-content h1",
      )
      .allTextContents()) {
      seen.add(heading.trim());
    }
    if (
      (await reader.getAttribute("data-v3-at-end")) === "true"
    ) {
      break;
    }
    if (await next.isDisabled()) {
      await expect(next).toBeEnabled({ timeout: 15_000 });
    }
    const before = await page.locator("[data-v3-counter]").textContent();
    await next.click();
    await expect
      .poll(() => page.locator("[data-v3-counter]").textContent())
      .not.toBe(before);
  }

  expect(seen.size).toBe(15);
  expect(seen).toContain("Foreword");
  expect(seen).toContain("Background and Rationale");
  expect(seen).toContain("Works Cited");
  await expect(next).toBeDisabled();

  const previous = page.getByRole("button", { name: "Previous spread" });
  let previousChapterIndex = 14;
  for (let index = 0; index < 50; index += 1) {
    const selectedIndex = await page
      .locator("[data-v3-chapter-select]")
      .evaluate((select) => (select as HTMLSelectElement).selectedIndex - 1);
    expect(selectedIndex).toBeLessThanOrEqual(previousChapterIndex);
    previousChapterIndex = selectedIndex;
    await expect(
      page.locator("[data-v3-stationary] .v3-sheet-placeholder"),
    ).toHaveCount(0);
    if (await previous.isDisabled()) {
      break;
    }
    const before = await page.locator("[data-v3-counter]").textContent();
    await previous.click();
    await expect
      .poll(() => page.locator("[data-v3-counter]").textContent())
      .not.toBe(before);
  }
  await expect(previous).toBeDisabled();
  await expect(reader).toHaveAttribute("data-v3-page-index", "0");
});

test("loads and releases a bounded Plurality chapter window", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  const chapterResponses: string[] = [];
  page.on("response", (response) => {
    if (
      response.url().includes("/book/plurality/2026-07/chapters/") &&
      response.ok()
    ) {
      chapterResponses.push(response.url());
    }
  });
  await page.goto(route("/v3/?book=plurality&chapter=1&embed=1#1"));

  const reader = page.locator("[data-v3-reader]");
  await expect(reader).toHaveAttribute("data-v3-ready", "true");
  await expect
    .poll(async () =>
      Number(await reader.getAttribute("data-v3-loaded-chapters")),
    )
    .toBeLessThanOrEqual(2);
  await expect(reader).toHaveAttribute(
    "data-v3-loaded-chapter-ids",
    "1,2-0",
  );
  expect(new Set(chapterResponses).size).toBeLessThanOrEqual(2);

  await page.locator("[data-v3-chapter-select]").selectOption("6-4");
  await expect(
    page.getByRole("heading", { level: 1, name: "Environment" }),
  ).toBeVisible();
  await expect(reader).toHaveAttribute(
    "data-v3-loaded-chapter-ids",
    "6-3,6-4,6-5",
  );
  await expect
    .poll(async () =>
      Number(await reader.getAttribute("data-v3-loaded-chapters")),
    )
    .toBeLessThanOrEqual(3);
  expect(new Set(chapterResponses).size).toBeLessThanOrEqual(5);
  expect(Number(await reader.getAttribute("data-v3-note-links"))).toBeLessThan(
    586,
  );
  expect(
    Number(await reader.getAttribute("data-v3-figure-links")),
  ).toBeLessThan(37);
});

test("surfaces and retries a failed V3 chapter window", async ({ page }) => {
  let failedOnce = false;
  await page.route(
    "**/book/vango/2026-08/chapters/executive-summary/index.html",
    async (route) => {
      if (!failedOnce) {
        failedOnce = true;
        await route.abort("failed");
        return;
      }
      await route.continue();
    },
  );
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(
    route(
      "/v3/?book=vango&chapter=foreword&embed=1#foreword",
    ),
  );

  const reader = page.locator("[data-v3-reader]");
  await expect(page.locator("[data-v3-status]")).toContainText(
    "V3 could not load the chapter window",
  );
  await page.setViewportSize({ width: 1400, height: 980 });
  await expect(reader).toHaveAttribute("data-v3-opening", "false");
  await expect(reader).toHaveAttribute("data-v3-ready", "false");
  expect(failedOnce).toBe(true);

  await page.locator("[data-v3-chapter-select]").selectOption("");
  await page.locator("[data-v3-chapter-select]").selectOption("foreword");
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Foreword",
    }),
  ).toBeVisible();
  await expect(reader).toHaveAttribute("data-v3-ready", "true");
  await expect(reader).toHaveAttribute(
    "data-v3-loaded-chapter-ids",
    "foreword,executive-summary",
  );
  await expect(page.locator("[data-v3-status]")).toContainText(
    "Geometry ready",
  );
});

test("recovers when the initial V3 chapter request fails", async ({ page }) => {
  let failedOnce = false;
  await page.route(
    "**/book/plurality/2026-07/chapters/6-4/index.html",
    async (route) => {
      if (!failedOnce) {
        failedOnce = true;
        await route.abort("failed");
        return;
      }
      await route.continue();
    },
  );
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(route("/v3/?book=plurality&chapter=6-4&embed=1#6-4"));

  const reader = page.locator("[data-v3-reader]");
  await expect(page.locator("[data-v3-status]")).toContainText(
    "V3 could not initialize",
  );
  await expect(reader).toHaveAttribute("data-v3-ready", "false");
  await expect(reader).toHaveAttribute("data-v3-opening", "false");
  const retry = page.getByRole("button", { name: "Retry chapter" });
  await expect(retry).toBeVisible();
  await retry.click();

  await expect(
    page.getByRole("heading", { level: 1, name: "Environment" }),
  ).toBeVisible();
  await expect(reader).toHaveAttribute("data-v3-ready", "true");
  await expect(page.locator("[data-v3-status]")).toContainText(
    "Geometry ready",
  );
  await expect(page).toHaveURL(/chapter=6-4.*#6-4$/);
});

test("cancels an active turn before a chapter window rebuild", async ({
  page,
}) => {
  let releaseNeighbor: (() => void) | undefined;
  let markNeighborRequested: (() => void) | undefined;
  const neighborGate = new Promise<void>((resolve) => {
    releaseNeighbor = resolve;
  });
  const neighborRequested = new Promise<void>((resolve) => {
    markNeighborRequested = resolve;
  });
  await page.route(
    "**/book/plurality/2026-07/chapters/2-1/index.html",
    async (route) => {
      markNeighborRequested?.();
      await neighborGate;
      await route.continue();
    },
  );
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(route("/v3/?book=plurality&chapter=2-0&embed=1#2-0"));
  const reader = page.locator("[data-v3-reader]");
  await expect(reader).toHaveAttribute("data-v3-opening", "false");
  await neighborRequested;

  const spread = page.locator("[data-v3-spread]");
  const bounds = await spread.boundingBox();
  const corner = page.getByRole("button", {
    name: "Turn the next page from its top corner",
  });
  const cornerBounds = await corner.boundingBox();
  if (!bounds || !cornerBounds) {
    throw new Error("Expected V3 turn bounds");
  }
  await page.mouse.move(
    cornerBounds.x + cornerBounds.width * 0.75,
    cornerBounds.y + cornerBounds.height * 0.25,
  );
  await page.mouse.down();
  await page.mouse.move(
    bounds.x + bounds.width * 0.62,
    bounds.y + bounds.height * 0.2,
    { steps: 4 },
  );
  await expect(reader).toHaveAttribute("data-v3-turning", "true");
  releaseNeighbor?.();

  await expect(reader).toHaveAttribute(
    "data-v3-loaded-chapter-ids",
    "1,2-0,2-1",
  );
  await expect(reader).toHaveAttribute("data-v3-turning", "false");
  await page.mouse.up();
  const indices = await reader.evaluate((node) => ({
    index: Number(node.getAttribute("data-v3-page-index")),
    count: Number(node.getAttribute("data-v3-page-count")),
  }));
  expect(indices.index).toBeGreaterThanOrEqual(0);
  expect(indices.index).toBeLessThan(indices.count);
  await expect(page.locator("[data-v3-stationary] .v3-sheet")).toHaveCount(2);
  const before = await page.locator("[data-v3-counter]").textContent();
  await page.getByRole("button", { name: "Next spread" }).click();
  await expect
    .poll(() => page.locator("[data-v3-counter]").textContent())
    .not.toBe(before);
});

test("retries an explicit V3 location superseded by incidental prefetch", async ({
  page,
}) => {
  let releaseTarget: (() => void) | undefined;
  let markTargetRequested: (() => void) | undefined;
  let firstTargetRequest = true;
  const targetGate = new Promise<void>((resolve) => {
    releaseTarget = resolve;
  });
  const targetRequested = new Promise<void>((resolve) => {
    markTargetRequested = resolve;
  });
  await page.route(
    "**/book/plurality/2026-07/chapters/6-4/index.html",
    async (route) => {
      if (firstTargetRequest) {
        firstTargetRequest = false;
        markTargetRequested?.();
        await targetGate;
      }
      await route.continue();
    },
  );
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(route("/v3/?book=plurality&chapter=1&embed=1#1"));
  const reader = page.locator("[data-v3-reader]");
  await expect(reader).toHaveAttribute(
    "data-v3-loaded-chapter-ids",
    "1,2-0",
  );

  await page.locator("[data-v3-chapter-select]").selectOption("6-4");
  await targetRequested;
  await page.getByRole("button", { name: "Next spread" }).click();
  releaseTarget?.();

  await expect(
    page.getByRole("heading", { level: 1, name: "Environment" }),
  ).toBeVisible();
  await expect(reader).toHaveAttribute(
    "data-v3-loaded-chapter-ids",
    "6-3,6-4,6-5",
  );
  await expect(page).toHaveURL(/chapter=6-4.*#6-4$/);
});

test("restores durable V3 source locations and browser history", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  const anchor = "h-data-coalitions-for-environmental-action";
  await page.goto(
    route(
      `/v3/?book=plurality&chapter=6-4&embed=1#${encodeURIComponent(anchor)}`,
    ),
  );

  const target = page.getByRole("heading", {
    level: 3,
    name: "Data coalitions for environmental action",
  });
  await expect(target).toBeVisible();
  await expect(target).toBeFocused();
  await expect
    .poll(() => {
      const url = new URL(page.url());
      return {
        chapter: url.searchParams.get("chapter"),
        hash: decodeURIComponent(url.hash.slice(1)),
      };
    })
    .toEqual({ chapter: "6-4", hash: anchor });
  await expect
    .poll(() =>
      page.evaluate(() =>
        JSON.parse(
          localStorage.getItem(
            "ethical-tech-book-v3-location:plurality",
          ) ?? "null",
        ),
      ),
    )
    .toEqual({
      bookId: "plurality",
      editionId: "2026-07",
      chapterId: "6-4",
      anchor,
    });
  for (let index = 0; index < 3; index += 1) {
    await page
      .getByRole("button", { name: "Increase book text size" })
      .click();
  }
  await expect(page.locator("[data-v3-font-status]")).toHaveText("130%");
  await expect(target).toBeVisible();
  await expect(target).toBeFocused();
  await expect(page).toHaveURL(
    new RegExp(`chapter=6-4.*#${anchor}$`),
  );

  await page.goto(route("/v3/?book=plurality&embed=1"));
  await expect(target).toBeVisible();
  await expect(target).toBeFocused();
  await expect(page).toHaveURL(
    new RegExp(`chapter=6-4.*#${anchor}$`),
  );

  await page.locator("[data-v3-chapter-select]").selectOption("6-5");
  await expect(
    page.getByRole("heading", { level: 1, name: "Learning" }),
  ).toBeVisible();
  await expect(page).toHaveURL(/chapter=6-5.*#6-5$/);
  await page.goBack();
  await expect(target).toBeVisible();
  await expect(page).toHaveURL(
    new RegExp(`chapter=6-4.*#${anchor}$`),
  );
  await page.goForward();
  await expect(
    page.getByRole("heading", { level: 1, name: "Learning" }),
  ).toBeVisible();
  await expect(page).toHaveURL(/chapter=6-5.*#6-5$/);

  await page.goto(route("/v3/?book=plurality&chapter=1&embed=1#1"));
  await expect(
    page.getByRole("heading", { level: 1, name: "Seeing Plural" }),
  ).toBeVisible();
  await expect(page).toHaveURL(/chapter=1.*#1$/);
});

test("persists V3 typography without losing the semantic location", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(
    route(
      "/v3/?book=what-is-ethical-ai&chapter=executive-summary&embed=1#executive-summary",
    ),
  );
  const reader = page.locator("[data-v3-reader]");
  const content = page.locator(
    "[data-v3-stationary] .v3-sheet-chapter-opening .v3-sheet-content",
  );
  await expect(reader).toHaveAttribute("data-v3-ready", "true");
  await expect(content).toBeVisible();
  await expect(page.locator("[data-v3-font-status]")).toHaveText("100%");
  const initialSize = await content.evaluate((node) =>
    Number.parseFloat(getComputedStyle(node).fontSize),
  );
  for (let index = 0; index < 3; index += 1) {
    await page
      .getByRole("button", { name: "Increase book text size" })
      .click();
  }

  await expect(page.locator("[data-v3-font-status]")).toHaveText("130%");
  await expect(reader).toHaveAttribute("data-v3-font-size", "130");
  await expect(
    page.getByRole("button", { name: "Increase book text size" }),
  ).toBeDisabled();
  const adjustedSize = await content.evaluate((node) =>
    Number.parseFloat(getComputedStyle(node).fontSize),
  );
  expect(adjustedSize).toBeGreaterThan(initialSize);
  await expect(page).toHaveURL(
    /chapter=executive-summary.*#executive-summary$/,
  );
  await expect
    .poll(async () =>
      Number(await reader.getAttribute("data-v3-loaded-chapters")),
    )
    .toBeLessThanOrEqual(3);
  const fits = await page
    .locator("[data-v3-stationary] .v3-sheet-content")
    .evaluateAll((nodes) =>
      nodes.every((node) => node.scrollHeight <= node.clientHeight + 1),
    );
  expect(fits).toBe(true);

  await page.reload();
  await expect(page.locator("[data-v3-font-status]")).toHaveText("130%");
  await expect(reader).toHaveAttribute("data-v3-font-size", "130");
  await expect(
    page.getByRole("heading", { level: 1, name: "Executive Summary" }),
  ).toBeVisible();

  await page.goto(route("/v3/?book=plurality&chapter=1&embed=1#1"));
  await expect(page.locator("[data-v3-font-status]")).toHaveText("100%");
});

test("shares a canonical V3 chapter and source anchor", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: undefined,
    });
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: (url: string) => {
          (
            globalThis as typeof globalThis & {
              __copiedV3Location?: string;
            }
          ).__copiedV3Location = url;
          return Promise.resolve();
        },
      },
    });
  });
  await page.emulateMedia({ reducedMotion: "reduce" });
  const anchor = "h-data-coalitions-for-environmental-action";
  await page.goto(
    route(
      `/v3/?book=plurality&chapter=6-4&embed=1#${encodeURIComponent(anchor)}`,
    ),
  );
  await page.getByRole("button", { name: "Share location" }).click();
  await expect(page.locator("[data-v3-share-status]")).toHaveText(
    "Reading link copied",
  );
  const shared = await page.evaluate(
    () =>
      (
        globalThis as typeof globalThis & {
          __copiedV3Location?: string;
        }
      ).__copiedV3Location,
  );
  if (!shared) {
    throw new Error("Expected a copied V3 reading location");
  }
  const url = new URL(shared);
  expect(url.pathname).toMatch(/\/v3\/$/);
  expect(Array.from(url.searchParams.keys())).toEqual(["book", "chapter"]);
  expect(url.searchParams.get("book")).toBe("plurality");
  expect(url.searchParams.get("chapter")).toBe("6-4");
  expect(decodeURIComponent(url.hash.slice(1))).toBe(anchor);
});

test("renders the production library as optimized labeled bindings", async ({
  page,
}) => {
  expect(
    new Set(
      LIBRARY_BOOKS.filter(
        (book) => book.chaptersStartOnRight === false,
      ).map(({ id }) => id),
    ),
  ).toEqual(new Set(flowingChapterBookIds));
  await page.goto(route("/shelf/"));

  await expect(
    page.getByRole("heading", { level: 1, name: "Research, bound and shelved" }),
  ).toBeVisible();
  await expect(page.getByText("22 volumes")).toBeVisible();
  await expect(page.locator(".bookshelf-book")).toHaveCount(22);
  await expect(page.locator(".bookshelf-book-spine")).toHaveCount(22);
  await expect(page.locator("img")).toHaveCount(0);
  await expect(
    page.getByRole("heading", { level: 2, name: "Humanitarian Systems" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { level: 2, name: "Open Source Library" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "PLURALITY, 586 pages" }),
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
    name: /AI RESEARCH ASSISTANT: AI-Powered Research Questions, 10 pages/,
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
    selection.getByRole("link", { name: "Read V2 semantic edition" }),
  ).toHaveAttribute(
    "href",
    "../book/what-is-ethical-ai/2026-07/chapters/executive-summary/?view=book",
  );
  await expect(
    selection.getByRole("link", { name: "Read V3 geometry edition" }),
  ).toHaveAttribute("href", "../v3/?from=shelf");
  await expect(
    selection.getByRole("link", { name: "View designed pages" }),
  ).toHaveAttribute(
    "href",
    "../legacy/?book=what-is-ethical-ai&view=book",
  );
  await expect(
    selection.getByRole("link", { name: "Read V2 semantic edition" }),
  ).toBeFocused();
  await expect(
    page.getByRole("button", {
      name: /FORCED LABOR RISK: The Forced Labor Structural Risk Index/,
    }),
  ).toBeVisible();

  await thickBook.focus();
  await thickBook.press("ArrowRight");
  await expect(
    page.getByRole("button", {
      name: /AI CARBON FOOTPRINT: AI's Carbon Footprint, 18 pages/,
    }),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(selection).toBeHidden();
  await expect(thickBook).toHaveAttribute("aria-pressed", "false");

  await page
    .getByRole("button", { name: "PLURALITY, 586 pages" })
    .click();
  await expect(selection).toContainText(
    "586-page print edition · 30 semantic chapters · cloth binding",
  );
  await expect(
    selection.getByRole("link", { name: "Read V3 geometry edition" }),
  ).toHaveAttribute("href", "../v3/?book=plurality&from=shelf");
  await expect(
    selection.getByRole("link", { name: "Open the original flat reader" }),
  ).toHaveAttribute("href", "https://www.plurality.net/read/");
  await expect(
    selection.getByRole("link", { name: /designed pages/i }),
  ).toHaveCount(0);
});

test("initializes every shelf publication in V3", async ({ page }) => {
  test.setTimeout(600_000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 1280, height: 900 });

  for (const book of LIBRARY_BOOKS) {
    await page.goto(route(`/v3/?book=${encodeURIComponent(book.id)}&embed=1`));
    const reader = page.locator("[data-v3-reader]");
    await expect(
      reader,
      `${book.title} should initialize in V3`,
    ).toHaveAttribute("data-v3-ready", "true", { timeout: 120_000 });
    await expect(page.locator("[data-v3-status]")).toContainText(
      "Geometry ready",
    );
    expect(
      Number(await reader.getAttribute("data-v3-loaded-chapters")),
      `${book.title} should keep a bounded chapter window`,
    ).toBeLessThanOrEqual(3);
    await expect(page.locator("[data-v3-stationary] .v3-sheet")).toHaveCount(
      2,
    );
    const fits = await page
      .locator("[data-v3-stationary] .v3-sheet-content")
      .evaluateAll((nodes) =>
        nodes.every(
          (node) => node.scrollHeight <= node.clientHeight + 1,
        ),
      );
    expect(fits, `${book.title} front matter should fit`).toBe(true);
    await page.getByRole("button", { name: "Next spread" }).click();
    await expect(
      page.locator(
        "[data-v3-stationary] .v3-sheet-chapter-opening h1",
      ),
      `${book.title} should expose its first chapter opening`,
    ).toHaveCount(1);
    await expect(
      page.locator(
        "[data-v3-stationary] .v3-sheet-chapter-opening .v3-chapter-opening-label",
      ),
    ).toHaveText(/^Chapter(?:\s+\d+(?:-\d+)*)?$/);
  }
});

test("preserves representative rich structures in V3", async ({ page }) => {
  test.setTimeout(180_000);
  await page.emulateMedia({ reducedMotion: "reduce" });

  await page.goto(route("/v3/?book=ai-models-research&embed=1"));
  await expect(page.locator("[data-v3-reader]")).toHaveAttribute(
    "data-v3-ready",
    "true",
  );
  expect(
    Number(
      await page
        .locator("[data-v3-reader]")
        .getAttribute("data-v3-tables"),
    ),
  ).toBeGreaterThan(0);

  await page.goto(
    route("/v3/?book=ercf&chapter=seven-dimensions&embed=1"),
  );
  await expect(page.locator("[data-v3-reader]")).toHaveAttribute(
    "data-v3-ready",
    "true",
  );
  expect(
    Number(
      await page
        .locator("[data-v3-reader]")
        .getAttribute("data-v3-code-blocks"),
    ),
  ).toBeGreaterThan(0);

  await page.goto(route("/v3/?book=plurality&embed=1"));
  await expect(page.locator("[data-v3-reader]")).toHaveAttribute(
    "data-v3-ready",
    "true",
    { timeout: 120_000 },
  );
  await expect(page.locator("[data-v3-status]")).toContainText(
    "/30 chapters loaded",
  );
  const chapterSelect = page.getByRole("combobox", { name: "Chapter" });
  await expect(chapterSelect.locator("option")).toHaveCount(31);
  await chapterSelect.selectOption("6-4");
  await expect(
    page.getByRole("heading", { level: 1, name: "Environment" }),
  ).toBeVisible();
  await expect(page.locator(".v3-chapter-opening-label")).toHaveText(
    "Chapter 6-4",
  );
  expect(
    Number(
      await page
        .locator("[data-v3-reader]")
        .getAttribute("data-v3-note-links"),
    ),
  ).toBeGreaterThan(0);
  await chapterSelect.selectOption("2-2");
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "The Life of a Digital Democracy",
    }),
  ).toBeVisible();
  expect(
    Number(
      await page
        .locator("[data-v3-reader]")
        .getAttribute("data-v3-deep-headings"),
    ),
  ).toBeGreaterThan(0);
  await chapterSelect.selectOption("2-0");
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Information Technology and Democracy: a Widening Gulf",
    }),
  ).toBeVisible();
  expect(
    Number(
      await page
        .locator("[data-v3-reader]")
        .getAttribute("data-v3-figure-links"),
    ),
  ).toBeGreaterThan(0);
  await chapterSelect.selectOption("1");
  await expect(page.locator(".v3-chapter-opening-label")).toHaveText(
    "Chapter 1",
  );
  await expect(
    page.locator(".v3-sheet-chapter-opening h1"),
  ).toHaveText("Seeing Plural");
  const dropCap = await page
    .locator(".v3-sheet-chapter-opening hr + p")
    .evaluate((paragraph) =>
      getComputedStyle(paragraph, "::first-letter").float,
    );
  expect(dropCap).toBe("left");
  await page.getByRole("link", { name: "1", exact: true }).click();
  await expect(
    page.getByRole("heading", { level: 3, name: "Note 1" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { level: 3, name: "Note 1" }),
  ).toBeFocused();
  const backToText = page.getByRole("link", { name: "Back to text" });
  await expect(backToText).toBeVisible();
  await backToText.click();
  await expect(page.locator("#note-ref-1-1")).toBeFocused();
});

test("keeps Plurality chapter links local and maps licensed figures", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  const figureResponses: string[] = [];
  page.on("response", (response) => {
    if (
      response.ok() &&
      response.url().includes(
        "/pluralitybook/plurality/86158859464aee75633acd854c656928121a7fd8/figs/",
      )
    ) {
      figureResponses.push(response.url());
    }
  });
  const policyAnchor =
    "p-the-principle-of-circular-investment-that-we-des-4cb5ed5d63";
  await page.goto(
    route(`/v3/?book=plurality&chapter=7-0#${policyAnchor}`),
  );
  const socialMarkets = page.getByRole("link", { name: "Social Markets" });
  await expect(socialMarkets).toHaveAttribute("href", "../5-7/");
  await socialMarkets.click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Social Markets" }),
  ).toBeVisible();
  await expect(page).toHaveURL(/chapter=5-7.*#5-7$/);

  await page.goto(
    route(
      "/v3/?book=plurality&chapter=2-2&media=popout#v3-media-plurality-2-2-b-polis",
    ),
  );
  const openFigure = page.getByRole("button", {
    name: /Open Figure 2-2-B/,
  });
  await expect(openFigure).toBeVisible();
  expect(figureResponses).toEqual([]);
  await openFigure.click();
  const dialogImage = page.locator("[data-v3-media-dialog-image]");
  await expect
    .poll(() =>
      dialogImage.evaluate((image) => (image as HTMLImageElement).naturalWidth),
    )
    .toBe(824);
  expect(new Set(figureResponses).size).toBe(1);
  await expect(
    page.locator("[data-v3-media-dialog-caption]"),
  ).toContainText("CC0");

  await page.goto(
    route(
      "/book/plurality/2026-07/chapters/2-0/",
    ),
  );
  const listItemCounts = await page
    .locator("[data-reader-content] > ul")
    .evaluateAll((lists) =>
      lists.map((list) => list.querySelectorAll(":scope > li").length),
    );
  expect(listItemCounts).toEqual([5, 4]);
});

test("pulls a shelf volume into the semantic reader", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(route("/shelf/"));
  await page
    .getByRole("button", { name: "What Is Ethical AI?, 46 pages" })
    .click();
  await page.getByRole("link", { name: "Read V2 semantic edition" }).click();

  await expect(page).toHaveURL(
    /\/book\/what-is-ethical-ai\/2026-07\/chapters\/executive-summary\/\?view=book$/,
  );
  await expect(
    page.getByRole("dialog", { name: "What Is Ethical AI?" }),
  ).toBeVisible();
});

test("opens the full V3 semantic book from the shelf", async ({ page }) => {
  test.setTimeout(60_000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(route("/shelf/"));
  await page
    .getByRole("button", { name: "What Is Ethical AI?, 46 pages" })
    .click();
  await page
    .getByRole("link", { name: "Read V3 geometry edition" })
    .click();

  await expect(page).toHaveURL(
    /\/v3\/\?from=shelf&book=what-is-ethical-ai$/,
  );
  await expect(page.locator("[data-v3-reader]")).toHaveAttribute(
    "data-v3-ready",
    "true",
  );
  await expect(page.locator("[data-v3-status]")).toContainText(
    "/17 chapters loaded",
  );
});

test("animates a selected binding into the V3 geometry reader", async ({
  page,
}) => {
  test.setTimeout(60_000);
  await page.goto(route("/shelf/"));
  await page
    .getByRole("button", { name: "What Is Ethical AI?, 46 pages" })
    .click();
  await page
    .getByRole("link", { name: "Read V3 geometry edition" })
    .evaluate((link) => (link as HTMLAnchorElement).click());

  await expect(page.locator(".bookshelf-book-flight")).toBeVisible();
  await expect(page.locator(".bookshelf-flight-cover")).toHaveCount(1);
  await expect(page.locator(".bookshelf-navigating")).toBeVisible();
  await expect(page).toHaveURL(
    /\/v3\/\?from=shelf&book=what-is-ethical-ai$/,
  );
  const reader = page.locator("[data-v3-reader]");
  await expect(reader).toHaveAttribute("data-v3-ready", "true");
  await expect(reader).toHaveAttribute("data-v3-opening", "true");
  await expect(page.locator("[data-v3-entry-cover]")).toBeVisible();
  await expect(reader).toHaveAttribute("data-v3-opening", "false");
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
  await advanceBookToContent(page, "Screen 1 / 99");
  await expect(page.locator(".book-mode-page-fan-edge")).toHaveCount(22);
  await expect(page.locator(".book-mode-overlay")).toHaveCSS(
    "--book-page-count",
    "46",
  );
});

test("recreates production front matter with linkable contents", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(productionChapterPath);
  await page.getByRole("button", { name: "Book view" }).click();
  await expect(page.locator('.book-mode-spread[aria-busy="false"]')).toBeVisible();

  await page.getByRole("button", { name: "Next screen page" }).click();
  await expect(page.locator(".book-mode-counter")).toHaveText(
    "Inside front cover · Title page",
  );
  await expect(
    page.getByRole("dialog").getByText("Publication record"),
  ).toBeVisible();
  await expect(page.locator(".book-mode-front-date")).toHaveText("July 2026");
  await expect(
    page.getByRole("dialog").getByText(
      /NYU School of Professional Studies Center for Global Affairs/,
    ),
  ).toBeVisible();

  await page.getByRole("button", { name: "Next screen page" }).click();
  await expect(page.locator(".book-mode-counter")).toHaveText(
    "About this publication · Contents 1",
  );
  const contentsNavigation = page
    .getByRole("dialog")
    .getByRole("navigation", { name: /Table of contents, part 1/ });
  await expect(contentsNavigation).toBeVisible();
  await expect(
    contentsNavigation.locator('[role="treeitem"][aria-level="2"]').first(),
  ).toBeVisible();
  await expect(
    page.getByRole("dialog").getByText(
      /What is ethics, and why did humanity invent it/,
    ),
  ).toBeVisible();
  const power = page
    .getByRole("dialog")
    .getByRole("link", { name: "Humanity's Relationship with Power" });
  await expect(power).toHaveAttribute("href", /\?view=book#power$/);
  await power.click();
  await expect(page).toHaveURL(/\/chapters\/power\/\?view=book#power$/);
  await expect(page.locator(".book-mode-counter")).toContainText("/ 99");
  const powerHeading =
    page
      .getByRole("dialog")
      .getByRole("heading", { name: "02. Humanity's Relationship with Power" });
  await expect(powerHeading).toBeVisible();
  await expect(powerHeading).toBeFocused();
});

test("keeps all mobile front matter and contents reachable", async ({ page }) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(productionChapterPath);
  await page.getByRole("button", { name: "Book view" }).click();
  await advanceBookPage(page);
  await expect(page.locator(".book-mode-counter")).toHaveText(
    "Inside front cover",
  );
  await expect(
    page.getByRole("dialog").getByText(/NYU School of Professional Studies/),
  ).toBeVisible();

  const links = new Set<string>();
  for (let index = 0; index < 20; index += 1) {
    const counter = await page.locator(".book-mode-counter").textContent();
    if (counter?.startsWith("Screen 1 /")) {
      break;
    }
    for (const label of await page.locator(".book-mode-toc-link").allTextContents()) {
      links.add(label.trim());
    }
    const visiblePagesFit = await page
      .locator(".book-mode-sheet:not(.book-mode-sheet-blank)")
      .evaluateAll((nodes) =>
        nodes.every((node) => node.scrollHeight - node.clientHeight <= 1),
      );
    expect(visiblePagesFit).toBe(true);
    await advanceBookPage(page);
  }
  expect(links).toContain("Executive Summary");
  expect(links).toContain("Conclusion");
  expect(links).toContain("Works Cited");
  await expect(page.locator(".book-mode-counter")).toHaveText(
    "Screen 1 / 221",
  );
});

test("focuses the exact subsection selected from contents", async ({ page }) => {
  await page.goto(productionChapterPath);
  await page.getByRole("button", { name: "Book view" }).click();
  await advanceBookPage(page);
  const ethicalRealism = page
    .getByRole("dialog")
    .getByRole("link", { name: "Ethical realism." });
  for (let index = 0; index < 6; index += 1) {
    if (await ethicalRealism.isVisible()) {
      break;
    }
    await advanceBookPage(page);
  }
  await ethicalRealism.click();

  await expect(page).toHaveURL(
    /\/chapters\/ethical-ir\/\?view=book#ethical-ir-ethical-realism-2$/,
  );
  const heading = page
    .getByRole("dialog")
    .getByRole("heading", { name: "Ethical realism." });
  await expect(heading).toBeVisible();
  await expect(heading).toBeFocused();
});

test("preserves the current front-matter passage across breakpoints", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(productionChapterPath);
  await page.getByRole("button", { name: "Book view" }).click();
  for (let index = 0; index < 4; index += 1) {
    await advanceBookPage(page);
  }
  await expect(page.locator(".book-mode-counter")).toHaveText(
    "About this publication 2",
  );
  const fragment = await page
    .locator(".book-mode-publication-thesis")
    .textContent()
    .then((text) => text?.trim().slice(0, 70) ?? "");

  await page.setViewportSize({ width: 1440, height: 1000 });
  await expect(page.locator(".book-mode-counter")).toContainText(
    "About this publication",
  );
  await expect(page.getByRole("dialog")).toContainText(fragment);
});

test("shows the source notes limitation and complete Works Cited path", async ({
  page,
}) => {
  await page.goto(productionChapterPath);
  await page.getByRole("button", { name: "Book view" }).click();
  const next = page.getByRole("button", { name: "Next screen page" });
  const notesStatus = page.getByRole("dialog").getByText(
    /canonical semantic source does not expose mapped footnote callouts/,
  );
  for (let index = 0; index < 10; index += 1) {
    if (await notesStatus.isVisible()) {
      break;
    }
    await next.click();
  }
  await expect(notesStatus).toBeVisible();
  await expect(
    page
      .getByRole("dialog")
      .getByRole("link", { name: "Open the complete Works Cited" }),
  ).toHaveAttribute("href", /\?view=book#references$/);
});

test("adjusts book font size and repaginates at the same source location", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(`${productionChapterPath}#executive-summary`);
  await page.getByRole("button", { name: "Book view" }).click();
  await expect(page.locator(".book-mode-counter")).toHaveText("Screen 1 / 99");
  const content = page
    .locator('.book-mode-sheet[data-book-page="1"] .book-mode-sheet-content');
  const initialSize = await content.evaluate((node) =>
    Number.parseFloat(getComputedStyle(node).fontSize),
  );

  await page
    .getByRole("button", { name: "Increase book text size" })
    .click();
  await page
    .getByRole("button", { name: "Increase book text size" })
    .click();
  await page
    .getByRole("button", { name: "Increase book text size" })
    .click();
  await expect(page.locator(".book-mode-font-status")).toHaveText("130%");
  await expect(page.locator(".book-mode-counter")).toContainText("/ ");
  const largerSize = await content.evaluate((node) =>
    Number.parseFloat(getComputedStyle(node).fontSize),
  );
  expect(largerSize).toBeGreaterThan(initialSize);
  await expect(page).toHaveURL(/#executive-summary$/);
  await expect
    .poll(() =>
      page
        .locator(".book-mode-sheet:not(.book-mode-sheet-blank)")
        .evaluateAll((nodes) =>
          nodes.every((node) => node.scrollHeight - node.clientHeight <= 1),
        ),
    )
    .toBe(true);
  await page.addStyleTag({
    content:
      ".book-mode-turn-leaf-forward,.book-mode-turn-surface," +
      ".book-mode-turn-front,.book-mode-turn-back{" +
      "animation-duration:2s!important}",
  });
  await page.getByRole("button", { name: "Next screen page" }).click();
  await expect(
    page.getByRole("button", { name: "Increase book text size" }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Decrease book text size" }),
  ).toBeDisabled();
  const turningFaceSize = await page
    .locator(".book-mode-turn-front .book-mode-sheet-content")
    .evaluate((node) => Number.parseFloat(getComputedStyle(node).fontSize));
  expect(turningFaceSize).toBeCloseTo(largerSize, 1);
  await page.locator(".book-mode-turn-leaf").waitFor({ state: "detached" });
  await page.getByRole("button", { name: "Close" }).click();
  await page.getByRole("button", { name: "Book view" }).click();
  await expect(page.locator(".book-mode-font-status")).toHaveText("130%");
  await page.getByRole("button", { name: "Close" }).click();
  await page.reload();
  await page.getByRole("button", { name: "Book view" }).click();
  await expect(page.locator(".book-mode-font-status")).toHaveText("130%");
});

test("applies text sizing to front matter and contents", async ({ page }) => {
  await page.goto(productionChapterPath);
  await page.getByRole("button", { name: "Book view" }).click();
  await advanceBookPage(page);
  const credits = page.locator(".book-mode-inner-credits");
  const initialSize = await credits.evaluate((node) =>
    Number.parseFloat(getComputedStyle(node).fontSize),
  );
  for (let index = 0; index < 3; index += 1) {
    await page
      .getByRole("button", { name: "Increase book text size" })
      .click();
  }
  await expect(page.locator(".book-mode-font-status")).toHaveText("130%");
  const adjustedSize = await credits.evaluate((node) =>
    Number.parseFloat(getComputedStyle(node).fontSize),
  );
  expect(adjustedSize).toBeGreaterThan(initialSize);
  const visiblePagesFit = await page
    .locator(".book-mode-sheet:not(.book-mode-sheet-blank)")
    .evaluateAll((nodes) =>
      nodes.every(
        (node) =>
          node.scrollHeight - node.clientHeight <= 1 ||
          node.hasAttribute("data-book-fit-scale"),
      ),
    );
  expect(visiblePagesFit).toBe(true);
});

test("scales an oversized atomic block instead of clipping it", async ({
  page,
}) => {
  await page.goto(`${chapterPath}#introduction`);
  await page.locator("[data-reader-content]").evaluate((article) => {
    const figure = document.createElement("figure");
    figure.id = "oversized-figure";
    figure.style.height = "1200px";
    figure.textContent = "Oversized semantic figure";
    article.querySelector("h1")?.after(figure);
  });
  await page.getByRole("button", { name: "Book view" }).click();
  const fitted = page.locator(".book-mode-sheet[data-book-fit-scale]").last();
  await expect(fitted).toBeAttached();
  const fit = await fitted.evaluate((sheet) => {
    const content = sheet.querySelector<HTMLElement>(
      ".book-mode-sheet-content",
    );
    if (!content) {
      throw new Error("Expected fitted page content");
    }
    return {
      scale: Number(sheet.dataset.bookFitScale),
      contentHeight: content.getBoundingClientRect().height,
      sheetHeight: sheet.getBoundingClientRect().height,
    };
  });
  expect(fit.scale).toBeLessThan(1);
  expect(fit.contentHeight).toBeLessThanOrEqual(fit.sheetHeight);
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
  await expect(dialog.locator('.book-mode-spread[aria-busy="false"]')).toBeVisible();
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
    await advanceBookToContent(page, viewport.counter);
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
    const bodyPages = page.locator(
      '.book-mode-sheet[data-book-page]:has(.book-mode-folio)',
    );
    const bottomClearance = await bodyPages.evaluateAll((nodes) =>
      nodes.map((node) => {
        const content = node.querySelector(".book-mode-sheet-content");
        const last = content?.lastElementChild;
        const folio = node.querySelector(".book-mode-folio");
        return last && folio
          ? folio.getBoundingClientRect().top -
              last.getBoundingClientRect().bottom
          : 0;
      }),
    );
    expect(bottomClearance.every((clearance) => clearance >= 12)).toBe(true);
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
  await advanceBookToContent(page, "Screen 1 / 99");

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

test("keeps pages readable in a short landscape viewport", async ({ page }) => {
  await page.setViewportSize({ width: 800, height: 400 });
  await page.goto(`${productionChapterPath}#executive-summary`);
  await page.getByRole("button", { name: "Book view" }).click();
  await expect(page.locator(".book-mode-counter")).toContainText("/ ");
  await expect(page.locator(".book-mode-overlay")).toHaveCSS(
    "overflow-y",
    "auto",
  );
  const fits = await page
    .locator(".book-mode-sheet:not(.book-mode-sheet-blank)")
    .evaluateAll((nodes) =>
      nodes.every((node) => node.scrollHeight - node.clientHeight <= 1),
    );
  expect(fits).toBe(true);
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
  await advanceBookToContent(page, "Screen 1 / 99");
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
  await advanceBookToContent(page, "Screen 1 / 221");
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

test("keeps unsupported RTL publications in semantic scroll view", async ({
  page,
}) => {
  await page.route("**/manifest.json", async (route) => {
    const response = await route.fetch();
    const manifest = (await response.json()) as Record<string, unknown>;
    manifest.direction = "rtl";
    await route.fulfill({ response, json: manifest });
  });
  await page.goto(chapterPath);
  const bookView = page.getByRole("button", { name: "Book view" });
  await expect(bookView).toBeDisabled();
  await expect(bookView).toHaveAttribute(
    "title",
    "Physical book mode is not yet available for right-to-left publications",
  );
  await expect(
    page.getByRole("heading", { level: 1, name: "Introduction" }),
  ).toBeVisible();
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
    await new Promise((resolve) => setTimeout(resolve, 2_000));
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
  await expect(
    page.getByRole("button", { name: "Next screen page" }),
  ).toBeEnabled();
  await expect(page).toHaveURL(/\?view=book$/);
  await expect(page.locator(".book-mode-counter")).toHaveText("Front cover");
  await expect(page.locator(".book-mode-cover")).toHaveCount(1);
  await expect(
    dialog.getByRole("heading", {
      level: 1,
      name: "A Small Book About Ethical Technology",
    }).last(),
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
  ).toContainText("A Small Book About Ethical Technology");
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
  await expect(page.locator(".book-mode-counter")).toHaveText(
    "Inside front cover · Title page",
  );
  await expect(page.locator(".book-mode-sheet")).toHaveCount(2);
  await expect(page.locator(".book-mode-page-fan-edge")).toHaveCount(10);
  await expect(
    page.locator(".book-mode-inner-cover"),
  ).toHaveCount(1);
  await expect(page.locator(".book-mode-sheet-right")).not.toHaveCSS(
    "transform",
    "none",
  );
  await expect(
    page
      .getByLabel(
        "A Small Book About Ethical Technology, Title page",
      )
      .getByRole("heading", {
        level: 1,
        name: "A Small Book About Ethical Technology",
      }),
  ).toBeVisible();
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
  ).toContainText("A Small Book About Ethical Technology");
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
  await expect(page.locator(".book-mode-counter")).toHaveText(
    "Inside front cover · Title page",
  );

  await page
    .getByRole("button", { name: "Next screen page", exact: true })
    .evaluate((button) => (button as HTMLButtonElement).click());
  const frontMatterLeaf = page.locator(".book-mode-turn-leaf-forward");
  await expect(frontMatterLeaf).toBeVisible();
  const frontMatterFaces = await turnLeafState(frontMatterLeaf);
  expect(frontMatterFaces.front).toContain(
    "A Small Book About Ethical Technology",
  );
  expect(frontMatterFaces.back).toContain("Contents");
  await expect(
    page.locator(".book-mode-spread > .book-mode-sheet-right"),
  ).toContainText("Introduction");
  await expect(frontMatterLeaf).toHaveCount(0, { timeout: 3000 });
  await expect(page.locator(".book-mode-counter")).toHaveText("Screen 1 / 7");
  const openingLink = dialog.getByRole("link", {
    name: "this opening section",
  });
  await expect(openingLink).toHaveAttribute(
    "href",
    "#book-mode-introduction-1-1",
  );

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

  await advanceBookToContent(page, "Screen 1 / 14");

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

});

test("keeps a dragged curl attached through distinct reveal phases", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(chapterPath);
  await page.getByRole("button", { name: "Book view" }).click();
  await advanceBookToContent(page, "Screen 1 / 14");
  const book = page.locator(".book-mode-book");
  const box = await book.boundingBox();
  if (!box) {
    throw new Error("Expected draggable book bounds");
  }
  const startX = box.x + box.width - 3;
  const startY = box.y + 24;
  await page.mouse.move(startX, startY);
  await page.mouse.down();

  const phases: Array<{
    progress: number;
    clipPath: string;
    tip: string;
    transformOriginX: number;
    frontOpacity: string;
    backOpacity: string;
    backTransform: string;
    frontText: string;
    backText: string;
  }> = [];
  for (const progress of [0.15, 0.35, 0.55, 0.8]) {
    await page.mouse.move(startX - box.width * progress * 0.5, startY, {
      steps: 3,
    });
    await page.waitForTimeout(50);
    const leaf = page.locator(".book-mode-turn-leaf-interactive");
    await expect(leaf).toBeVisible();
    phases.push(
      await leaf.evaluate((node, currentProgress) => {
        const surface = node.querySelector<HTMLElement>(
          ".book-mode-turn-surface",
        );
        const front = node.querySelector<HTMLElement>(".book-mode-turn-front");
        const back = node.querySelector<HTMLElement>(".book-mode-turn-back");
        if (!surface || !front || !back) {
          throw new Error("Expected complete turning leaf");
        }
        return {
          progress: currentProgress,
          clipPath: getComputedStyle(surface).clipPath,
          tip: node.style.getPropertyValue("--book-peel-tip-x"),
          transformOriginX: Number.parseFloat(
            getComputedStyle(node).transformOrigin,
          ),
          frontOpacity: getComputedStyle(front).opacity,
          backOpacity: getComputedStyle(back).opacity,
          backTransform: getComputedStyle(back).transform,
          frontText: front.textContent ?? "",
          backText: back.textContent ?? "",
        };
      }, progress),
    );
  }

  expect(new Set(phases.map(({ tip }) => tip)).size).toBe(4);
  expect(new Set(phases.map(({ clipPath }) => clipPath)).size).toBeGreaterThanOrEqual(
    3,
  );
  expect(phases.every(({ clipPath }) => clipPath.startsWith("polygon("))).toBe(
    true,
  );
  expect(phases[0]?.transformOriginX).toBe(0);
  expect(phases.at(-1)?.transformOriginX).toBeGreaterThan(0);
  expect(phases[0]?.frontOpacity).toBe("1");
  expect(phases[0]?.backOpacity).toBe("0");
  expect(phases.at(-1)?.frontOpacity).toBe("0");
  expect(phases.at(-1)?.backOpacity).toBe("1");
  expect(phases.at(-1)?.backTransform).toBe("none");
  expect(phases[0]?.frontText).not.toBe(phases[0]?.backText);
  await page.mouse.up();
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
  await advanceBookToContent(page, "Screen 1 / 14");
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
  await advanceBookToContent(page, "Screen 1 / 14");
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
  await advanceBookToContent(page, "Screen 1 / 7");
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
  await advanceBookToContent(page, "Screen 1 / 14");
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

  await advanceBookToContent(page, "Screen 1 / 7");
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

  await advanceBookToContent(page, "Screen 1 / 14");
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
  await advanceBookToContent(page, "Screen 1 / 7");
  await page
    .getByRole("button", { name: "Next screen page", exact: true })
    .click();

  await expect(page.locator(".book-mode-counter")).toHaveText(
    "Screens 2–3 / 7",
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
