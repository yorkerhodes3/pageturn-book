export type PageTurnExternalPreviewProvider = Readonly<{
  id: string;
  origins: readonly string[];
  pathPrefixes: readonly string[];
  sandbox: readonly string[];
  permissions: readonly string[];
  readiness:
    | Readonly<{
        kind: "message";
        origin: string;
        messageType: string;
        timeoutMs: number;
      }>
    | Readonly<{
        kind: "timeout";
        timeoutMs: number;
      }>;
}>;

export const PAGE_TURN_EXTERNAL_PREVIEW_MIN_TIMEOUT_MS = 250;
export const PAGE_TURN_EXTERNAL_PREVIEW_MAX_TIMEOUT_MS = 15_000;

const SAFE_PROVIDER_ID = /^[a-z0-9](?:[a-z0-9._-]{0,62}[a-z0-9])?$/;
const SAFE_MESSAGE_TYPE = /^[A-Za-z][A-Za-z0-9._:-]{0,127}$/;
const FORBIDDEN_PATH_ENCODING = /%(?:25|2f|5c)/i;
const ALLOWED_SANDBOX_TOKENS = new Set([
  "allow-forms",
  "allow-modals",
  "allow-orientation-lock",
  "allow-pointer-lock",
  "allow-popups",
  "allow-presentation",
  "allow-same-origin",
  "allow-scripts",
  "allow-storage-access-by-user-activation",
]);
const DANGEROUS_SANDBOX_TOKENS = new Set([
  "allow-downloads",
  "allow-popups-to-escape-sandbox",
  "allow-top-navigation",
  "allow-top-navigation-by-user-activation",
  "allow-top-navigation-to-custom-protocols",
]);
const ALLOWED_PERMISSION_TOKENS = new Set([
  "autoplay",
  "encrypted-media",
  "fullscreen",
  "picture-in-picture",
]);

function previewError(message: string): Error {
  return new Error(`Invalid PageTurn external preview provider: ${message}`);
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function exactOrigin(value: unknown, field: string): string {
  if (typeof value !== "string") {
    throw previewError(`${field} must be an exact HTTP(S) origin`);
  }
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw previewError(`${field} must be an exact HTTP(S) origin`);
  }
  if (
    (url.protocol !== "http:" && url.protocol !== "https:") ||
    url.username !== "" ||
    url.password !== "" ||
    url.hostname.includes("*") ||
    url.pathname !== "/" ||
    url.search !== "" ||
    url.hash !== "" ||
    value !== url.origin
  ) {
    throw previewError(
      `${field} must be a canonical HTTP(S) origin without credentials, path, query, or fragment`,
    );
  }
  return value;
}

