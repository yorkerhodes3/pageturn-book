const query = new URLSearchParams(globalThis.location.search);
const parentOrigin = query.get("pageturn_parent_origin");
const nonce = query.get("pageturn_nonce");
const mode = query.get("mode") ?? "valid";
const nested = query.get("nested") === "1";

function postReady(target: Window, selectedMode: string): void {
  if (!parentOrigin || !nonce) {
    return;
  }
  const message: Record<string, unknown> = {
    type:
      selectedMode === "invalid-message"
        ? "pageturn-preview-wrong"
        : "pageturn-preview-ready",
    version: 1,
    nonce: selectedMode === "invalid-nonce" ? `${nonce}-wrong` : nonce,
  };
  if (selectedMode === "invalid-schema") {
    message.extra = "not allowed";
  }
  target.postMessage(message, parentOrigin);
}

function nestedProbe(hostname: string): void {
  const child = new URL(globalThis.location.href);
  child.hostname = hostname;
  child.searchParams.set("mode", "valid");
  child.searchParams.set("nested", "1");
  const frame = document.createElement("iframe");
  frame.hidden = true;
  frame.title = "Controlled invalid readiness sender";
  frame.src = child.href;
  document.body.append(frame);
}

if (nested) {
  globalThis.setTimeout(() => postReady(globalThis.parent.parent, "valid"), 25);
} else if (mode === "invalid-source") {
  nestedProbe(globalThis.location.hostname);
} else if (mode === "invalid-origin") {
  nestedProbe(
    globalThis.location.hostname === "localhost" ? "127.0.0.1" : "localhost",
  );
} else if (mode !== "silent") {
  globalThis.setTimeout(
    () => postReady(globalThis.parent, mode),
    mode === "late" ? 750 : 25,
  );
}
