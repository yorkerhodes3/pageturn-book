import {
  isSamePublication,
  PublicationValidationError,
  resolvePublicationManifestUrls,
  validatePublicationManifest,
  type PublicationManifest,
  type ReaderLocation,
  type SemanticLocation,
} from "@ethical-tech/book-publication-model";
import {
  DEFAULT_READER_PREFERENCES,
  type CreateReaderSessionOptions,
  type ReaderCommand,
  type ReaderCommandResult,
  type ReaderError,
  type ReaderPreferences,
  type ReaderRenderer,
  type ReaderSession,
  type ReaderSessionState,
  type ReaderTransition,
  type RendererHandle,
  type RenditionKind,
} from "./types.js";

function isAbortError(error: unknown): boolean {
  return (
    error instanceof DOMException
      ? error.name === "AbortError"
      : error instanceof Error && error.name === "AbortError"
  );
}

function readerError(
  code: ReaderError["code"],
  message: string,
  retryable: boolean,
  cause?: unknown,
  location?: ReaderLocation,
): ReaderError {
  return {
    code,
    message,
    retryable,
    ...(cause === undefined ? {} : { cause }),
    ...(location === undefined ? {} : { location }),
  };
}

function validatePreferences(
  preferences: Partial<ReaderPreferences> | undefined,
): ReaderPreferences {
  const next = {
    ...DEFAULT_READER_PREFERENCES,
    ...preferences,
  };
  if (next.fontScale < 0.75 || next.fontScale > 2) {
    throw new TypeError("fontScale must be between 0.75 and 2");
  }
  if (next.lineHeight < 1.2 || next.lineHeight > 2.4) {
    throw new TypeError("lineHeight must be between 1.2 and 2.4");
  }
  return next;
}

function firstLocation(manifest: PublicationManifest): SemanticLocation {
  const chapter = manifest.renditions.semantic.chapters[0];
  if (!chapter) {
    throw new PublicationValidationError([
      {
        code: "CHAPTERS_EMPTY",
        path: "$.renditions.semantic.chapters",
        message: "Publication has no semantic chapters",
      },
    ]);
  }
  return {
    kind: "semantic",
    bookId: manifest.bookId,
    editionId: manifest.editionId,
    chapterId: chapter.chapterId,
    anchor: chapter.firstAnchor,
  };
}

