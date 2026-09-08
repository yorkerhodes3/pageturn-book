import { expect, test, type Locator, type Page } from "@playwright/test";

const pagesBase = (process.env.PAGES_BASE_PATH ?? "").replace(/\/$/, "");
const readerRoute =
  `${pagesBase}/v3/?book=what-is-ethical-ai&chapter=power&media=off#power`;

function firstParagraph(page: Page): Locator {
  return page
    .locator(
      "[data-v3-stationary] .v3-sheet-left .v3-sheet-content p[data-source-anchor]",
    )
    .first();
}

function rightParagraph(page: Page): Locator {
  return page
    .locator(
      "[data-v3-stationary] .v3-sheet-right .v3-sheet-content p[data-source-anchor]",
    )
    .first();
}

async function selectLeadingText(page: Page, paragraph: Locator): Promise<string> {
  return paragraph.evaluate((node) => {
    const text = node.firstChild;
    if (!(text instanceof Text)) {
      throw new Error("Expected paragraph text");
    }
    const start = text.data.search(/\S/);
    const range = document.createRange();
    range.setStart(text, start);
    range.setEnd(text, Math.min(text.length, start + 55));
    const selection = document.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    document.dispatchEvent(new Event("selectionchange"));
    return selection?.toString().replace(/\s+/g, " ").trim() ?? "";
  });
}

async function saveMarginNote(
  page: Page,
  paragraph: Locator,
  note: string,
): Promise<void> {
  await selectLeadingText(page, paragraph);
  await page
    .getByRole("button", { name: "Annotate selected text" })
    .click();
  const editor = page.getByRole("dialog", { name: "Add annotation" });
  await editor.getByRole("textbox", { name: "Note on selected text" }).fill(note);
  await editor.getByRole("button", { name: "Save" }).click();
  await expect(editor).toBeHidden();
}

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
});

test("saves exact commenting records and keeps desktop marginalia outside body", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(readerRoute);
  await expect(page.locator("[data-v3-reader]")).toHaveAttribute(
    "data-v3-ready",
    "true",
  );
  const paragraph = firstParagraph(page);
  const selected = await selectLeadingText(page, paragraph);
  await page
    .getByRole("button", { name: "Annotate selected text" })
    .click();
  const editor = page.getByRole("dialog", { name: "Add annotation" });
  await expect(editor).toBeVisible();
  const sheetSide = await editor.evaluate(
    (node) =>
      node.closest(".v3-sheet")?.classList.contains("v3-sheet-left") ?? false,
  );
  expect(sheetSide).toBe(true);
  await editor
    .getByRole("textbox", { name: "Note on selected text" })
    .fill("Connect this passage to institutional accountability.");
  await editor.getByRole("button", { name: "Save" }).click();

  const note = page.getByRole("button", {
    name: /Open annotation: Connect this passage/,
  });
  await expect(note).toBeVisible();
  const geometry = await note.evaluate((node) => {
    const margin = node.closest(".v3-marginalia-layer")?.getBoundingClientRect();
    const body = node
      .closest(".v3-sheet")
      ?.querySelector(".v3-sheet-content")
      ?.getBoundingClientRect();
    return {
      marginRight: margin?.right ?? 0,
      bodyLeft: body?.left ?? 0,
      side: node.closest(".v3-marginalia-layer")?.className ?? "",
    };
  });
  expect(geometry.side).toContain("v3-marginalia-layer-left");
  expect(geometry.marginRight).toBeLessThanOrEqual(geometry.bodyLeft + 1);

  const stored = await page.evaluate(async () => {
    const request = indexedDB.open("ethical-tech-pageturn-personal");
    const database = await new Promise<IDBDatabase>((resolve) => {
      request.onsuccess = () => resolve(request.result);
    });
    const read = database
      .transaction("annotations", "readonly")
      .objectStore("annotations")
      .getAll();
    const records = await new Promise<unknown[]>((resolve) => {
      read.onsuccess = () => resolve(read.result);
    });
    database.close();
    return records;
  });
  expect(stored).toHaveLength(1);
  expect(stored[0]).toMatchObject({
    schemaVersion: 2,
    motivation: "commenting",
    body: {
      format: "text/markdown",
      value: "Connect this passage to institutional accountability.",
    },
    target: { state: "resolved", selector: { quote: { exact: selected } } },
  });

  await note.click();
  const detail = page.getByRole("dialog", { name: "Annotation" });
  await expect(detail.getByRole("textbox", { name: "Full note" })).toHaveValue(
    "Connect this passage to institutional accountability.",
  );
  await detail.getByRole("textbox", { name: "Full note" }).fill("Revised note.");
  await detail.getByRole("button", { name: "Save changes" }).click();
  await expect(detail.getByRole("status")).toContainText("updated");
  await detail.getByRole("button", { name: "Open in Explore" }).click();
  await expect(page.getByRole("dialog", { name: "Explore this book" })).toBeVisible();
  await expect(
    page.locator("[data-v3-annotation-list] [data-v3-annotation-item]"),
  ).toContainText("Revised note.");
  await page.getByRole("button", { name: "Edit private annotation" }).click();
  await page.getByRole("button", { name: "Delete" }).click();
  await expect(
    page.getByRole("button", { name: /Open annotation:/ }),
  ).toHaveCount(0);
});

