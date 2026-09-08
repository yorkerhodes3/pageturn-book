import { expect, test, type Locator, type Page } from "@playwright/test";

const pagesBase = (process.env.PAGES_BASE_PATH ?? "").replace(/\/$/, "");
const route = (path: string) => `${pagesBase}${path}`;

type ShareCapture = {
  title: string | undefined;
  text: string | undefined;
  url: string | undefined;
  files: Array<{ name: string; type: string; size: number }> | undefined;
};

async function openShareFixture(
  page: Page,
  mode: "visual" | "quote" | "anchor" | "missing" | "invalid",
): Promise<Locator> {
  await page.goto(route(`/sdk/?share=${mode}`));
  await expect(page.locator("#page-turn-book")).toHaveAttribute(
    "data-sdk-ready",
    "true",
  );
  await page.locator("[data-v3-chapter-select]").selectOption("introduction");
  const paragraph = page
    .locator("[data-v3-stationary] p[data-source-anchor]")
    .first();
  await expect(paragraph).toBeVisible();
  return paragraph;
}

async function selectText(
  page: Page,
  paragraph: Locator,
  expectShare = true,
  shareName = "Share selected text",
): Promise<string> {
  const selected = await paragraph.evaluate((node) => {
    const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
    const text = walker.nextNode();
    if (!(text instanceof Text)) {
      throw new Error("Expected publication text");
    }
    const range = document.createRange();
    range.setStart(text, 0);
    range.setEnd(text, Math.min(text.length, 72));
    const selection = document.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    document.dispatchEvent(new Event("selectionchange"));
    return selection?.toString().replace(/\s+/gu, " ").trim() ?? "";
  });
  if (expectShare) {
    const shareAction = page.locator('[data-v3-selection-action="share"]');
    await expect(shareAction).toBeVisible();
    await expect(shareAction).toHaveAccessibleName(shareName);
  }
  return selected;
}

async function openComposer(page: Page): Promise<Locator> {
  const entry = page.getByRole("button", { name: "Selection actions" });
  if (await entry.isVisible()) {
    await entry.click();
  }
  await page.locator('[data-v3-selection-action="share"]').click();
  const dialog = page.getByRole("dialog", { name: "Share preview" });
  await expect(dialog).toBeVisible();
  return dialog;
}

async function waitForPreview(dialog: Locator): Promise<void> {
  await expect(dialog.locator("[data-v3-share-composer-status]")).toContainText(
    /preview ready|Anchor-only preview ready|Quote-and-link preview ready/i,
    { timeout: 5_000 },
  );
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    class TestClipboardItem {
      readonly types: string[];
      readonly values: Record<string, Blob>;

      constructor(values: Record<string, Blob>) {
        this.values = values;
        this.types = Object.keys(values);
      }
    }
    Object.defineProperty(globalThis, "ClipboardItem", {
      configurable: true,
      value: TestClipboardItem,
    });
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText(text: string) {
          (
            globalThis as typeof globalThis & { __copiedText?: string }
          ).__copiedText = text;
          return Promise.resolve();
        },
        write(items: readonly TestClipboardItem[]) {
          (
            globalThis as typeof globalThis & {
              __copiedImageTypes: string[] | undefined;
            }
          ).__copiedImageTypes = items[0]?.types;
          return Promise.resolve();
        },
      },
    });
    globalThis.open = ((url?: string | URL) => {
      (
        globalThis as typeof globalThis & { __openedImage?: string }
      ).__openedImage = String(url);
      return null;
    }) as typeof globalThis.open;
  });
  await page.emulateMedia({ reducedMotion: "reduce" });
});

