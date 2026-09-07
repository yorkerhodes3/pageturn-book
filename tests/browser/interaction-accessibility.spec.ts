import { expect, test, type Locator, type Page } from "@playwright/test";

const pagesBase = (process.env.PAGES_BASE_PATH ?? "").replace(/\/$/, "");
const route = (path: string) => `${pagesBase}${path}`;

async function waitForReader(page: Page): Promise<void> {
  await expect(page.locator("[data-v3-reader]")).toHaveAttribute(
    "data-v3-ready",
    "true",
  );
  await expect(page.locator("[data-v3-reader]")).toHaveAttribute(
    "data-v3-opening",
    "false",
  );
}

async function installProgrammaticRangeWithKeyboardIntent(
  page: Page,
  paragraph: Locator,
  maximumCharacters = 72,
): Promise<string> {
  await paragraph.focus();
  await page.keyboard.press("Shift+ArrowRight");
  return paragraph.evaluate((node, maximum) => {
    const text = document
      .createTreeWalker(node, NodeFilter.SHOW_TEXT)
      .nextNode();
    if (!(text instanceof Text)) {
      throw new Error("Expected selectable publication text");
    }
    const start = text.data.search(/\S/u);
    const range = document.createRange();
    range.setStart(text, start);
    range.setEnd(text, Math.min(text.length, start + maximum));
    const selection = document.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    document.dispatchEvent(new Event("selectionchange"));
    return selection?.toString().replace(/\s+/gu, " ").trim() ?? "";
  }, maximumCharacters);
}

function firstVisibleParagraph(page: Page): Locator {
  return page
    .locator("[data-v3-stationary] p[data-source-anchor]:visible")
    .first();
}

test("exposes selection and share semantics under forced colors, reduced motion, and 200% zoom", async ({
  page,
}) => {
  await page.emulateMedia({
    forcedColors: "active",
    reducedMotion: "reduce",
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(route("/sdk/?share=visual"));
  await waitForReader(page);
  await page.locator("[data-v3-chapter-select]").selectOption("introduction");
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "200%";
  });
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Emulation.setPageScaleFactor", { pageScaleFactor: 2 });
  await expect
    .poll(() => page.evaluate(() => visualViewport?.scale ?? 1))
    .toBeGreaterThanOrEqual(2);
  await expect
    .poll(() =>
      page.evaluate(() => Number.parseFloat(getComputedStyle(document.documentElement).fontSize)),
    )
    .toBeGreaterThanOrEqual(32);
  await page.waitForTimeout(300);

  const paragraph = firstVisibleParagraph(page);
  const selected = await installProgrammaticRangeWithKeyboardIntent(
    page,
    paragraph,
  );
  const toolbar = page.getByRole("toolbar", { name: "Selected text actions" });
  await expect(toolbar).toBeVisible();
  expect(
    await toolbar.evaluate((node) => {
      const style = getComputedStyle(node);
      return {
        animationName: style.animationName,
        borderStyle: style.borderStyle,
        forcedColorAdjust: style.forcedColorAdjust,
      };
    }),
  ).toEqual({
    animationName: "none",
    borderStyle: "solid",
    forcedColorAdjust: "none",
  });

  await page.keyboard.press("Alt+Shift+A");
  await expect(
    toolbar.getByRole("button", { name: "Copy selected text" }),
  ).toBeFocused();
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog", { name: "Share preview" });
  await expect(dialog).toBeVisible();
  await expect(dialog.locator("[data-v3-share-composer-status]")).toContainText(
    "preview ready",
    { ignoreCase: true },
  );
  await expect(dialog.locator("[data-v3-share-quote]")).toHaveText(selected);
  await expect(dialog.locator("figcaption")).toContainText(
    "quote and citation remain available as text outside this image",
  );
  const relationships = await dialog.evaluate((node) => ({
    labelledBy: node.getAttribute("aria-labelledby"),
    describedBy: node.getAttribute("aria-describedby"),
  }));
  expect(relationships.labelledBy).toBeTruthy();
  expect(relationships.describedBy).toBeTruthy();
  await expect(page.locator(`#${relationships.labelledBy}`)).toHaveCount(1);
  await expect(page.locator(`#${relationships.describedBy}`)).toHaveCount(1);

  const tree = await cdp.send("Accessibility.getFullAXTree");
  const accessible = tree.nodes.map((node) => ({
    role: node.role?.value,
    name: node.name?.value,
  }));
  expect(accessible).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ role: "dialog", name: "Share preview" }),
      expect.objectContaining({
        role: "button",
        name: "Close share preview",
      }),
      expect.objectContaining({
        role: "image",
        name: "Book-style visual preview of the selected public quote",
      }),
    ]),
  );
  await cdp.send("Emulation.setPageScaleFactor", { pageScaleFactor: 1 });
  await dialog.getByRole("button", { name: "Close share preview" }).focus();
  await page.keyboard.press("Enter");
  await expect(dialog).toBeHidden();
});