test("restores, repositions, hides, and opens a mobile marker as a bottom sheet", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(readerRoute);
  await expect(page.locator("[data-v3-reader]")).toHaveAttribute(
    "data-v3-ready",
    "true",
  );
  await saveMarginNote(page, rightParagraph(page), "A durable responsive note.");
  await page.reload();
  const desktopNote = page.getByRole("button", {
    name: "Open annotation: A durable responsive note.",
  });
  await expect(desktopNote).toBeVisible();
  expect(
    await desktopNote.evaluate((node) =>
      node.closest(".v3-marginalia-layer")?.classList.contains(
        "v3-marginalia-layer-right",
      ),
    ),
  ).toBe(true);

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator(".v3-spread")).toHaveClass(/v3-spread-single/);
  await expect(
    page.locator("[data-v3-stationary] .v3-sheet-content"),
  ).toBeVisible();
  await expect(desktopNote).toBeVisible();
  await expect
    .poll(() =>
      desktopNote.evaluate(
        (node) =>
          node
            .closest(".v3-sheet")
            ?.querySelector(".v3-sheet-content")
            ?.getBoundingClientRect().width ?? 0,
      ),
    )
    .toBeGreaterThan(250);
  await desktopNote.click();
  const sheet = page.getByRole("dialog", { name: "Annotation" });
  await expect(sheet).toBeVisible();
  expect(
    await sheet.evaluate((node) => {
      const bounds = node.getBoundingClientRect();
      return Math.abs(bounds.bottom - innerHeight) < 2;
    }),
  ).toBe(true);
  await sheet.getByRole("button", { name: "Close annotation" }).click();
  await expect(desktopNote).toBeFocused();

  await page.getByRole("button", { name: "Explore" }).click();
  await page.getByRole("checkbox", { name: "Show marginalia" }).uncheck();
  await page.getByRole("checkbox", { name: "Use standard font for notes" }).check();
  await page.getByRole("button", { name: "Close book tools" }).click();
  await expect(desktopNote).toBeHidden();
  await page.reload();
  await expect(page.locator("[data-v3-marginalia]")).toHaveCount(0);
  await page.getByRole("button", { name: "Explore" }).click();
  await expect(page.getByRole("checkbox", { name: "Show marginalia" })).not.toBeChecked();
  await expect(
    page.getByRole("checkbox", { name: "Use standard font for notes" }),
  ).toBeChecked();
});

test("recovers after whitespace-only margin-note validation", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(readerRoute);
  await expect(page.locator("[data-v3-reader]")).toHaveAttribute(
    "data-v3-ready",
    "true",
  );
  await selectLeadingText(page, firstParagraph(page));
  await page
    .getByRole("button", { name: "Annotate selected text" })
    .click();
  const editor = page.getByRole("dialog", { name: "Add annotation" });
  const note = editor.getByRole("textbox", { name: "Note on selected text" });
  await note.fill("   ");
  await editor.getByRole("button", { name: "Save" }).click();
  await expect
    .poll(() =>
      note.evaluate(
        (element) => (element as HTMLTextAreaElement).validationMessage,
      ),
    )
    .toContain("Enter a note");

  await note.fill("A valid note after correcting the input.");
  await editor.getByRole("button", { name: "Save" }).click();
  await expect(editor).toBeHidden();
  await expect(
    page.getByRole("button", {
      name: "Open annotation: A valid note after correcting the input.",
    }),
  ).toBeVisible();
});

