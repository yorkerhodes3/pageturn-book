import { expect, test, type Locator, type Page } from "@playwright/test";

const pagesBase = (process.env.PAGES_BASE_PATH ?? "").replace(/\/$/, "");
const route = (path: string) => `${pagesBase}${path}`;
const readerRoute = route(
  "/v3/?book=what-is-ethical-ai&chapter=power&media=off#power",
);

async function selectText(
  page: Page,
  paragraph: Locator,
  modality: "keyboard" | "mouse" | "touch" = "mouse",
): Promise<string> {
  return paragraph.evaluate((node, inputModality) => {
    if (inputModality !== "keyboard") {
      node.dispatchEvent(
        new PointerEvent("pointerdown", {
          bubbles: true,
          isPrimary: true,
          pointerId: 41,
          pointerType: inputModality,
        }),
      );
    } else {
      document.dispatchEvent(
        new KeyboardEvent("keydown", {
          bubbles: true,
          key: "ArrowRight",
          shiftKey: true,
        }),
      );
    }
    const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
    const text = walker.nextNode();
    if (!(text instanceof Text)) {
      throw new Error("Expected selectable text");
    }
    const start = text.data.search(/\S/);
    const range = document.createRange();
    range.setStart(text, start);
    range.setEnd(text, Math.min(text.length, start + 48));
    const selection = document.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    document.dispatchEvent(new Event("selectionchange"));
    return selection?.toString().replace(/\s+/g, " ").trim() ?? "";
  }, modality);
}

function firstParagraph(page: Page): Locator {
  return page
    .locator(
      "[data-v3-stationary] .v3-sheet-left .v3-sheet-content p[data-source-anchor]",
    )
    .first();
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText(text: string) {
          (
            globalThis as typeof globalThis & { __copiedSelection?: string }
          ).__copiedSelection = text;
          return Promise.resolve();
        },
      },
    });
  });
  await page.emulateMedia({ reducedMotion: "reduce" });
});

test("shows pointer actions without stealing focus and copies exact text", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(readerRoute);
  await expect(page.locator("[data-v3-reader]")).toHaveAttribute(
    "data-v3-ready",
    "true",
  );
  const paragraph = firstParagraph(page);
  const selected = await selectText(page, paragraph);
  const toolbar = page.getByRole("toolbar", { name: "Selected text actions" });
  await expect(toolbar).toBeVisible();
  await expect(toolbar.getByRole("button")).toHaveCount(4);
  await expect(toolbar.getByRole("button").nth(0)).toHaveAccessibleName(
    "Copy selected text",
  );
  await expect(toolbar.getByRole("button").nth(1)).toHaveAccessibleName(
    "Share selected text",
  );
  await expect(toolbar.getByRole("button").nth(2)).toHaveAccessibleName(
    "Highlight selected text",
  );
  await expect(toolbar.getByRole("button").nth(3)).toHaveAccessibleName(
    "Annotate selected text",
  );
  expect(
    await toolbar.evaluate((node) => node.contains(document.activeElement)),
  ).toBe(false);
  const collisionFree = await toolbar.evaluate((node) => {
    const selection = document.getSelection();
    const selectedBounds = selection?.getRangeAt(0).getBoundingClientRect();
    const toolbarBounds = node.getBoundingClientRect();
    const overlaps =
      selectedBounds &&
      toolbarBounds.left < selectedBounds.right &&
      toolbarBounds.right > selectedBounds.left &&
      toolbarBounds.top < selectedBounds.bottom &&
      toolbarBounds.bottom > selectedBounds.top;
    return !overlaps;
  });
  expect(collisionFree).toBe(true);

  await toolbar.getByRole("button", { name: "Copy selected text" }).click();
  await expect(page.locator("[data-v3-selection-status]")).toHaveText(
    "Selected text copied.",
  );
  expect(
    await page.evaluate(
      () =>
        (
          globalThis as typeof globalThis & { __copiedSelection?: string }
        ).__copiedSelection,
    ),
  ).toBe(selected);
  expect(
    await page.evaluate(() =>
      (document.getSelection()?.toString() ?? "").replace(/\s+/g, " ").trim(),
    ),
  ).toBe(selected);

  await selectText(page, paragraph);
  await page.evaluate(() => {
    document
      .querySelector("[data-v3-reader]")
      ?.addEventListener("pageturn:share-selection", (event) => {
        (
          globalThis as typeof globalThis & { __sharedSelection?: string }
        ).__sharedSelection = ((event as CustomEvent).detail as { text: string })
          .text;
      });
  });
  await page
    .getByRole("button", { name: "Share selected text", exact: true })
    .click();
  expect(
    await page.evaluate(
      () =>
        (
          globalThis as typeof globalThis & { __sharedSelection?: string }
        ).__sharedSelection,
    ),
  ).toBe(selected);

  await page.evaluate(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: undefined,
    });
  });
  await selectText(page, paragraph);
  await page
    .getByRole("button", { name: "Copy selected text" })
    .click();
  await expect(page.locator("[data-v3-selection-status]")).toContainText(
    "Use the browser's Copy command",
  );
});

