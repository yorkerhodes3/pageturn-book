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
  await expect(
    page.getByRole("link", { name: "Open V2 book view" }),
  ).toHaveAttribute(
    "href",
    "./book/demo-book/2026-08/chapters/introduction/?view=book",
  );
  await expect(
    page.getByRole("link", { name: "Open semantic scroll view" }),
  ).toHaveAttribute(
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
  await page.addStyleTag({
    content:
      ".book-mode-turn-leaf-forward,.book-mode-turn-leaf-backward," +
      ".book-mode-turn-front,.book-mode-turn-back," +
      ".book-mode-turn-shadow,.book-mode-turn-fold{animation-duration:2s!important}",
  });

  const closedCoverBox = await page.locator(".book-mode-cover").boundingBox();
  if (!closedCoverBox) {
    throw new Error("Expected closed cover bounds");
  }
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
  await expect(coverLeaf).toHaveAttribute("inert", "");
  const turningCoverWidth = await coverLeaf.evaluate((node) =>
    Number.parseFloat(getComputedStyle(node).width),
  );
  const turningCoverLeft = await coverLeaf.evaluate((node) =>
    Number.parseFloat(getComputedStyle(node).left),
  );
  expect(Math.abs(turningCoverWidth - closedCoverBox.width)).toBeLessThan(2);
  expect(turningCoverLeft).toBeGreaterThan(closedCoverBox.width * 0.8);
  await expect(coverLeaf.locator(".book-mode-turn-front")).toContainText(
    "A Small Book About Ethical Technology",
  );
  await expect(coverLeaf.locator(".book-mode-turn-back")).not.toContainText(
    "Introduction",
  );
  await expect(
    page.locator(".book-mode-spread > .book-mode-sheet-right"),
  ).toContainText("Introduction");
  await expect(coverLeaf).toHaveCount(0, { timeout: 3000 });
  await expect(page.locator(".book-mode-counter")).toHaveText("Screen 1 / 7");
  await expect(page.locator(".book-mode-sheet")).toHaveCount(2);
  await expect(page.locator(".book-mode-page-fan-edge")).toHaveCount(14);
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
    .getByRole("button", { name: "Next screen page", exact: true })
    .evaluate((button) => (button as HTMLButtonElement).click());
  const firstPageLeaf = page.locator(".book-mode-turn-leaf-forward");
  await expect(firstPageLeaf).toBeVisible();
  await expect(firstPageLeaf.locator(".book-mode-turn-front")).toContainText(
    "Introduction",
  );
  await expect(firstPageLeaf.locator(".book-mode-turn-back")).toContainText(
    "Why semantic reading matters",
  );
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
  await expect(forwardLeaf.locator(".book-mode-turn-front")).toContainText(
    "What this first slice proves",
  );
  await expect(forwardLeaf.locator(".book-mode-turn-back")).toContainText(
    "Principles in Practice",
  );
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
  await expect(backwardLeaf.locator(".book-mode-turn-front")).toContainText(
    "Principles in Practice",
  );
  await expect(backwardLeaf.locator(".book-mode-turn-back")).toContainText(
    "What this first slice proves",
  );
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
  const overlay = page.locator(".book-mode-overlay");
  await expect
    .poll(async () =>
      overlay.evaluate((node) => node.scrollWidth === node.clientWidth),
    )
    .toBe(true);

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
  await expect(peel).toHaveClass(/book-mode-turn-past-half/);
  await expect(peel.locator(".book-mode-turn-front")).toHaveCSS("opacity", "0");
  await expect(peel.locator(".book-mode-turn-back")).toHaveCSS("opacity", "1");
  await expect(peel.locator(".book-mode-turn-back")).toContainText(
    "Introduction",
  );
  await expect(
    page.locator(".book-mode-spread > .book-mode-sheet-right"),
  ).toContainText("Introduction");
  await page.mouse.up();
  await expect(page.locator(".book-mode-turn-leaf-interactive")).toHaveCount(0);
  await expect(page.locator(".book-mode-counter")).toHaveText("Screen 1 / 7");

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
  await expect(backwardPeel.locator(".book-mode-turn-front")).toContainText(
    "Introduction",
  );
  await expect(backwardPeel.locator(".book-mode-turn-back")).toContainText(
    "A Small Book About Ethical Technology",
  );
  await page.mouse.up();
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
  const box = await paragraph.boundingBox();
  if (!box) {
    throw new Error("Expected semantic paragraph bounds");
  }

  await page.mouse.move(box.x + 8, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.7, box.y + box.height / 2, {
    steps: 6,
  });
  await page.mouse.up();

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
  await expect(page.locator(".book-mode-counter")).toHaveText("Front cover");
});

test("does not turn a page when a pointer gesture is cancelled", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(chapterPath);
  await page.getByRole("button", { name: "Book view" }).click();
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
  await expect(page.locator(".book-mode-counter")).toHaveText("Front cover");
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

test("does not navigate after closing a committed pointer peel", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(chapterPath);
  await page.getByRole("button", { name: "Book view" }).click();
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

  await expect(page).toHaveURL(/\/chapters\/introduction\/$/);
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
  await expect(page.locator(".book-mode-counter")).toHaveText("Screen 1 / 7");
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
    legacy.getByRole("dialog", { name: /Legacy fixed-page comparison/ }),
  ).toBeVisible();
  await expect(
    semantic.getByRole("dialog", {
      name: "A Small Book About Ethical Technology",
    }),
  ).toBeVisible();
  await expect(semantic.locator(".book-mode-counter")).toHaveText(
    "Front cover",
  );
});