test("groups deterministic collisions and keeps page-turn copies decorative", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(readerRoute);
  await expect(page.locator("[data-v3-reader]")).toHaveAttribute(
    "data-v3-ready",
    "true",
  );
  await saveMarginNote(page, rightParagraph(page), "Collision note 0");
  await page.evaluate(async () => {
    const request = indexedDB.open("ethical-tech-pageturn-personal");
    const database = await new Promise<IDBDatabase>((resolve) => {
      request.onsuccess = () => resolve(request.result);
    });
    const transaction = database.transaction("annotations", "readwrite");
    const store = transaction.objectStore("annotations");
    const read = store.getAll();
    const records = await new Promise<Record<string, unknown>[]>((resolve) => {
      read.onsuccess = () => resolve(read.result as Record<string, unknown>[]);
    });
    const base = records[0] as Record<string, unknown> & {
      body: { format: string; value: string };
    };
    for (let index = 1; index < 15; index += 1) {
      store.put({
        ...base,
        annotationId: `collision-${String(index).padStart(2, "0")}`,
        body: { ...base.body, value: `Collision note ${index}` },
        createdAt: `2026-09-06T18:07:${String(index).padStart(2, "0")}.000Z`,
        updatedAt: `2026-09-06T18:07:${String(index).padStart(2, "0")}.000Z`,
      });
    }
    await new Promise<void>((resolve) => {
      transaction.oncomplete = () => resolve();
    });
    database.close();
  });
  await page.reload();
  const grouped = page.getByRole("button", { name: /Open \d+ grouped annotations/ });
  await expect(grouped).toBeVisible();
  await grouped.click();
  const groupSheet = page.getByRole("dialog", { name: /\d+ notes/ });
  await expect(groupSheet).toBeVisible();
  await expect(
    groupSheet.locator("[data-v3-annotation-dialog-group]").getByRole("button"),
  ).toHaveCount(
    Number((await grouped.getAttribute("aria-label"))?.match(/\d+/)?.[0]),
  );
  await groupSheet
    .locator("[data-v3-annotation-dialog-group]")
    .getByRole("button")
    .first()
    .click();
  const detail = page.getByRole("dialog", { name: "Annotation" });
  await detail
    .getByRole("textbox", { name: "Full note" })
    .fill("Edited grouped annotation.");
  await detail.getByRole("button", { name: "Save changes" }).click();
  await expect(detail.getByRole("status")).toContainText("updated");
  await detail.getByRole("button", { name: "Close annotation" }).click();
  await expect(
    page.locator(
      "[data-v3-annotation-group]:focus, [data-v3-annotation-open]:focus",
    ),
  ).toHaveCount(1);

  await grouped.click();
  await page
    .getByRole("dialog", { name: /\d+ notes/ })
    .locator("[data-v3-annotation-dialog-group]")
    .getByRole("button")
    .first()
    .click();
  await page
    .getByRole("dialog", { name: "Annotation" })
    .getByRole("button", { name: "Delete" })
    .click();
  await expect(page.getByRole("dialog", { name: "Annotation" })).toBeHidden();
  await expect
    .poll(() =>
      page.evaluate(async () => {
        const request = indexedDB.open("ethical-tech-pageturn-personal");
        const database = await new Promise<IDBDatabase>((resolve) => {
          request.onsuccess = () => resolve(request.result);
        });
        const read = database
          .transaction("annotations", "readonly")
          .objectStore("annotations")
          .count();
        const count = await new Promise<number>((resolve) => {
          read.onsuccess = () => resolve(read.result);
        });
        database.close();
        return count;
      }),
    )
    .toBe(14);

  await page.getByRole("button", { name: "Next spread" }).click();
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect
    .poll(() =>
      page.evaluate(
        () => matchMedia("(prefers-reduced-motion: reduce)").matches,
      ),
    )
    .toBe(false);
  const previousCorner = page.getByRole("button", {
    name: "Turn the previous page from its top corner",
  });
  const cornerBounds = await previousCorner.boundingBox();
  if (!cornerBounds) {
    throw new Error("Expected a visible forward page corner");
  }
  await page.mouse.move(
    cornerBounds.x + cornerBounds.width * 0.75,
    cornerBounds.y + cornerBounds.height * 0.25,
  );
  await page.mouse.down();
  await expect(
    page.locator("[data-v3-turn-layer] [data-v3-marginalia]"),
  ).not.toHaveCount(0);
  expect(
    await page
      .locator("[data-v3-turn-layer] [data-v3-marginalia]")
      .evaluateAll((nodes) =>
        nodes.every(
          (node) =>
            node.closest("[aria-hidden=true]") !== null &&
            node.querySelector("[id]") === null &&
            node.querySelector("button") === null,
        ),
      ),
  ).toBe(true);
  await page.mouse.up();
  await expect(page.locator("[data-v3-reader]")).toHaveAttribute(
    "data-v3-turning",
    "false",
  );
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.getByRole("button", { name: "Previous spread" }).click();
  await expect(page.locator("[data-v3-stationary] [data-v3-marginalia]")).not.toHaveCount(0);
});
