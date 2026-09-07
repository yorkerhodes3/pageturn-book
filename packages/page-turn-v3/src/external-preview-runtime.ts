import {
  assertPageTurnExternalPreviewIsolation,
  createPageTurnExternalPreviewNonce,
  isPageTurnExternalPreviewReadyMessage,
  matchPageTurnExternalPreviewProvider,
  pageTurnExternalPreviewUrl,
  serializePageTurnExternalPreviewPermissions,
  serializePageTurnExternalPreviewSandbox,
  validatePageTurnExternalPreviewProviders,
  type PageTurnExternalPreviewProvider,
} from "./external-preview.js";

export type PageTurnExternalPreviewRuntimeHandle = Readonly<{
  close(restoreFocus?: boolean): void;
}>;

export type PageTurnExternalPreviewRuntimeOptions = Readonly<{
  window: Window;
  document: Document;
  host: HTMLElement;
  status: HTMLOutputElement;
  loadButton: HTMLButtonElement;
  provider: PageTurnExternalPreviewProvider;
  url: string | URL;
  parentOrigin: string;
  isCurrent(): boolean;
}>;

export function mountPageTurnExternalPreview(
  options: PageTurnExternalPreviewRuntimeOptions,
): PageTurnExternalPreviewRuntimeHandle {
  const provider = validatePageTurnExternalPreviewProviders([
    options.provider,
  ])[0]!;
  const matched = matchPageTurnExternalPreviewProvider([provider], options.url);
  if (!matched || matched.id !== provider.id) {
    throw new Error("PageTurn external preview URL is not uniquely allowlisted");
  }

  let nonce =
    provider.readiness.kind === "message"
      ? createPageTurnExternalPreviewNonce(options.window.crypto)
      : undefined;
  const previewUrl = pageTurnExternalPreviewUrl(
    options.url,
    provider,
    provider.readiness.kind === "message" ? options.parentOrigin : undefined,
    nonce,
  );
  assertPageTurnExternalPreviewIsolation(
    provider,
    previewUrl,
    options.parentOrigin,
  );
  const iframe = options.document.createElement("iframe");
  iframe.className = "v3-source-preview-frame";
  iframe.dataset.v3SourcePreviewFrame = "";
  iframe.title = `External preview from ${provider.id} (${previewUrl.hostname})`;
  iframe.referrerPolicy = "no-referrer";
  iframe.setAttribute(
    "sandbox",
    serializePageTurnExternalPreviewSandbox(provider),
  );
  iframe.setAttribute(
    "allow",
    serializePageTurnExternalPreviewPermissions(provider),
  );
  const close = options.document.createElement("button");
  close.type = "button";
  close.className = "v3-source-preview-close";
  close.textContent = "Close external preview";

  let active = true;
  let timer: number | undefined;
  let iframeWindow: Window | null = null;

  const onMessage = (event: MessageEvent): void => {
    if (
      !active ||
      !options.isCurrent() ||
      provider.readiness.kind !== "message" ||
      event.origin !== provider.readiness.origin ||
      event.source !== iframeWindow ||
      nonce === undefined ||
      !isPageTurnExternalPreviewReadyMessage(
        event.data,
        provider.readiness.messageType,
        nonce,
      )
    ) {
      return;
    }
    cleanupProtocol();
    if (active && options.isCurrent()) {
      options.status.value = "External preview ready.";
    }
  };

  const cleanupProtocol = (): void => {
    if (provider.readiness.kind === "message") {
      options.window.removeEventListener("message", onMessage);
    }
    if (timer !== undefined) {
      options.window.clearTimeout(timer);
      timer = undefined;
    }
    nonce = undefined;
  };

  const closePreview = (restoreFocus = false): void => {
    if (!active) {
      return;
    }
    active = false;
    cleanupProtocol();
    iframe.removeAttribute("src");
    iframe.remove();
    close.remove();
    options.loadButton.hidden = false;
    options.loadButton.disabled = false;
    options.loadButton.textContent = "Load external preview";
    if (options.isCurrent()) {
      options.status.value = "External preview closed.";
      if (restoreFocus) {
        options.loadButton.focus({ preventScroll: true });
      }
    }
  };

  close.addEventListener("click", () => closePreview(true));
  options.host.replaceChildren(close, iframe);
  options.loadButton.hidden = true;
  options.loadButton.disabled = true;
  options.status.value = "Loading external preview…";
  iframeWindow = iframe.contentWindow;
  if (provider.readiness.kind === "message") {
    options.window.addEventListener("message", onMessage);
  }
  timer = options.window.setTimeout(() => {
    timer = undefined;
    if (!active || !options.isCurrent()) {
      cleanupProtocol();
      return;
    }
    cleanupProtocol();
    options.status.value =
      "Preview did not become ready. Readiness could not be confirmed.";
    options.loadButton.hidden = false;
    options.loadButton.disabled = false;
    options.loadButton.textContent = "Retry external preview";
  }, provider.readiness.timeoutMs);
  iframe.src = previewUrl.href;
  close.focus({ preventScroll: true });

  return { close: closePreview };
}