test("focuses Copy while exact keyboard-intent target preparation is busy", async ({
  page,
}) => {
  await page.goto(route("/sdk/?share=visual"));
  await waitForReader(page);
  await page.locator("[data-v3-chapter-select]").selectOption("introduction");
  const annotate = page.locator('[data-v3-selection-action="annotate"]');
  await expect
    .poll(() => annotate.evaluate((button) => !(button as HTMLButtonElement).hidden))
    .toBe(true);
  await page.evaluate(() => {
    const prototype = SubtleCrypto.prototype;
    const original = prototype.digest;
    const pending: Array<{
      receiver: SubtleCrypto;
      algorithm: AlgorithmIdentifier;
      data: BufferSource;
      resolve: (value: ArrayBuffer) => void;
      reject: (reason?: unknown) => void;
    }> = [];
    const controls = globalThis as typeof globalThis & {
      __v3PendingDigests?: () => number;
      __v3ReleaseAndRestoreDigest?: () => void;
    };
    prototype.digest = function delayedDigest(algorithm, data) {
      return new Promise<ArrayBuffer>((resolve, reject) => {
        pending.push({
          receiver: this,
          algorithm,
          data,
          resolve,
          reject,
        });
      });
    };
    controls.__v3PendingDigests = () => pending.length;
    controls.__v3ReleaseAndRestoreDigest = () => {
      prototype.digest = original;
      for (const request of pending.splice(0)) {
        void original
          .call(request.receiver, request.algorithm, request.data)
          .then(request.resolve, request.reject);
      }
      delete controls.__v3PendingDigests;
      delete controls.__v3ReleaseAndRestoreDigest;
    };
  });
  try {
    await installProgrammaticRangeWithKeyboardIntent(
      page,
      firstVisibleParagraph(page),
    );
    const toolbar = page.getByRole("toolbar", {
      name: "Selected text actions",
    });
    await expect(toolbar).toBeVisible();
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            (
              globalThis as typeof globalThis & {
                __v3PendingDigests?: () => number;
              }
            ).__v3PendingDigests?.() ?? 0,
        ),
      )
      .toBe(1);
    await expect(toolbar).toHaveAttribute("aria-busy", "true");
    const copy = toolbar.getByRole("button", { name: "Copy selected text" });
    const share = toolbar.getByRole("button", { name: "Share selected text" });
    const highlight = toolbar.getByRole("button", {
      name: "Highlight selected text",
    });
    await expect(copy).toBeEnabled();
    await expect(share).toBeDisabled();
    await expect(highlight).toBeDisabled();
    await expect(annotate).toBeDisabled();
    await page.keyboard.press("Alt+Shift+A");
    await expect(copy).toBeFocused();

    await page.evaluate(() => {
      (
        globalThis as typeof globalThis & {
          __v3ReleaseAndRestoreDigest?: () => void;
        }
      ).__v3ReleaseAndRestoreDigest?.();
    });
    await expect(toolbar).toHaveAttribute("aria-busy", "false");
    await expect(share).toBeEnabled();
    await expect(highlight).toBeEnabled();
    await expect(annotate).toBeEnabled();
  } finally {
    await page
      .evaluate(() => {
        (
          globalThis as typeof globalThis & {
            __v3ReleaseAndRestoreDigest?: () => void;
          }
        ).__v3ReleaseAndRestoreDigest?.();
        document.getSelection()?.removeAllRanges();
        document.dispatchEvent(new Event("selectionchange"));
      })
      .catch(() => {});
  }
});