test("supports keyboard entry, roving focus, Escape return, and annotate dispatch", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(readerRoute);
  await expect(page.locator("[data-v3-reader]")).toHaveAttribute(
    "data-v3-ready",
    "true",
  );
  const paragraph = firstParagraph(page);
  const selected = await selectText(page, paragraph, "keyboard");
  await expect(page.locator("[data-v3-selection-live]")).toContainText(
    "Selection actions available",
  );
  await page.keyboard.press("Alt+Shift+A");
  await expect(
    page.getByRole("button", { name: "Copy selected text" }),
  ).toBeFocused();
  await page.keyboard.press("ArrowRight");
  await expect(
    page.getByRole("button", { name: "Share selected text", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Home");
  await expect(
    page.getByRole("button", { name: "Copy selected text" }),
  ).toBeFocused();
  await page.keyboard.press("End");
  await expect(
    page.getByRole("button", { name: "Annotate selected text" }),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(paragraph).toBeFocused();
  await expect(paragraph).toHaveAttribute("tabindex", "-1");
  await page.getByRole("button", { name: "Explore" }).focus();
  await expect(paragraph).not.toHaveAttribute("tabindex");

  await selectText(page, paragraph, "keyboard");
  await page.evaluate(() => {
    document
      .querySelector("[data-v3-reader]")
      ?.addEventListener("pageturn:annotate-selection", (event) => {
        const detail = (event as CustomEvent).detail as { text: string };
        (
          globalThis as typeof globalThis & { __annotatedSelection?: string }
        ).__annotatedSelection = detail.text;
      });
  });
  await page.keyboard.press("Alt+Shift+A");
  await page.keyboard.press("End");
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog", { name: "Explore this book" });
  await expect(dialog).toBeVisible();
  await expect(dialog.locator("[data-v3-selection-preview]")).toContainText(
    selected,
  );
  await expect(
    dialog.getByRole("textbox", { name: "Note on selected text" }),
  ).toBeFocused();
  expect(
    await page.evaluate(
      () =>
        (
          globalThis as typeof globalThis & {
            __annotatedSelection?: string;
          }
        ).__annotatedSelection,
    ),
  ).toBe(selected);
  await dialog.getByRole("button", { name: "Close book tools" }).click();
  await expect(paragraph).toBeFocused();
});

test("ordinary Explore clears a stale contextual selection", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(readerRoute);
  await expect(page.locator("[data-v3-reader]")).toHaveAttribute(
    "data-v3-ready",
    "true",
  );
  await selectText(page, firstParagraph(page));
  await expect(
    page.getByRole("toolbar", { name: "Selected text actions" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Explore" }).click();
  const dialog = page.getByRole("dialog", { name: "Explore this book" });
  await expect(dialog.locator("[data-v3-selection-preview]")).toBeHidden();
  await expect(
    dialog.getByRole("textbox", { name: "Note on selected text" }),
  ).toBeDisabled();
});

test("saves exact highlights, supports Undo, and restores them from IndexedDB", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(readerRoute);
  await expect(page.locator("[data-v3-reader]")).toHaveAttribute(
    "data-v3-ready",
    "true",
  );
  const paragraph = firstParagraph(page);
  const selected = await selectText(page, paragraph);
  await page
    .getByRole("button", { name: "Highlight selected text" })
    .click();
  await expect(page.getByRole("button", { name: "Undo" })).toBeVisible();
  const stored = await page.evaluate(async () => {
    const request = indexedDB.open("ethical-tech-pageturn-personal");
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const transaction = database.transaction("annotations", "readonly");
    const records = await new Promise<unknown[]>((resolve, reject) => {
      const read = transaction.objectStore("annotations").getAll();
      read.onsuccess = () => resolve(read.result);
      read.onerror = () => reject(read.error);
    });
    database.close();
    return records;
  });
  expect(stored).toHaveLength(1);
  expect(stored[0]).toMatchObject({
    schemaVersion: 2,
    motivation: "highlighting",
    body: { format: "text/markdown", value: "" },
    target: {
      state: "resolved",
      selector: { quote: { exact: selected } },
    },
  });
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (
            CSS as typeof CSS & {
              highlights?: Readonly<{ has(name: string): boolean }>;
            }
          ).highlights?.has("v3-personal-annotations") ?? false,
      ),
    )
    .toBe(true);
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(page.locator("[data-v3-selection-status]")).toHaveText(
    "Highlight removed.",
  );

  await selectText(page, paragraph);
  await page
    .getByRole("button", { name: "Highlight selected text" })
    .click();
  await page.reload();
  await expect(page.locator("[data-v3-reader]")).toHaveAttribute(
    "data-v3-ready",
    "true",
  );
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (
            CSS as typeof CSS & {
              highlights?: Readonly<{
                get(name: string): { size: number } | undefined;
              }>;
            }
          ).highlights?.get("v3-personal-annotations")?.size ?? 0,
      ),
    )
    .toBeGreaterThan(0);
});