class ReaderSessionImpl implements ReaderSession {
  readonly #options: CreateReaderSessionOptions;
  readonly #listeners = new Set<(state: ReaderSessionState) => void>();
  readonly #lifecycle = new AbortController();
  readonly #initialization: Promise<void>;
  readonly #fetch: typeof globalThis.fetch;
  #state: ReaderSessionState;
  #renderer: {
    renderer: ReaderRenderer;
    handle: RendererHandle;
  } | undefined;
  #navigation: AbortController | undefined;
  #navigationVersion = 0;
  #unlistenExternalAbort: (() => void) | undefined;

  constructor(options: CreateReaderSessionOptions) {
    this.#options = options;
    this.#fetch = options.fetch ?? globalThis.fetch.bind(globalThis);
    this.#state = {
      status: "loading-manifest",
      rendition: options.initialRendition ?? "semantic",
      preferences: validatePreferences(options.preferences),
    };

    if (options.signal) {
      const abort = () => this.dispose();
      options.signal.addEventListener("abort", abort, { once: true });
      this.#unlistenExternalAbort = () =>
        options.signal?.removeEventListener("abort", abort);
    }

    this.#initialization = this.#initialize();
  }

  getState(): ReaderSessionState {
    return this.#state;
  }

  subscribe(listener: (state: ReaderSessionState) => void): () => void {
    this.#assertActive();
    this.#listeners.add(listener);
    listener(this.#state);
    return () => {
      this.#listeners.delete(listener);
    };
  }

  mount(host: HTMLElement, renderer: ReaderRenderer): () => void {
    this.#assertActive();
    this.#renderer?.handle.destroy();
    const handle = renderer.mount(host, {
      getState: () => this.#state,
      navigate: (location) => this.dispatch({ type: "go-to", location }),
    });
    this.#renderer = { renderer, handle };

    void this.#initialization.then(async () => {
      if (
        this.#state.status === "disposed" ||
        this.#renderer?.handle !== handle ||
        !this.#state.pendingLocation
      ) {
        return;
      }
      await this.#navigate(this.#state.pendingLocation, "initial");
    });

    let unmounted = false;
    return () => {
      if (unmounted) {
        return;
      }
      unmounted = true;
      if (this.#renderer?.handle === handle) {
        this.#navigation?.abort();
        handle.destroy();
        this.#renderer = undefined;
      }
    };
  }

  async dispatch(command: ReaderCommand): Promise<ReaderCommandResult> {
    if (this.#state.status === "disposed") {
      return {
        ok: false,
        error: readerError(
          "LOCATION_INVALID",
          "Reader session has been disposed",
          false,
        ),
      };
    }

    await this.#initialization;
    if (this.#state.status === "error" && command.type !== "retry") {
      return {
        ok: false,
        error:
          this.#state.error ??
          readerError("CONTENT_RENDER_FAILED", "Reader is in an error state", true),
      };
    }

    switch (command.type) {
      case "go-to":
        return this.#navigate(command.location, "navigate");
      case "open":
        return this.#navigate(
          command.location ??
            this.#state.location ??
            this.#state.pendingLocation ??
            this.#requirePublicationLocation(),
          "initial",
        );
      case "next":
        return this.#navigateRelative(1);
      case "previous":
        return this.#navigateRelative(-1);
      case "update-preferences": {
        try {
          const preferences = validatePreferences({
            ...this.#state.preferences,
            ...command.patch,
          });
          this.#setState({ ...this.#state, preferences });
          return { ok: true };
        } catch (error) {
          return {
            ok: false,
            error: readerError(
              "LOCATION_INVALID",
              error instanceof Error ? error.message : "Invalid preferences",
              false,
              error,
            ),
          };
        }
      }
      case "retry": {
        const location =
          this.#state.error?.location ??
          this.#state.location ??
          this.#state.pendingLocation;
        if (!location) {
          return {
            ok: false,
            error: readerError(
              "LOCATION_INVALID",
              "There is no location to retry",
              false,
            ),
          };
        }
        return this.#navigate(location, "none");
      }
      case "close":
        this.#renderer?.handle.destroy();
        this.#renderer = undefined;
        this.#navigation?.abort();
        {
          const {
            pendingLocation: _pendingLocation,
            error: _error,
            ...stableState
          } = this.#state;
          this.#setState({
            ...stableState,
            status: "idle",
          });
        }
        return { ok: true };
    }
  }

  whenReady(): Promise<ReaderSessionState> {
    if (this.#state.status === "ready") {
      return Promise.resolve(this.#state);
    }
    if (this.#state.status === "error" || this.#state.status === "disposed") {
      return Promise.reject(
        this.#state.error ?? new Error(`Reader is ${this.#state.status}`),
      );
    }
    return new Promise((resolve, reject) => {
      let unsubscribe: (() => void) | undefined;
      unsubscribe = this.subscribe((state) => {
        if (state.status === "ready") {
          unsubscribe?.();
          resolve(state);
        } else if (state.status === "error" || state.status === "disposed") {
          unsubscribe?.();
          reject(state.error ?? new Error(`Reader is ${state.status}`));
        }
      });
    });
  }

  dispose(): void {
    if (this.#state.status === "disposed") {
      return;
    }
    this.#lifecycle.abort();
    this.#navigation?.abort();
    this.#renderer?.handle.destroy();
    this.#renderer = undefined;
    this.#unlistenExternalAbort?.();
    this.#unlistenExternalAbort = undefined;
    const {
      pendingLocation: _pendingLocation,
      error: _error,
      ...stableState
    } = this.#state;
    this.#setState({
      ...stableState,
      status: "disposed",
    });
    this.#listeners.clear();
  }

  async #initialize(): Promise<void> {
    try {
      const publication = await this.#loadManifest();
      if (this.#lifecycle.signal.aborted) {
        return;
      }
      const initialLocation = this.#options.initialLocation ?? firstLocation(publication);
      if (!isSamePublication(initialLocation, publication)) {
        throw readerError(
          "LOCATION_INVALID",
          "Initial location belongs to another publication or edition",
          false,
          undefined,
          initialLocation,
        );
      }
      const { error: _error, ...stableState } = this.#state;
      this.#setState({
        ...stableState,
        status: "loading-location",
        publication,
        pendingLocation: initialLocation,
      });
    } catch (error) {
      if (this.#lifecycle.signal.aborted) {
        return;
      }
      const resolved =
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        "message" in error
          ? (error as ReaderError)
          : readerError(
              error instanceof PublicationValidationError &&
                error.issues.some((issue) => issue.code === "SCHEMA_UNSUPPORTED")
                ? "SCHEMA_UNSUPPORTED"
                : error instanceof PublicationValidationError
                  ? "MANIFEST_INVALID"
                  : "MANIFEST_FETCH_FAILED",
              error instanceof Error
                ? error.message
                : "Unable to load publication manifest",
              true,
              error,
            );
      const {
        pendingLocation: _pendingLocation,
        ...stableState
      } = this.#state;
      this.#setState({
        ...stableState,
        status: "error",
        error: resolved,
      });
    }
  }

  async #loadManifest(): Promise<PublicationManifest> {
    const input = this.#options.manifest;
    if (typeof input !== "string" && !(input instanceof URL)) {
      return validatePublicationManifest(input);
    }

    const url = input instanceof URL ? input : new URL(input, globalThis.location?.href);
    let response: Response;
    try {
      response = await this.#fetch(url, {
        signal: this.#lifecycle.signal,
      });
    } catch (error) {
      if (isAbortError(error)) {
        throw error;
      }
      throw readerError(
        "MANIFEST_FETCH_FAILED",
        `Unable to fetch publication manifest at ${url}`,
        true,
        error,
      );
    }
    if (!response.ok) {
      throw readerError(
        "MANIFEST_FETCH_FAILED",
        `Publication manifest request failed with ${response.status}`,
        true,
      );
    }
    const manifest = validatePublicationManifest(await response.json());
    return resolvePublicationManifestUrls(manifest, url);
  }

  async #navigateRelative(direction: -1 | 1): Promise<ReaderCommandResult> {
    const publication = this.#state.publication;
    const current = this.#state.location ?? this.#state.pendingLocation;
    if (!publication || !current || current.kind !== "semantic") {
      return {
        ok: false,
        error: readerError(
          "LOCATION_INVALID",
          "Relative semantic navigation is unavailable",
          false,
        ),
      };
    }
    const chapters = publication.renditions.semantic.chapters;
    const currentIndex = chapters.findIndex(
      (chapter) => chapter.chapterId === current.chapterId,
    );
    const nextChapter = chapters[currentIndex + direction];
    if (!nextChapter) {
      return {
        ok: false,
        error: readerError(
          "LOCATION_INVALID",
          direction === 1
            ? "Already at the final chapter"
            : "Already at the first chapter",
          false,
        ),
      };
    }
    return this.#navigate(
      {
        kind: "semantic",
        bookId: publication.bookId,
        editionId: publication.editionId,
        chapterId: nextChapter.chapterId,
        anchor: nextChapter.firstAnchor,
      },
      "navigate",
    );
  }

  async #navigate(
    location: ReaderLocation,
    transition: ReaderTransition,
  ): Promise<ReaderCommandResult> {
    const publication = this.#state.publication;
    if (!publication || !isSamePublication(location, publication)) {
      return {
        ok: false,
        error: readerError(
          "LOCATION_INVALID",
          "Location is not valid for the active publication",
          false,
          undefined,
          location,
        ),
      };
    }
    const mounted = this.#renderer;
    if (!mounted || mounted.renderer.kind !== this.#renditionFor(location)) {
      const error = readerError(
        "RENDITION_UNAVAILABLE",
        `No ${this.#renditionFor(location)} renderer is mounted`,
        true,
        undefined,
        location,
      );
      this.#setState({
        ...this.#state,
        status: "error",
        error,
        pendingLocation: location,
      });
      return { ok: false, error };
    }

    this.#navigation?.abort();
    const navigation = new AbortController();
    const version = ++this.#navigationVersion;
    this.#navigation = navigation;
    const abortLifecycle = () => navigation.abort();
    this.#lifecycle.signal.addEventListener("abort", abortLifecycle, {
      once: true,
    });
    const { error: _error, ...stableState } = this.#state;
    this.#setState({
      ...stableState,
      status: transition === "initial" ? "loading-location" : "navigating",
      pendingLocation: location,
    });

    try {
      const view = await mounted.handle.prepare(
        location,
        publication,
        navigation.signal,
      );
      if (navigation.signal.aborted || version !== this.#navigationVersion) {
        return { ok: false, aborted: true };
      }
      await mounted.handle.present(view, transition);
      if (navigation.signal.aborted || version !== this.#navigationVersion) {
        return { ok: false, aborted: true };
      }
      const {
        pendingLocation: _pendingLocation,
        error: _readyError,
        ...readyState
      } = this.#state;
      this.#setState({
        ...readyState,
        status: "ready",
        rendition: mounted.renderer.kind,
        location,
      });
      return { ok: true };
    } catch (error) {
      if (isAbortError(error) || navigation.signal.aborted) {
        return { ok: false, aborted: true };
      }
      const resolved = readerError(
        "CONTENT_RENDER_FAILED",
        error instanceof Error ? error.message : "Unable to render content",
        true,
        error,
        location,
      );
      if (version === this.#navigationVersion) {
        this.#setState({
          ...this.#state,
          status: "error",
          error: resolved,
          pendingLocation: location,
        });
      }
      return { ok: false, error: resolved };
    } finally {
      this.#lifecycle.signal.removeEventListener("abort", abortLifecycle);
    }
  }

  #renditionFor(location: ReaderLocation): RenditionKind {
    return location.kind === "semantic" ? "semantic" : "facsimile";
  }

  #requirePublicationLocation(): ReaderLocation {
    const publication = this.#state.publication;
    if (!publication) {
      throw new Error("Publication is not loaded");
    }
    return firstLocation(publication);
  }

  #setState(state: ReaderSessionState): void {
    this.#state = state;
    for (const listener of this.#listeners) {
      listener(state);
    }
  }

  #assertActive(): void {
    if (this.#state.status === "disposed") {
      throw new Error("Reader session has been disposed");
    }
  }
}

export function createReaderSession(
  options: CreateReaderSessionOptions,
): ReaderSession {
  return new ReaderSessionImpl(options);
}
