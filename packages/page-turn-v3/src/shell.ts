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
        <button
          type="button"
          class="v3-appearance"
          data-v3-appearance
          aria-haspopup="dialog"
          aria-label="Book appearance settings"
        ><span aria-hidden="true">&#9881;</span><span>Style</span></button>
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
    class="v3-appearance-dialog"
    data-v3-appearance-dialog
    aria-labelledby="v3-appearance-title"
  >
    <form class="v3-appearance-frame" data-v3-appearance-form>
      <div class="v3-dialog-close">
        <button
          type="button"
          data-v3-close-appearance
          aria-label="Close book appearance settings"
        >Close</button>
      </div>
      <h2 id="v3-appearance-title">Book appearance</h2>
      <p>
        Test material, paper, typography, and physical-page combinations.
        Changes affect this reader session only.
      </p>

      <label class="v3-appearance-wide">
        <span>Preset</span>
        <select data-v3-appearance-preset></select>
      </label>

      <fieldset>
        <legend>Paper</legend>
        <label>
          <span>Paper color</span>
          <input type="color" data-v3-paper-color>
        </label>
        <label>
          <span>Ink color</span>
          <input type="color" data-v3-ink-color>
        </label>
        <label>
          <span>Paper highlight</span>
          <input type="color" data-v3-paper-highlight>
        </label>
        <label>
          <span>Page-edge color</span>
          <input type="color" data-v3-page-edge-color>
        </label>
        <label>
          <span>Page-edge finish</span>
          <select data-v3-page-edge-style>
            <option value="plain">Plain</option>
            <option value="gold">Gold</option>
            <option value="red">Red</option>
            <option value="marbled">Marbled</option>
          </select>
        </label>
        <label>
          <span>Page background</span>
          <select data-v3-page-pattern>
            <option value="plain">Plain</option>
            <option value="lined">Lined journal</option>
            <option value="grid">Lab grid</option>
          </select>
        </label>
        <label>
          <span>Rule color</span>
          <input type="color" data-v3-rule-color>
        </label>
        <label>
          <span>Rule spacing</span>
          <input type="range" min="0.5" max="3" step="0.1" data-v3-rule-spacing>
        </label>
        <label>
          <span>Paper aging</span>
          <input type="range" min="0" max="1" step="0.05" data-v3-paper-age>
        </label>
        <label>
          <span>Paper texture</span>
          <input type="range" min="0" max="0.3" step="0.01" data-v3-paper-texture>
        </label>
      </fieldset>

      <fieldset>
        <legend>Typography</legend>
        <label>
          <span>Typeface</span>
          <select data-v3-typeface>
            <option value="classic">Classic serif</option>
            <option value="antique">Antique serif</option>
            <option value="modern">Modern sans serif</option>
            <option value="technical">Technical monospace</option>
            <option value="handwritten">Handwritten notebook</option>
          </select>
        </label>
        <label>
          <span>Line height</span>
          <input type="range" min="1.25" max="1.8" step="0.01" data-v3-line-height>
        </label>
        <label>
          <span>Base type scale</span>
          <input type="range" min="0.75" max="1.35" step="0.01" data-v3-base-type-scale>
        </label>
        <label class="v3-appearance-checkbox">
          <input type="checkbox" data-v3-drop-cap>
          <span>Decorative opening initial</span>
        </label>
      </fieldset>

      <fieldset>
        <legend>Page geometry</legend>
        <label>
          <span>Gutter lift</span>
          <input type="range" min="0" max="1" step="0.05" data-v3-gutter-lift>
        </label>
        <label>
          <span>Bottom edge lift</span>
          <input type="range" min="0" max="1" step="0.05" data-v3-bottom-lift>
        </label>
        <label>
          <span>Fore-edge lift</span>
          <input type="range" min="0" max="1" step="0.05" data-v3-fore-edge-lift>
        </label>
        <label>
          <span>Corner roundness</span>
          <input type="range" min="0" max="1" step="0.05" data-v3-corner-roundness>
        </label>
        <label>
          <span>Turning fold radius</span>
          <input type="range" min="0" max="1" step="0.05" data-v3-fold-radius>
        </label>
        <label>
          <span>Fold shadow</span>
          <input type="range" min="0" max="1" step="0.05" data-v3-fold-shadow>
        </label>
        <label>
          <span>Board overhang</span>
          <input type="range" min="0" max="1" step="0.05" data-v3-board-overhang>
        </label>
      </fieldset>

      <fieldset>
        <legend>Binding</legend>
        <label>
          <span>Material</span>
          <select data-v3-binding-material>
            <option value="leather">Leather</option>
            <option value="cloth">Cloth</option>
            <option value="paper">Paper cover</option>
          </select>
        </label>
        <label>
          <span>Thickness</span>
          <select data-v3-binding-depth>
            <option value="slim">Slim</option>
            <option value="standard">Standard</option>
            <option value="thick">Thick</option>
          </select>
        </label>
        <label>
          <span>Spine style</span>
          <select data-v3-spine-style>
            <option value="flat">Flat</option>
            <option value="raised-hubs">Raised hubs</option>
            <option value="exposed-stitch">Exposed stitch</option>
          </select>
        </label>
        <label>
          <span>Pages in binding</span>
          <input type="number" min="16" max="1200" step="1" data-v3-page-count>
        </label>
        <label>
          <span>Raised spine hubs</span>
          <input type="number" min="0" max="8" step="1" data-v3-binding-hubs>
        </label>
        <label>
          <span>Cover color</span>
          <input type="color" data-v3-cover-color>
        </label>
        <label>
          <span>Cover text</span>
          <input type="color" data-v3-cover-foreground>
        </label>
        <label>
          <span>Binding color</span>
          <input type="color" data-v3-binding-color>
        </label>
        <label>
          <span>Accent color</span>
          <input type="color" data-v3-accent-color>
        </label>
      </fieldset>

      <div class="v3-appearance-actions">
        <button type="button" data-v3-reset-appearance>
          Reset publication appearance
        </button>
        <output data-v3-appearance-status role="status">
          PageTurn default
        </output>
      </div>
    </form>
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