test("announces local and external source destinations and restores keyboard focus", async ({
  page,
}) => {
  await page.goto(route("/sdk/?source=known"));
  await waitForReader(page);
  const localSource = page.locator("[data-sdk-source-link]");
  await expect(localSource).toBeVisible();
  await localSource.focus();
  await page.keyboard.press("Enter");
  let dialog = page.getByRole("dialog", { name: "SDK source fixture" });
  await expect(dialog).toContainText("Available in the PageTurn Library");
  await expect(dialog).toContainText("Approved local excerpt");
  await expect(
    dialog.getByRole("link", { name: /Open original source.*external.*new tab/i }),
  ).toHaveAttribute("target", "_blank");
  for (const attribute of ["aria-labelledby", "aria-describedby"]) {
    const id = await dialog.getAttribute(attribute);
    expect(id).toBeTruthy();
    await expect(page.locator(`#${id}`)).toHaveCount(1);
  }
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(localSource).toBeFocused();

  await page.goto(route("/sdk/?source=canonical-alias"));
  await waitForReader(page);
  const externalSource = page.locator("[data-sdk-source-link]");
  await externalSource.focus();
  await page.keyboard.press("Enter");
  dialog = page.getByRole("dialog", { name: "SDK source fixture" });
  await expect(dialog).toContainText("External source");
  await expect(
    dialog.getByRole("link", { name: /Open source.*external.*new tab/i }),
  ).toHaveAttribute("target", "_blank");
  await expect(
    dialog.getByRole("link", {
      name: /Open reviewed canonical source.*external.*new tab/i,
    }),
  ).toHaveAttribute("rel", "noopener noreferrer");
});

test("supports keyboard-intent note actions, readable marginalia, and mobile safe-area sheets", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(
    route(
      "/v3/?book=what-is-ethical-ai&chapter=power&media=off#power",
    ),
  );
  await waitForReader(page);
  await page.locator(".v3-page").evaluate((node) => {
    (node as HTMLElement).style.setProperty("--v3-safe-area-bottom", "24px");
  });
  const paragraph = firstVisibleParagraph(page);
  await installProgrammaticRangeWithKeyboardIntent(page, paragraph);
  await page.keyboard.press("Alt+Shift+A");
  await page.keyboard.press("End");
  await page.keyboard.press("Enter");
  const editor = page.getByRole("dialog", { name: "Add annotation" });
  await expect(
    editor.getByRole("textbox", { name: "Note on selected text" }),
  ).toBeFocused();
  await page.keyboard.type("Keyboard-created accessible note.");
  await page.keyboard.press("Tab");
  await page.keyboard.press("Enter");

  const marker = page.getByRole("button", {
    name: "Open annotation: Keyboard-created accessible note.",
  });
  await expect(marker).toBeVisible();
  const handwrittenFont = await marker.evaluate(
    (node) => getComputedStyle(node).fontFamily,
  );
  await page.getByRole("button", { name: "Explore" }).focus();
  await page.keyboard.press("Enter");
  const readable = page.getByRole("checkbox", {
    name: "Use standard font for notes",
  });
  await readable.focus();
  await page.keyboard.press("Space");
  await page.getByRole("button", { name: "Close book tools" }).focus();
  await page.keyboard.press("Enter");
  const readableFont = await marker.evaluate(
    (node) => getComputedStyle(node).fontFamily,
  );
  expect(readableFont).not.toBe(handwrittenFont);

  await marker.focus();
  await page.keyboard.press("Enter");
  const sheet = page.getByRole("dialog", { name: "Annotation" });
  await expect(sheet).toBeVisible();
  const geometry = await sheet.evaluate((node) => {
    const bounds = node.getBoundingClientRect();
    return {
      bottomGap: Math.abs(innerHeight - bounds.bottom),
      paddingBottom: Number.parseFloat(getComputedStyle(node).paddingBottom),
    };
  });
  expect(geometry.bottomGap).toBeLessThan(2);
  expect(geometry.paddingBottom).toBeGreaterThanOrEqual(40);
  await sheet.getByRole("button", { name: "Close annotation" }).focus();
  await page.keyboard.press("Enter");
  await expect(marker).toBeFocused();
});