test("renders a deterministic bounded public PNG lazily and restores focus", async ({
  page,
}) => {
  await page.addInitScript(() => {
    (
      globalThis as typeof globalThis & { __shareFontLoads?: number }
    ).__shareFontLoads = 0;
    Object.defineProperty(FontFaceSet.prototype, "load", {
      configurable: true,
      value() {
        (
          globalThis as typeof globalThis & { __shareFontLoads?: number }
        ).__shareFontLoads =
          ((globalThis as typeof globalThis & { __shareFontLoads?: number })
            .__shareFontLoads ?? 0) + 1;
        return new Promise<FontFace[]>(() => {});
      },
    });
  });
  const thirdPartyRequests: string[] = [];
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.protocol.startsWith("http") && url.origin !== "http://127.0.0.1:" + (process.env.PLAYWRIGHT_PORT ?? "4174")) {
      thirdPartyRequests.push(url.href);
    }
  });
  const paragraph = await openShareFixture(page, "visual");
  const selected = await selectText(page, paragraph);
  await page.evaluate(() => {
    localStorage.setItem("test-private-note", "SECRET PRIVATE NOTE");
    const arbitrary = document.createElement("aside");
    arbitrary.textContent = "SECRET ARBITRARY DOM";
    arbitrary.dataset.testPrivateDom = "true";
    document.querySelector("[data-v3-reader]")?.append(arbitrary);
    (
      globalThis as typeof globalThis & { __shareEventText?: string }
    ).__shareEventText = "";
    document
      .querySelector("[data-v3-reader]")
      ?.addEventListener("pageturn:share-selection", (event) => {
        (
          globalThis as typeof globalThis & { __shareEventText?: string }
        ).__shareEventText = (
          (event as CustomEvent).detail as { text: string }
        ).text;
      });
  });
  expect(
    await page.evaluate(
      () =>
        performance
          .getEntriesByType("resource")
          .filter(({ name }) => name.includes("share-renderer")).length,
    ),
  ).toBe(0);

  const dialog = await openComposer(page);
  await waitForPreview(dialog);
  await expect(dialog.locator("[data-v3-share-quote]")).toContainText(selected);
  await expect(dialog).toContainText("2026-08");
  await expect(dialog).toContainText("Ethical Tech CoLab");
  await expect(dialog).not.toContainText("SECRET PRIVATE NOTE");
  await expect(dialog).not.toContainText("SECRET ARBITRARY DOM");
  expect(
    await page.evaluate(
      () =>
        (
          globalThis as typeof globalThis & { __shareEventText?: string }
        ).__shareEventText,
    ),
  ).toBe(selected);
  expect(
    await page.evaluate(
      () =>
        performance
          .getEntriesByType("resource")
          .filter(({ name }) => name.includes("share-renderer")).length,
    ),
  ).toBe(1);

  const image = dialog.locator("[data-v3-share-image]");
  await expect(image).toHaveAttribute("src", /^blob:/);
  const first = await image.evaluate(async (node) => {
    if (!(node instanceof HTMLImageElement)) {
      throw new Error("Expected share preview image");
    }
    const response = await fetch(node.src);
    const bytes = new Uint8Array(await response.arrayBuffer());
    const digest = Array.from(
      new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)),
      (value) => value.toString(16).padStart(2, "0"),
    ).join("");
    return {
      digest,
      size: bytes.length,
      signature: Array.from(bytes.slice(0, 8)),
      width: node.naturalWidth,
      height: node.naturalHeight,
    };
  });
  expect(first.signature).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
  expect(Math.max(first.width, first.height)).toBeLessThanOrEqual(1_600);
  expect(first.width * first.height).toBeLessThanOrEqual(2_100_000);
  expect(first.size).toBeLessThanOrEqual(4 * 1024 * 1024);

  await dialog.getByRole("button", { name: "Close share preview" }).click();
  await expect(paragraph).toBeFocused();
  await selectText(page, paragraph);
  const secondDialog = await openComposer(page);
  await waitForPreview(secondDialog);
  const secondDigest = await secondDialog
    .locator("[data-v3-share-image]")
    .evaluate(async (node) => {
      if (!(node instanceof HTMLImageElement)) {
        throw new Error("Expected share preview image");
      }
      const bytes = await (await fetch(node.src)).arrayBuffer();
      return Array.from(
        new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)),
        (value) => value.toString(16).padStart(2, "0"),
      ).join("");
    });
  expect(secondDigest).toBe(first.digest);
  expect(
    await page.evaluate(
      () =>
        (globalThis as typeof globalThis & { __shareFontLoads?: number })
          .__shareFontLoads,
    ),
  ).toBe(3);
  expect(thirdPartyRequests).toEqual([]);
});

