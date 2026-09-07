import { describe, expect, it } from "vitest";
import {
  assertPageTurnExternalPreviewIsolation,
  createPageTurnExternalPreviewNonce,
  isPageTurnExternalPreviewReadyMessage,
  matchPageTurnExternalPreviewProvider,
  pageTurnExternalPreviewProviderMatches,
  pageTurnExternalPreviewUrl,
  serializePageTurnExternalPreviewPermissions,
  serializePageTurnExternalPreviewSandbox,
  validatePageTurnExternalPreviewProviders,
  type PageTurnExternalPreviewProvider,
} from "./external-preview.js";

function provider(
  overrides: Partial<PageTurnExternalPreviewProvider> = {},
): PageTurnExternalPreviewProvider {
  return {
    id: "controlled-preview",
    origins: ["https://preview.example"],
    pathPrefixes: ["/embed/book"],
    sandbox: ["allow-scripts", "allow-same-origin"],
    permissions: ["fullscreen", "picture-in-picture"],
    readiness: {
      kind: "message",
      origin: "https://preview.example",
      messageType: "pageturn-preview-ready",
      timeoutMs: 2_000,
    },
    ...overrides,
  };
}

describe("PageTurn external preview provider validation", () => {
  it("accepts the exact contract and returns isolated validated records", () => {
    const input = provider();
    const [validated] = validatePageTurnExternalPreviewProviders([input]);
    expect(validated).toEqual(input);
    expect(validated).not.toBe(input);
  });

  it.each([
    ["duplicate ids", [provider(), provider()]],
    ["unsafe id", [provider({ id: "../escape" })]],
    ["origin path", [provider({ origins: ["https://preview.example/path"] })]],
    ["origin credentials", [provider({ origins: ["https://a@preview.example"] })]],
    ["origin wildcard", [provider({ origins: ["https://*.example"] })]],
    ["path wildcard", [provider({ pathPrefixes: ["/embed/*"] })]],
    ["path traversal", [provider({ pathPrefixes: ["/embed/../admin"] })]],
    ["path trailing slash", [provider({ pathPrefixes: ["/embed/"] })]],
    ["short timeout", [provider({ readiness: { kind: "timeout", timeoutMs: 249 } })]],
    ["long timeout", [provider({ readiness: { kind: "timeout", timeoutMs: 15_001 } })]],
    ["unknown sandbox", [provider({ sandbox: ["allow-mystery"] })]],
    ["top navigation", [provider({ sandbox: ["allow-top-navigation"] })]],
    ["popup escape", [provider({ sandbox: ["allow-popups-to-escape-sandbox"] })]],
    ["unactivated download", [provider({ sandbox: ["allow-downloads"] })]],
    ["unknown permission", [provider({ permissions: ["camera"] })]],
    [
      "opaque message origin",
      [provider({ sandbox: ["allow-scripts"] })],
    ],
    [
      "readiness origin outside provider",
      [
        provider({
          readiness: {
            kind: "message",
            origin: "https://other.example",
            messageType: "pageturn-preview-ready",
            timeoutMs: 1_000,
          },
        }),
      ],
    ],
    [
      "unsafe message type",
      [
        provider({
          readiness: {
            kind: "message",
            origin: "https://preview.example",
            messageType: "ready message",
            timeoutMs: 1_000,
          },
        }),
      ],
    ],
  ])("rejects %s", (_label, input) => {
    expect(() =>
      validatePageTurnExternalPreviewProviders(
        input as readonly PageTurnExternalPreviewProvider[],
      ),
    ).toThrow(/Invalid PageTurn external preview provider/);
  });
});