function pathPrefix(value: unknown, field: string): string {
  if (
    typeof value !== "string" ||
    value.length < 2 ||
    value.length > 2_000 ||
    !value.startsWith("/") ||
    value.endsWith("/") ||
    value.includes("*") ||
    value.includes("\\") ||
    FORBIDDEN_PATH_ENCODING.test(value) ||
    /[\u0000-\u001F\u007F?#]/.test(value)
  ) {
    throw previewError(
      `${field} must be a normalized, non-root pathname prefix without wildcards`,
    );
  }
  const normalized = new URL(value, "https://pageturn.invalid").pathname;
  if (normalized !== value || value.split("/").some((part) => part === "." || part === "..")) {
    throw previewError(`${field} must be a normalized pathname prefix`);
  }
  return value;
}

function uniqueStringArray(
  value: unknown,
  field: string,
  validate: (entry: unknown, field: string) => string,
  allowEmpty = false,
): readonly string[] {
  if (!Array.isArray(value) || (!allowEmpty && value.length === 0)) {
    throw previewError(`${field} must be a${allowEmpty ? "" : " non-empty"} string array`);
  }
  const result = value.map((entry, index) =>
    validate(entry, `${field}[${index}]`),
  );
  if (new Set(result).size !== result.length) {
    throw previewError(`${field} must not contain duplicates`);
  }
  return result;
}

function token(
  value: unknown,
  field: string,
  allowed: ReadonlySet<string>,
  dangerous?: ReadonlySet<string>,
): string {
  if (typeof value !== "string" || dangerous?.has(value)) {
    throw previewError(`${field} is dangerous and is not permitted`);
  }
  if (!allowed.has(value)) {
    throw previewError(`${field} is unknown or is not permitted`);
  }
  return value;
}

function timeout(value: unknown, field: string): number {
  if (
    !Number.isSafeInteger(value) ||
    (value as number) < PAGE_TURN_EXTERNAL_PREVIEW_MIN_TIMEOUT_MS ||
    (value as number) > PAGE_TURN_EXTERNAL_PREVIEW_MAX_TIMEOUT_MS
  ) {
    throw previewError(
      `${field} must be an integer from ${PAGE_TURN_EXTERNAL_PREVIEW_MIN_TIMEOUT_MS} to ${PAGE_TURN_EXTERNAL_PREVIEW_MAX_TIMEOUT_MS} milliseconds`,
    );
  }
  return value as number;
}

export function validatePageTurnExternalPreviewProviders(
  providers: readonly PageTurnExternalPreviewProvider[] | undefined,
): readonly PageTurnExternalPreviewProvider[] {
  if (providers === undefined) {
    return [];
  }
  if (!Array.isArray(providers)) {
    throw previewError("externalPreviewProviders must be an array");
  }
  const validated = providers.map((provider, providerIndex) => {
    const field = `externalPreviewProviders[${providerIndex}]`;
    if (!isRecord(provider)) {
      throw previewError(`${field} must be an object`);
    }
    if (typeof provider.id !== "string" || !SAFE_PROVIDER_ID.test(provider.id)) {
      throw previewError(`${field}.id must be a safe lowercase identifier`);
    }
    const origins = uniqueStringArray(provider.origins, `${field}.origins`, exactOrigin);
    const pathPrefixes = uniqueStringArray(
      provider.pathPrefixes,
      `${field}.pathPrefixes`,
      pathPrefix,
    );
    const sandbox = uniqueStringArray(
      provider.sandbox,
      `${field}.sandbox`,
      (value, entryField) =>
        token(
          value,
          entryField,
          ALLOWED_SANDBOX_TOKENS,
          DANGEROUS_SANDBOX_TOKENS,
        ),
      true,
    );
    const permissions = uniqueStringArray(
      provider.permissions,
      `${field}.permissions`,
      (value, entryField) =>
        token(value, entryField, ALLOWED_PERMISSION_TOKENS),
      true,
    );
    if (!isRecord(provider.readiness)) {
      throw previewError(`${field}.readiness must be an object`);
    }
    const timeoutMs = timeout(
      provider.readiness.timeoutMs,
      `${field}.readiness.timeoutMs`,
    );
    const readiness =
      provider.readiness.kind === "message"
        ? (() => {
            if (
              !sandbox.includes("allow-scripts") ||
              !sandbox.includes("allow-same-origin")
            ) {
              throw previewError(
                `${field}.sandbox must include allow-scripts and allow-same-origin for message readiness`,
              );
            }
            const origin = exactOrigin(
              provider.readiness.origin,
              `${field}.readiness.origin`,
            );
            if (!origins.includes(origin)) {
              throw previewError(
                `${field}.readiness.origin must be one of the provider origins`,
              );
            }
            if (
              typeof provider.readiness.messageType !== "string" ||
              !SAFE_MESSAGE_TYPE.test(provider.readiness.messageType)
            ) {
              throw previewError(
                `${field}.readiness.messageType must be a safe message identifier`,
              );
            }
            return {
              kind: "message" as const,
              origin,
              messageType: provider.readiness.messageType,
              timeoutMs,
            };
          })()
        : provider.readiness.kind === "timeout"
          ? { kind: "timeout" as const, timeoutMs }
          : (() => {
              throw previewError(`${field}.readiness.kind is unknown`);
            })();
    return {
      id: provider.id,
      origins,
      pathPrefixes,
      sandbox,
      permissions,
      readiness,
    };
  });
  if (new Set(validated.map(({ id }) => id)).size !== validated.length) {
    throw previewError("provider ids must be unique");
  }
  return validated;
}

function safePreviewUrl(value: string | URL): URL | undefined {
  let url: URL;
  try {
    url = new URL(value.toString());
  } catch {
    return undefined;
  }
  return (url.protocol === "http:" || url.protocol === "https:") &&
    url.username === "" &&
    url.password === "" &&
    !FORBIDDEN_PATH_ENCODING.test(url.pathname)
    ? url
    : undefined;
}

export function assertPageTurnExternalPreviewIsolation(
  provider: Pick<PageTurnExternalPreviewProvider, "sandbox">,
  previewUrl: string | URL,
  parentOrigin: string,
): void {
  if (
    !provider.sandbox.includes("allow-scripts") ||
    !provider.sandbox.includes("allow-same-origin")
  ) {
    return;
  }
  const url = safePreviewUrl(previewUrl);
  let parent: URL;
  try {
    parent = new URL(parentOrigin);
  } catch {
    throw new Error(
      "PageTurn script-capable external previews require a dedicated HTTP(S) origin",
    );
  }
  if (
    !url ||
    (parent.protocol !== "http:" && parent.protocol !== "https:") ||
    parentOrigin !== parent.origin ||
    url.origin === parent.origin
  ) {
    throw new Error(
      "PageTurn script-capable external previews require a dedicated origin",
    );
  }
}

export function pageTurnExternalPreviewProviderMatches(
  provider: PageTurnExternalPreviewProvider,
  value: string | URL,
): boolean {
  const url = safePreviewUrl(value);
  return (
    url !== undefined &&
    provider.origins.includes(url.origin) &&
    provider.pathPrefixes.some(
      (prefix) =>
        url.pathname === prefix || url.pathname.startsWith(`${prefix}/`),
    )
  );
}

export function matchPageTurnExternalPreviewProvider(
  providers: readonly PageTurnExternalPreviewProvider[],
  value: string | URL,
): PageTurnExternalPreviewProvider | undefined {
  const matches = providers.filter((provider) =>
    pageTurnExternalPreviewProviderMatches(provider, value),
  );
  return matches.length === 1 ? matches[0] : undefined;
}

export function createPageTurnExternalPreviewNonce(
  cryptoSource: Pick<Crypto, "getRandomValues"> = globalThis.crypto,
): string {
  if (!cryptoSource?.getRandomValues) {
    throw new Error("PageTurn external preview needs cryptographic randomness");
  }
  const bytes = new Uint8Array(16);
  cryptoSource.getRandomValues(bytes);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export function pageTurnExternalPreviewUrl(
  value: string | URL,
  provider: PageTurnExternalPreviewProvider,
  parentOrigin?: string,
  nonce?: string,
): URL {
  const url = safePreviewUrl(value);
  if (!url || !pageTurnExternalPreviewProviderMatches(provider, url)) {
    throw new Error("PageTurn external preview URL is not allowlisted by the provider");
  }
  if (provider.readiness.kind === "message") {
    const origin = exactOrigin(parentOrigin, "pageturn_parent_origin");
    if (!nonce || !/^[A-Za-z0-9_-]{22}$/.test(nonce)) {
      throw new Error("PageTurn external preview nonce must contain 128-bit base64url data");
    }
    url.searchParams.set("pageturn_parent_origin", origin);
    url.searchParams.set("pageturn_nonce", nonce);
  }
  return url;
}

export function isPageTurnExternalPreviewReadyMessage(
  value: unknown,
  messageType: string,
  nonce: string,
): boolean {
  if (!isRecord(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    return false;
  }
  const keys = Reflect.ownKeys(value);
  if (
    keys.length !== 3 ||
    !keys.includes("type") ||
    !keys.includes("version") ||
    !keys.includes("nonce")
  ) {
    return false;
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  return (
    "value" in descriptors.type! &&
    descriptors.type.value === messageType &&
    "value" in descriptors.version! &&
    descriptors.version.value === 1 &&
    "value" in descriptors.nonce! &&
    descriptors.nonce.value === nonce
  );
}

export function serializePageTurnExternalPreviewSandbox(
  provider: Pick<PageTurnExternalPreviewProvider, "sandbox">,
): string {
  return provider.sandbox.join(" ");
}

export function serializePageTurnExternalPreviewPermissions(
  provider: Pick<PageTurnExternalPreviewProvider, "permissions">,
): string {
  return provider.permissions.join("; ");
}