test("uses instance-local share dialog accessible relationships", async ({
  page,
}) => {
  await page.goto(route("/sdk/?share=anchor&instances=2"));
  const relationships = await page
    .locator("[data-v3-share-dialog]")
    .evaluateAll((dialogs) =>
      dialogs.map((dialog) => ({
        labelledBy: dialog.getAttribute("aria-labelledby"),
        describedBy: dialog.getAttribute("aria-describedby"),
      })),
    );
  expect(relationships).toHaveLength(2);
  expect(new Set(relationships.map(({ labelledBy }) => labelledBy)).size).toBe(
    2,
  );
  expect(
    new Set(relationships.map(({ describedBy }) => describedBy)).size,
  ).toBe(2);
  for (const { labelledBy, describedBy } of relationships) {
    expect(labelledBy).toBeTruthy();
    expect(describedBy).toBeTruthy();
    expect(await page.locator(`#${labelledBy}`).count()).toBe(1);
    expect(await page.locator(`#${describedBy}`).count()).toBe(1);
  }
});

test("visibly reduces quote-only, anchor-only, and missing-policy previews", async ({
  page,
}) => {
  let paragraph = await openShareFixture(page, "quote");
  const selected = await selectText(page, paragraph);
  let dialog = await openComposer(page);
  await waitForPreview(dialog);
  await expect(dialog.locator("[data-v3-share-quote]")).toContainText(selected);
  await expect(dialog.locator("[data-v3-share-visual]")).toBeHidden();
  const exactUrl = await dialog
    .locator("[data-v3-share-preview-url]")
    .getAttribute("href");
  expect(exactUrl).toContain("selection=");
  expect(exactUrl).toContain(":~:text=");
  await dialog.getByRole("button", { name: "Close share preview" }).click();

  for (const mode of ["anchor", "missing"] as const) {
    paragraph = await openShareFixture(page, mode);
    await selectText(page, paragraph, true, "Share passage location");
    dialog = await openComposer(page);
    await waitForPreview(dialog);
    await expect(dialog.locator("[data-v3-share-quote]")).toBeHidden();
    await expect(dialog.locator("[data-v3-share-visual]")).toBeHidden();
    if (mode === "missing") {
      await expect(dialog).toContainText("Only the public passage link");
    } else {
      await expect(dialog).toContainText("public passage links only");
    }
    await expect(dialog.getByRole("button", { name: "Copy link" })).toBeVisible();
    const anchorUrl = await dialog
      .locator("[data-v3-share-preview-url]")
      .getAttribute("href");
    expect(new URL(anchorUrl ?? "").searchParams.get("edition")).toBe("2026-08");
    expect(anchorUrl).not.toContain("selection=");
    expect(anchorUrl).not.toContain(":~:text=");
    await dialog.getByRole("button", { name: "Copy link" }).click();
    const copied = await page.evaluate(
      () =>
        (globalThis as typeof globalThis & { __copiedText?: string })
          .__copiedText,
    );
    expect(copied).toContain(anchorUrl);
    expect(copied).not.toContain(selected);
  }
});