test("uses touch-sized collision-safe placement and dismisses on repagination", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(readerRoute);
  await expect(page.locator("[data-v3-reader]")).toHaveAttribute(
    "data-v3-ready",
    "true",
  );
  await expect(page.locator("[data-v3-reader]")).toHaveAttribute(
    "data-v3-loaded-chapters",
    "3",
  );
  const paragraph = page
    .locator(
      "[data-v3-stationary] .v3-sheet-content p[data-source-anchor]",
    )
    .first();
  await selectText(page, paragraph, "touch");
  const toolbar = page.locator("[data-v3-selection-actions]");
  const permanentEntry = page.getByRole("button", {
    name: "Selection actions",
  });
  await expect
    .poll(async () => (await toolbar.isVisible()) || (await permanentEntry.isVisible()))
    .toBe(true);
  if (await permanentEntry.isVisible()) {
    await permanentEntry.click();
  }
  await expect(toolbar).toBeVisible();
  const geometry = await toolbar.evaluate((node) => {
    const buttons = Array.from(node.querySelectorAll("button"));
    const range = document.getSelection()?.getRangeAt(0);
    const selected = range?.getBoundingClientRect();
    const placed = node.getBoundingClientRect();
    return {
      minimumTarget: Math.min(
        ...buttons.map((button) => button.getBoundingClientRect().height),
      ),
      overlapsSelection:
        selected !== undefined &&
        placed.left < selected.right &&
        placed.right > selected.left &&
        placed.top < selected.bottom &&
        placed.bottom > selected.top,
      placement: (node as HTMLElement).dataset.v3Placement,
    };
  });
  expect(geometry.minimumTarget).toBeGreaterThanOrEqual(44);
  expect(geometry.overlapsSelection).toBe(false);
  expect(["adjacent", "dock", "permanent"]).toContain(geometry.placement);

  await page.setViewportSize({ width: 412, height: 760 });
  await expect(toolbar).toBeHidden();
});
