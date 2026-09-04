import type {
  PublicationManifest,
  ReaderLocation,
} from "@ethical-tech/book-publication-model";

export type RenditionKind =
  | "semantic"
  | "facsimile"
  | "legacy-facsimile";

export type ReaderStatus =
  | "idle"
  | "loading-manifest"
  | "loading-location"
  | "ready"
  | "navigating"
  | "error"
  | "disposed";

export type ReaderPreferences = {
  colorScheme: "system" | "light" | "dark";
  readingMode: "book" | "academic";
  fontFamily: "serif" | "sans";
  fontScale: number;
  lineHeight: number;
  contentWidth: "narrow" | "standard" | "wide";
  motion: "system" | "reduced" | "full";
};

export const DEFAULT_READER_PREFERENCES: Readonly<ReaderPreferences> = {
  colorScheme: "system",
  readingMode: "book",
  fontFamily: "serif",
  fontScale: 1,
  lineHeight: 1.7,
  contentWidth: "standard",
  motion: "system",
};

export type ReaderErrorCode =
  | "MANIFEST_FETCH_FAILED"
  | "MANIFEST_INVALID"
  | "SCHEMA_UNSUPPORTED"
  | "RENDITION_UNAVAILABLE"
  | "LOCATION_INVALID"
  | "CONTENT_FETCH_FAILED"
  | "CONTENT_RENDER_FAILED"
  | "NAVIGATION_ABORTED"
  | "STORAGE_UNAVAILABLE"
  | "ANNOTATION_UNRESOLVED"
  | "LEGACY_VIEWER_FAILED";

export type ReaderError = {
  code: ReaderErrorCode;
  message: string;
  retryable: boolean;
  cause?: unknown;
  location?: ReaderLocation;
};

export type ReaderSessionState = {
  status: ReaderStatus;
  publication?: PublicationManifest;
  rendition?: RenditionKind;
  location?: ReaderLocation;
  pendingLocation?: ReaderLocation;
  preferences: ReaderPreferences;
  error?: ReaderError;
};

export type ReaderCommand =
  | { type: "open"; location?: ReaderLocation }
  | { type: "next" }
  | { type: "previous" }
  | { type: "go-to"; location: ReaderLocation }
  | { type: "update-preferences"; patch: Partial<ReaderPreferences> }
  | { type: "retry" }
  | { type: "close" };

export type ReaderCommandResult =
  | { ok: true }
  | { ok: false; aborted: true }
  | { ok: false; error: ReaderError };

export type PreparedView = {
  location: ReaderLocation;
  payload: unknown;
};

export type ReaderTransition = "initial" | "navigate" | "none";

export type RendererContext = {
  getState(): ReaderSessionState;
  navigate(location: ReaderLocation): Promise<ReaderCommandResult>;
};

export type RendererHandle = {
  prepare(
    location: ReaderLocation,
    publication: PublicationManifest,
    signal: AbortSignal,
  ): Promise<PreparedView>;
  present(
    view: PreparedView,
    transition: ReaderTransition,
  ): Promise<void>;
  getVisibleLocation(): ReaderLocation | undefined;
  focusContent(): void;
  destroy(): void;
};

export type ReaderRenderer = {
  kind: RenditionKind;
  mount(host: HTMLElement, context: RendererContext): RendererHandle;
};

export type CreateReaderSessionOptions = {
  manifest: PublicationManifest | URL | string;
  initialLocation?: ReaderLocation;
  initialRendition?: RenditionKind;
  preferences?: Partial<ReaderPreferences>;
  signal?: AbortSignal;
  fetch?: typeof globalThis.fetch;
};

export type ReaderSession = {
  getState(): ReaderSessionState;
  subscribe(listener: (state: ReaderSessionState) => void): () => void;
  mount(host: HTMLElement, renderer: ReaderRenderer): () => void;
  dispatch(command: ReaderCommand): Promise<ReaderCommandResult>;
  whenReady(): Promise<ReaderSessionState>;
  dispose(): void;
};