test("does not reopen a stale share after navigation during truncation", async ({
  page,
}) => {
  await page.goto(route("/sdk/?share=quote&quoteMax=12"));
  await expect(page.locator("#page-turn-book")).toHaveAttribute(
    "data-sdk-ready",
    "true",
  );
  await page.locator("[data-v3-chapter-select]").selectOption("introduction");
  const paragraph = page
    .locator("[data-v3-stationary] p[data-source-anchor]")
    .first();
  await selectText(page, paragraph);
  await page.evaluate(() => {
    (
      globalThis as typeof globalThis & { __staleShareEvents?: number }
    ).__staleShareEvents = 0;
    document
      .querySelector("[data-v3-reader]")
      ?.addEventListener("pageturn:share-selection", () => {
        (
          globalThis as typeof globalThis & { __staleShareEvents?: number }
        ).__staleShareEvents =
          ((globalThis as typeof globalThis & { __staleShareEvents?: number })
            .__staleShareEvents ?? 0) + 1;
      });
    const original = SubtleCrypto.prototype.digest;
    Object.defineProperty(SubtleCrypto.prototype, "digest", {
      configurable: true,
      value(
        this: SubtleCrypto,
        ...args: Parameters<SubtleCrypto["digest"]>
      ) {
        return new Promise<ArrayBuffer>((resolve, reject) => {
          globalThis.setTimeout(() => {
            void original.apply(this, args).then(resolve, reject);
          }, 300);
        });
      },
    });
  });
  await page
    .getByRole("button", { name: "Share selected text", exact: true })
    .click();
  await page.getByRole("button", { name: "Next spread" }).click();
  await page.waitForTimeout(450);

  await expect(page.getByRole("dialog", { name: "Share preview" })).toBeHidden();
  expect(
    await page.evaluate(
      () =>
        (globalThis as typeof globalThis & { __staleShareEvents?: number })
          .__staleShareEvents,
    ),
  ).toBe(0);
});

test("reports an anchor-only edition mismatch without silently relabeling it", async ({
  page,
}) => {
  await page.goto(
    route(
      "/sdk/?share=anchor&book=demo-book&edition=older-edition" +
        "&chapter=introduction#introduction",
    ),
  );
  await expect(page.locator("#page-turn-book")).toHaveAttribute(
    "data-sdk-ready",
    "true",
  );
  await expect(page.locator("[data-v3-reader]")).toHaveAttribute(
    "data-v3-shared-edition",
    "unresolved",
  );
  await expect(page.locator("[data-v3-share-status]")).toContainText(
    "different publication edition",
  );
  expect(new URL(page.url()).searchParams.get("edition")).toBe("older-edition");
});

test("emits only policy-approved details from repeated contextual shares", async ({
  page,
}) => {
  await page.goto(route("/sdk/?share=quote&quoteMax=12"));
  await expect(page.locator("#page-turn-book")).toHaveAttribute(
    "data-sdk-ready",
    "true",
  );
  await page.locator("[data-v3-chapter-select]").selectOption("introduction");
  const paragraph = page
    .locator("[data-v3-stationary] p[data-source-anchor]")
    .first();
  const selected = await selectText(page, paragraph);
  await page.evaluate(() => {
    document
      .querySelector("[data-v3-reader]")
      ?.addEventListener("pageturn:share-selection", (event) => {
        (
          globalThis as typeof globalThis & { __shareDetails?: unknown[] }
        ).__shareDetails ??= [];
        (
          globalThis as typeof globalThis & { __shareDetails?: unknown[] }
        ).__shareDetails?.push((event as CustomEvent).detail);
      });
  });

  await openComposer(page);
  const first = await page.evaluate(
    () =>
      (globalThis as typeof globalThis & { __shareDetails?: unknown[] })
        .__shareDetails?.[0] as
        | {
            kind: string;
            text?: string;
            target?: { quote: { exact: string } };
            location?: unknown;
          }
        | undefined,
  );
  expect(first).toMatchObject({
    kind: "quote",
    text: selected.slice(0, 12),
    target: { quote: { exact: selected.slice(0, 12) } },
  });
  expect(first?.location).toBeTruthy();
  expect(first?.text).not.toBe(selected);
  await page
    .getByRole("button", { name: "Close share preview" })
    .click();

  await selectText(page, paragraph);
  await openComposer(page);
  const second = await page.evaluate(
    () =>
      (globalThis as typeof globalThis & { __shareDetails?: unknown[] })
        .__shareDetails?.[1] as
        | { kind: string; text?: string; target?: { quote: { exact: string } } }
        | undefined,
  );
  expect(second).toMatchObject({
    kind: "quote",
    text: selected.slice(0, 12),
    target: { quote: { exact: selected.slice(0, 12) } },
  });

  await page.goto(route("/sdk/?share=anchor"));
  await expect(page.locator("#page-turn-book")).toHaveAttribute(
    "data-sdk-ready",
    "true",
  );
  await page.locator("[data-v3-chapter-select]").selectOption("introduction");
  const anchorParagraph = page
    .locator("[data-v3-stationary] p[data-source-anchor]")
    .first();
  await selectText(page, anchorParagraph, true, "Share passage location");
  await page.evaluate(() => {
    document
      .querySelector("[data-v3-reader]")
      ?.addEventListener("pageturn:share-selection", (event) => {
        (
          globalThis as typeof globalThis & { __anchorShareDetail?: unknown }
        ).__anchorShareDetail = (event as CustomEvent).detail;
      });
  });
  await openComposer(page);
  const anchorDetail = await page.evaluate(
    () =>
      (globalThis as typeof globalThis & { __anchorShareDetail?: unknown })
        .__anchorShareDetail as Record<string, unknown>,
  );
  expect(anchorDetail).toMatchObject({ kind: "location" });
  expect(anchorDetail.location).toBeTruthy();
  expect(anchorDetail).not.toHaveProperty("text");
  expect(anchorDetail).not.toHaveProperty("target");
});