test("preserves image alternatives, captions, provenance, and native figure naming", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(
    route(
      "/v3/?book=what-is-ethical-ai&chapter=responsible-ai&media=on#v3-media-ai-ethics-frameworks",
    ),
  );
  await waitForReader(page);
  const figure = page.locator(
    '[data-v3-stationary] [data-v3-media-id="ai-ethics-frameworks"]',
  );
  await expect(figure).toBeVisible();
  await expect(figure.locator("img")).toHaveAttribute(
    "alt",
    /Circular diagram of ten landmark resources/,
  );
  await expect(figure.locator("figcaption")).toContainText(
    "Ten landmark resources for building an AI ethics framework",
  );
  const provenance = figure.getByRole("button", {
    name: /View image provenance/,
  });
  await provenance.focus();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog", {
    name: "Figure 4. Ten landmark resources for building an AI ethics framework.",
  });
  await expect(dialog).toContainText("Ethical Tech CoLab");
  await expect(dialog).toContainText("Copyright; no public redistribution license");
  await expect(dialog).toContainText(
    "Lossless WebP extracted without resizing",
  );
  await expect(dialog.locator("[data-v3-media-dialog-image]")).toHaveAttribute(
    "alt",
    /Circular diagram of ten landmark resources/,
  );
});

test("keeps static content readable and embedded permission fallbacks honest through teardown", async ({
  browser,
  page,
}) => {
  const staticContext = await browser.newContext({ javaScriptEnabled: false });
  const staticPage = await staticContext.newPage();
  await staticPage.goto(
    route(
      "/book/what-is-ethical-ai/2026-09/chapters/responsible-ai/",
    ),
  );
  await expect(
    staticPage.getByRole("heading", {
      level: 1,
      name: "09. The Rise of Responsible AI",
    }),
  ).toBeVisible();
  await expect(staticPage.locator("body")).toHaveAttribute(
    "data-reader-status",
    "static",
  );
  await staticContext.close();

  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: () =>
          Promise.reject(
            new DOMException(
              "Denied by the embedding Permissions Policy",
              "NotAllowedError",
            ),
          ),
      },
    });
  });
  await page.goto(route("/sdk/"));
  const frameName = await page.evaluate((src) => {
    const iframe = document.createElement("iframe");
    iframe.name = "permissions-denied-reader";
    iframe.sandbox.add("allow-scripts", "allow-same-origin");
    iframe.allow = "clipboard-write 'none'; web-share 'none'";
    iframe.style.width = "1200px";
    iframe.style.height = "900px";
    iframe.src = src;
    document.body.append(iframe);
    return iframe.name;
  }, route("/sdk/?share=visual&allowDownload=1"));
  const embedded = page.frameLocator(`iframe[name="${frameName}"]`);
  await expect(embedded.locator("#page-turn-book")).toHaveAttribute(
    "data-sdk-ready",
    "true",
  );
  await embedded.locator("[data-v3-chapter-select]").selectOption("introduction");
  const paragraph = embedded
    .locator("[data-v3-stationary] p[data-source-anchor]")
    .first();
  await paragraph.evaluate((node) => {
    const text = document
      .createTreeWalker(node, NodeFilter.SHOW_TEXT)
      .nextNode();
    if (!(text instanceof Text)) {
      throw new Error("Expected embedded publication text");
    }
    const range = document.createRange();
    range.setStart(text, 0);
    range.setEnd(text, Math.min(text.length, 72));
    document.getSelection()?.removeAllRanges();
    document.getSelection()?.addRange(range);
    document.dispatchEvent(new Event("selectionchange"));
  });
  await embedded
    .locator('[data-v3-selection-action="share"]')
    .evaluate((button) => (button as HTMLButtonElement).click());
  const dialog = embedded.getByRole("dialog", { name: "Share preview" });
  await expect(dialog.locator("[data-v3-share-composer-status]")).toContainText(
    "preview ready",
    { ignoreCase: true },
  );
  await expect(dialog.locator("[data-v3-share-embed-note]")).toContainText(
    "requires host permission",
  );
  await expect(
    dialog.getByRole("button", { name: "Download image" }),
  ).toBeHidden();
  await dialog
    .getByRole("button", { name: "Copy quote + link" })
    .evaluate((button) => (button as HTMLButtonElement).click());
  await expect(dialog.locator("[data-v3-share-composer-status]")).toHaveText(
    "Clipboard access was not permitted. Select the preview text and copy it manually.",
  );
  await embedded
    .getByRole("button", { name: "Destroy SDK reader" })
    .evaluate((button) => (button as HTMLButtonElement).click());
  await expect(embedded.locator("#page-turn-book")).toHaveAttribute(
    "data-sdk-destroyed",
    "true",
  );
  await expect(embedded.locator("[data-v3-share-dialog]")).toHaveCount(0);
  await expect(embedded.locator("[data-v3-source-preview-frame]")).toHaveCount(0);
});
