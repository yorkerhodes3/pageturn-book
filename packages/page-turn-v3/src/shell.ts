export type PageTurnBookShell = Readonly<{
  root: HTMLElement;
  destroy(): void;
}>;

const shellMarkup = `
  <main class="v3-main">
    <section
      class="v3-reader"
      data-v3-reader
      aria-label="Semantic book reader"
      aria-busy="true"
    >
      <h1 class="v3-visually-hidden" data-v3-publication-title>
        Semantic publication
      </h1>
      <div class="v3-reader-toolbar" role="toolbar" aria-label="Reading controls">
        <a class="v3-back" data-v3-back href="./">Library</a>
        <button
          type="button"
          class="v3-explore"
          data-v3-explore
          aria-haspopup="dialog"
          disabled
        >Explore</button>
        <label class="v3-chapter-picker">
          <span>Chapter</span>
          <select data-v3-chapter-select disabled>
            <option>Loading contents</option>
          </select>
        </label>
        <output data-v3-counter>Preparing book</output>
        <div class="v3-font-controls" role="group" aria-label="Book text size">
          <button
            type="button"
            data-v3-font-decrease
            aria-label="Decrease book text size"
          >A-</button>
          <output data-v3-font-status aria-live="polite">100%</output>
          <button
            type="button"
            data-v3-font-increase
            aria-label="Increase book text size"
          >A+</button>
        </div>
        <label class="v3-media-picker" data-v3-media-picker hidden>
          <span>Images</span>
          <select data-v3-media-treatment aria-label="Image treatment">
            <option value="off">Off</option>
            <option value="on">On page</option>
            <option value="popout">Pop-out</option>
          </select>
        </label>
        <button
          type="button"
          class="v3-share"
          data-v3-share
          aria-label="Share location"
        >Share</button>
        <span class="v3-visually-hidden" data-v3-status role="status">
          Loading semantic pages
        </span>
        <output
          class="v3-visually-hidden"
          data-v3-share-status
          role="status"
          aria-live="polite"
        >Share this chapter or passage</output>
      </div>
      <aside class="v3-resume-notice" data-v3-resume-notice hidden>
        <span data-v3-resume-label>Resumed at your last reading location.</span>
        <button type="button" data-v3-start-over>Start from beginning</button>
      </aside>

      <div class="v3-book-shell">
        <div class="v3-board v3-board-left" aria-hidden="true"></div>
        <div class="v3-board v3-board-right" aria-hidden="true"></div>
        <div class="v3-page-fan v3-page-fan-left" aria-hidden="true"></div>
        <div class="v3-page-fan v3-page-fan-right" aria-hidden="true"></div>
        <div class="v3-spine" aria-hidden="true"></div>

        <div class="v3-spread" data-v3-spread>
          <div class="v3-stationary" data-v3-stationary></div>
          <div class="v3-turn-layer" data-v3-turn-layer></div>
          <div class="v3-entry-cover" data-v3-entry-cover aria-hidden="true">
            <div class="v3-entry-cover-frame">
              <span class="v3-entry-cover-kicker" data-v3-cover-kicker>
                Publication authors
              </span>
              <strong data-v3-cover-title>Semantic publication</strong>
              <span data-v3-cover-subtitle>Complete semantic edition</span>
            </div>
          </div>

          <button
            class="v3-corner v3-corner-left v3-corner-top"
            type="button"
            data-v3-direction="backward"
            data-v3-corner="top"
            aria-label="Turn the previous page from its top corner"
          ></button>
          <button
            class="v3-corner v3-corner-left v3-corner-bottom"
            type="button"
            data-v3-direction="backward"
            data-v3-corner="bottom"
            aria-label="Turn the previous page from its bottom corner"
          ></button>
          <button
            class="v3-corner v3-corner-right v3-corner-top"
            type="button"
            data-v3-direction="forward"
            data-v3-corner="top"
            aria-label="Turn the next page from its top corner"
          ></button>
          <button
            class="v3-corner v3-corner-right v3-corner-bottom"
            type="button"
            data-v3-direction="forward"
            data-v3-corner="bottom"
            aria-label="Turn the next page from its bottom corner"
          ></button>

          <article
            class="v3-sheet v3-sheet-right v3-measure"
            data-v3-measure
            aria-hidden="true"
          >
            <div class="v3-sheet-running">Semantic publication</div>
            <div class="v3-sheet-content" data-v3-measure-content></div>
            <div class="v3-sheet-folio">0</div>
          </article>
        </div>
      </div>

      <nav class="v3-controls" aria-label="Page navigation">
        <button type="button" data-v3-previous aria-label="Previous spread">
          Previous
        </button>
        <button type="button" data-v3-next aria-label="Next spread">Next</button>
      </nav>
    </section>
  </main>

  <dialog
    class="v3-media-dialog"
    data-v3-media-dialog
    aria-labelledby="v3-media-dialog-title"
  >
    <div class="v3-media-dialog-frame">
      <form method="dialog">
        <button type="submit" aria-label="Close figure">Close</button>
      </form>
      <h2 id="v3-media-dialog-title" data-v3-media-dialog-title>
        Publication figure
      </h2>
      <figure>
        <img data-v3-media-dialog-image alt="">
        <figcaption data-v3-media-dialog-caption></figcaption>
      </figure>
    </div>
  </dialog>

  <dialog
    class="v3-explore-dialog"
    data-v3-explore-dialog
    aria-labelledby="v3-explore-title"
  >
    <div class="v3-explore-frame">
      <form method="dialog" class="v3-dialog-close">
        <button type="submit" aria-label="Close book tools">Close</button>
      </form>
      <h2 id="v3-explore-title">Explore this book</h2>
      <p class="v3-private-note">
        Bookmarks and annotations stay in this browser. Nothing is uploaded;
        sharing or export occurs only when you explicitly request it.
      </p>

      <section aria-labelledby="v3-contents-title">
        <h3 id="v3-contents-title">Contents</h3>
        <nav data-v3-contents aria-label="Book contents"></nav>
      </section>

      <section aria-labelledby="v3-search-title">
        <h3 id="v3-search-title">Search</h3>
        <form data-v3-search-form class="v3-search-form">
          <label>
            <span class="v3-visually-hidden">Search this book</span>
            <input
              type="search"
              data-v3-search-input
              minlength="2"
              placeholder="Search this book"
            >
          </label>
          <button type="submit">Search</button>
        </form>
        <p data-v3-search-status role="status">
          Search loads a lightweight text index only when requested.
        </p>
        <ol data-v3-search-results class="v3-tool-list"></ol>
      </section>

      <section aria-labelledby="v3-bookmarks-title">
        <div class="v3-tool-heading">
          <h3 id="v3-bookmarks-title">Bookmarks</h3>
          <button type="button" data-v3-bookmark-current>
            Bookmark current passage
          </button>
        </div>
        <ol data-v3-bookmark-list class="v3-tool-list"></ol>
      </section>

      <section aria-labelledby="v3-annotations-title">
        <div class="v3-tool-heading">
          <h3 id="v3-annotations-title">Private annotations</h3>
          <button type="button" data-v3-export-annotations disabled>
            Export Markdown
          </button>
        </div>
        <blockquote data-v3-selection-preview hidden></blockquote>
        <label class="v3-annotation-editor">
          <span>Note on selected text</span>
          <textarea
            data-v3-annotation-note
            rows="3"
            maxlength="4000"
            disabled
          ></textarea>
        </label>
        <button type="button" data-v3-save-annotation disabled>
          Save selected text
        </button>
        <ol data-v3-annotation-list class="v3-tool-list"></ol>
      </section>
    </div>
  </dialog>
`;

export function mountPageTurnBookShell(host: HTMLElement): PageTurnBookShell {
  const template = host.ownerDocument.createElement("template");
  template.innerHTML = shellMarkup;
  host.classList.add("pageturn-book", "v3-page");
  host.replaceChildren(template.content.cloneNode(true));

  let destroyed = false;
  return {
    root: host,
    destroy() {
      if (destroyed) {
        return;
      }
      destroyed = true;
      host.replaceChildren();
      host.classList.remove("pageturn-book", "v3-page", "v3-page-embedded");
    },
  };
}