test("does not advertise downloads in a sandbox without download permission", async ({
  page,
}) => {
  await page.goto(route("/sdk/"));
  const frame = await page.evaluate((src) => {
    const iframe = document.createElement("iframe");
    iframe.name = "sandboxed-share";
    iframe.sandbox.add("allow-scripts", "allow-same-origin");
    iframe.src = src;
    document.body.append(iframe);
    return iframe.name;
  }, route("/sdk/?share=visual&allowDownload=1"));
  const sandbox = page.frameLocator(`iframe[name="${frame}"]`);
  await expect(sandbox.locator("#page-turn-book")).toHaveAttribute(
    "data-sdk-ready",
    "true",
  );
  await sandbox
    .locator("[data-v3-chapter-select]")
    .selectOption("introduction");
  const paragraph = sandbox
    .locator("[data-v3-stationary] p[data-source-anchor]")
    .first();
  await paragraph.evaluate((node) => {
    const text = document.createTreeWalker(
      node,
      NodeFilter.SHOW_TEXT,
    ).nextNode();
    if (!(text instanceof Text)) {
      throw new Error("Expected publication text");
    }
    const range = document.createRange();
    range.setStart(text, 0);
    range.setEnd(text, Math.min(text.length, 72));
    document.getSelection()?.removeAllRanges();
    document.getSelection()?.addRange(range);
    document.dispatchEvent(new Event("selectionchange"));
  });
  const selectionEntry = sandbox.getByRole("button", {
    name: "Selection actions",
  });
  if (await selectionEntry.isVisible()) {
    await selectionEntry.click();
  }
  const shareAction = sandbox.locator('[data-v3-selection-action="share"]');
  await expect(shareAction).toHaveAccessibleName("Share selected text");
  await shareAction.evaluate((button) => (button as HTMLButtonElement).click());
  const dialog = sandbox.getByRole("dialog", { name: "Share preview" });
  await waitForPreview(dialog);
  await expect(
    dialog.getByRole("button", { name: "Download image" }),
  ).toBeHidden();
  await expect(
    dialog.getByRole("button", { name: "Open image in new tab" }),
  ).toBeVisible();
});

test("invalid policy disables sharing while local copy remains available", async ({
  page,
}) => {
  const paragraph = await openShareFixture(page, "invalid");
  await selectText(page, paragraph, false);
  await expect(
    page.getByRole("button", { name: "Share selected text", exact: true }),
  ).toHaveCount(0);
  const contextualShare = page.locator('[data-v3-selection-action="share"]');
  await expect(contextualShare).toBeHidden();
  await expect(contextualShare).toHaveAttribute(
    "title",
    /share policy is invalid/i,
  );
  await expect(
    page.getByRole("button", { name: "Copy selected text" }),
  ).toBeEnabled();
});