describe("PageTurn external preview matching and URL construction", () => {
  it("matches exact origins and pathname boundaries only", () => {
    const candidate = provider();
    expect(
      pageTurnExternalPreviewProviderMatches(
        candidate,
        "https://preview.example/embed/book",
      ),
    ).toBe(true);
    expect(
      pageTurnExternalPreviewProviderMatches(
        candidate,
        "https://preview.example/embed/book/chapter?x=1#part",
      ),
    ).toBe(true);
    expect(
      pageTurnExternalPreviewProviderMatches(
        candidate,
        "https://preview.example/embed/bookish",
      ),
    ).toBe(false);
    expect(
      pageTurnExternalPreviewProviderMatches(
        candidate,
        "https://preview.example/embed/book/%252F..%252Fadmin",
      ),
    ).toBe(false);
    expect(
      pageTurnExternalPreviewProviderMatches(
        candidate,
        "https://preview.example.evil/embed/book",
      ),
    ).toBe(false);
  });

  it("returns no provider when zero or multiple providers match", () => {
    const url = "https://preview.example/embed/book/one";
    expect(matchPageTurnExternalPreviewProvider([], url)).toBeUndefined();
    expect(
      matchPageTurnExternalPreviewProvider(
        [provider(), provider({ id: "controlled-preview-two" })],
        url,
      ),
    ).toBeUndefined();
  });

  it("preserves query and fragment while replacing protocol parameters", () => {
    const url = pageTurnExternalPreviewUrl(
      "https://preview.example/embed/book/one?edition=2&pageturn_nonce=old#page-3",
      provider(),
      "https://reader.example",
      "AAAAAAAAAAAAAAAAAAAAAA",
    );
    expect(url.hash).toBe("#page-3");
    expect(url.searchParams.get("edition")).toBe("2");
    expect(url.searchParams.getAll("pageturn_nonce")).toEqual([
      "AAAAAAAAAAAAAAAAAAAAAA",
    ]);
    expect(url.searchParams.get("pageturn_parent_origin")).toBe(
      "https://reader.example",
    );
  });

  it("does not add protocol parameters for timeout providers", () => {
    const url = pageTurnExternalPreviewUrl(
      "https://preview.example/embed/book?edition=2#page-3",
      provider({ readiness: { kind: "timeout", timeoutMs: 500 } }),
    );
    expect(url.href).toBe(
      "https://preview.example/embed/book?edition=2#page-3",
    );
  });

  it("rejects message previews from an opaque parent origin", () => {
    expect(() =>
      pageTurnExternalPreviewUrl(
        "https://preview.example/embed/book",
        provider(),
        "null",
        "AAAAAAAAAAAAAAAAAAAAAA",
      ),
    ).toThrow(/exact HTTP\(S\) origin/);
  });

  it("requires a dedicated origin for script-capable previews", () => {
    expect(() =>
      assertPageTurnExternalPreviewIsolation(
        provider(),
        "https://preview.example/embed/book",
        "https://preview.example",
      ),
    ).toThrow(/dedicated origin/);
    expect(() =>
      assertPageTurnExternalPreviewIsolation(
        provider(),
        "https://preview.example/embed/book",
        "https://reader.example",
      ),
    ).not.toThrow();
  });
});

describe("PageTurn external preview protocol helpers", () => {
  it("creates a 128-bit unpadded base64url nonce", () => {
    let requestedLength = 0;
    const nonce = createPageTurnExternalPreviewNonce({
      getRandomValues: <T extends ArrayBufferView | null>(array: T): T => {
        requestedLength = array?.byteLength ?? 0;
        new Uint8Array(array!.buffer, array!.byteOffset, array!.byteLength).set(
          Array.from({ length: 16 }, (_, index) => index),
        );
        return array;
      },
    });
    expect(requestedLength).toBe(16);
    expect(nonce).toBe("AAECAwQFBgcICQoLDA0ODw");
    expect(nonce).toMatch(/^[A-Za-z0-9_-]{22}$/);
  });

  it("accepts only a plain exact type/version/nonce schema", () => {
    const valid = {
      type: "pageturn-preview-ready",
      version: 1,
      nonce: "nonce",
    };
    expect(
      isPageTurnExternalPreviewReadyMessage(
        valid,
        "pageturn-preview-ready",
        "nonce",
      ),
    ).toBe(true);
    for (const invalid of [
      { ...valid, version: 2 },
      { ...valid, nonce: "other" },
      { ...valid, type: "other" },
      { ...valid, extra: true },
      ["pageturn-preview-ready", 1, "nonce"],
      Object.assign(Object.create({ inherited: true }), valid),
    ]) {
      expect(
        isPageTurnExternalPreviewReadyMessage(
          invalid,
          "pageturn-preview-ready",
          "nonce",
        ),
      ).toBe(false);
    }
  });

  it("serializes validated iframe capabilities", () => {
    const candidate = provider();
    expect(serializePageTurnExternalPreviewSandbox(candidate)).toBe(
      "allow-scripts allow-same-origin",
    );
    expect(serializePageTurnExternalPreviewPermissions(candidate)).toBe(
      "fullscreen; picture-in-picture",
    );
  });
});