for (const filesSupported of [true, false]) {
  test(`checks the exact File payload when file sharing is ${filesSupported ? "supported" : "unsupported"}`, async ({
    page,
  }) => {
    await page.addInitScript((supportsFiles) => {
      Object.defineProperty(navigator, "canShare", {
        configurable: true,
        value(data: ShareData) {
          (
            globalThis as typeof globalThis & { __canShare?: ShareCapture }
          ).__canShare = {
            title: data.title,
            text: data.text,
            url: data.url,
            files: data.files?.map(({ name, type, size }) => ({
              name,
              type,
              size,
            })),
          };
          return supportsFiles;
        },
      });
      Object.defineProperty(navigator, "share", {
        configurable: true,
        value(data: ShareData) {
          (
            globalThis as typeof globalThis & { __shared?: ShareCapture }
          ).__shared = {
            title: data.title,
            text: data.text,
            url: data.url,
            files: data.files?.map(({ name, type, size }) => ({
              name,
              type,
              size,
            })),
          };
          return Promise.resolve();
        },
      });
    }, filesSupported);
    const paragraph = await openShareFixture(page, "visual");
    const selected = await selectText(page, paragraph);
    const dialog = await openComposer(page);
    await waitForPreview(dialog);
    await dialog.getByRole("button", { name: "Share…" }).click();
    await expect(dialog.locator("[data-v3-share-composer-status]")).toContainText(
      filesSupported
        ? "Quote and link shared"
        : "did not support the generated image",
    );
    const capture = await page.evaluate(() => ({
      canShare: (
        globalThis as typeof globalThis & { __canShare?: ShareCapture }
      ).__canShare,
      shared: (globalThis as typeof globalThis & { __shared?: ShareCapture })
        .__shared,
    }));
    expect(capture.canShare?.files?.[0]).toMatchObject({
      type: "image/png",
    });
    expect(capture.canShare?.files?.[0]?.size).toBeGreaterThan(0);
    expect(capture.canShare?.text).toContain(selected);
    expect(capture.canShare?.url).toContain("selection=");
    expect(capture.shared?.files?.length ?? 0).toBe(filesSupported ? 1 : 0);
    expect(capture.shared?.text).toContain(selected);
  });
}

test("copies equivalent text and PNG and provides download/open actions", async ({
  page,
}) => {
  const paragraph = await openShareFixture(page, "visual");
  const selected = await selectText(page, paragraph);
  const dialog = await openComposer(page);
  await waitForPreview(dialog);

  await dialog.getByRole("button", { name: "Copy quote + link" }).click();
  const copied = await page.evaluate(
    () =>
      (globalThis as typeof globalThis & { __copiedText?: string })
        .__copiedText,
  );
  expect(copied).toContain(selected);
  expect(copied).toContain("Edition: 2026-08");
  expect(copied).toContain("selection=");

  await dialog.getByRole("button", { name: "Copy image" }).click();
  expect(
    await page.evaluate(
      () =>
        (
          globalThis as typeof globalThis & {
            __copiedImageTypes?: string[];
          }
        ).__copiedImageTypes,
    ),
  ).toEqual(["image/png"]);

  const downloadPromise = page.waitForEvent("download");
  await dialog.getByRole("button", { name: "Download image" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/\.png$/);

  await dialog.getByRole("button", { name: "Open image in new tab" }).click();
  expect(
    await page.evaluate(
      () =>
        (globalThis as typeof globalThis & { __openedImage?: string })
          .__openedImage,
    ),
  ).toMatch(/^blob:/);
  await expect(dialog.locator("[data-v3-share-composer-status]")).toContainText(
    "save command or long-press",
  );
});

test("reports OS cancellation and cancels rendering on close and destroy", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.toBlob;
    HTMLCanvasElement.prototype.toBlob = function (
      callback,
      type,
      quality,
    ) {
      globalThis.setTimeout(
        () => original.call(this, callback, type, quality),
        600,
      );
    };
    (
      globalThis as typeof globalThis & { __createdObjectUrls?: number }
    ).__createdObjectUrls = 0;
    (
      globalThis as typeof globalThis & { __revokedObjectUrls?: number }
    ).__revokedObjectUrls = 0;
    const create = URL.createObjectURL.bind(URL);
    const revoke = URL.revokeObjectURL.bind(URL);
    URL.createObjectURL = (value: Blob | MediaSource) => {
      (
        globalThis as typeof globalThis & { __createdObjectUrls?: number }
      ).__createdObjectUrls =
        ((
          globalThis as typeof globalThis & { __createdObjectUrls?: number }
        ).__createdObjectUrls ?? 0) + 1;
      return create(value);
    };
    URL.revokeObjectURL = (value: string) => {
      (
        globalThis as typeof globalThis & { __revokedObjectUrls?: number }
      ).__revokedObjectUrls =
        ((globalThis as typeof globalThis & { __revokedObjectUrls?: number })
          .__revokedObjectUrls ?? 0) + 1;
      revoke(value);
    };
  });
  const errors: Error[] = [];
  page.on("pageerror", (error) => errors.push(error));
  let paragraph = await openShareFixture(page, "visual");
  await selectText(page, paragraph);
  let dialog = await openComposer(page);
  await expect(dialog.locator("[data-v3-share-composer-status]")).toContainText(
    "Generating",
  );
  await dialog.getByRole("button", { name: "Close share preview" }).click();
  await page.waitForTimeout(800);
  expect(
    await page.evaluate(
      () =>
        (
          globalThis as typeof globalThis & {
            __createdObjectUrls?: number;
          }
        ).__createdObjectUrls,
    ),
  ).toBe(0);
  await expect(paragraph).toBeFocused();

  await page.addInitScript(() => {
    Object.defineProperty(navigator, "canShare", {
      configurable: true,
      value: () => false,
    });
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: () =>
        Promise.reject(new DOMException("User cancelled", "AbortError")),
    });
  });
  await page.reload();
  paragraph = page
    .locator("[data-v3-stationary] p[data-source-anchor]")
    .first();
  await expect(page.locator("#page-turn-book")).toHaveAttribute(
    "data-sdk-ready",
    "true",
  );
  await page.locator("[data-v3-chapter-select]").selectOption("introduction");
  await selectText(page, paragraph);
  dialog = await openComposer(page);
  await waitForPreview(dialog);
  await dialog.getByRole("button", { name: "Share…" }).click();
  await expect(dialog.locator("[data-v3-share-composer-status]")).toHaveText(
    "Sharing cancelled.",
  );

  await dialog.getByRole("button", { name: "Close share preview" }).click();
  await selectText(page, paragraph);
  dialog = await openComposer(page);
  await expect(dialog.locator("[data-v3-share-composer-status]")).toContainText(
    "Generating",
  );
  await page.evaluate(() => {
    document
      .querySelector<HTMLButtonElement>("[data-sdk-destroy]")
      ?.click();
  });
  await expect(page.locator("#page-turn-book")).toHaveAttribute(
    "data-sdk-destroyed",
    "true",
  );
  await expect(dialog).toHaveCount(0);
  expect(errors).toEqual([]);

  paragraph = await openShareFixture(page, "visual");
  await selectText(page, paragraph);
  dialog = await openComposer(page);
  await waitForPreview(dialog);
  const revokedSynchronously = await page.evaluate(() => {
    const before =
      (globalThis as typeof globalThis & { __revokedObjectUrls?: number })
        .__revokedObjectUrls ?? 0;
    document
      .querySelector<HTMLButtonElement>("[data-sdk-destroy]")
      ?.click();
    return (
      ((globalThis as typeof globalThis & { __revokedObjectUrls?: number })
        .__revokedObjectUrls ?? 0) - before
    );
  });
  expect(revokedSynchronously).toBe(1);
});
