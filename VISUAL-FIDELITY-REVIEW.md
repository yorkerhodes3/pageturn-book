# V2 visual fidelity review

## Baseline

This review compares:

- The pinned legacy `read-as-book` viewer at revision `d1d1ec6`.
- The V2 semantic reader.
- The real 46-page *What Is Ethical AI?* edition.
- The six supplied legacy/V2 comparison captures.

The legacy viewer delegates its soft-page geometry to StPageFlip. That engine:

1. Calculates a fold from the grabbed top or bottom corner.
2. Clips the moving page to a polygon.
3. Keeps the binding edge fixed.
4. Positions and rotates the clipped page around the active corner.
5. Draws separate inner and outer fold shadows.

V2 must preserve semantic HTML, selection, links, and accessibility, so it
cannot simply rasterize the publication and reproduce the legacy result
pixel-for-pixel.

## Findings and changes

### 1. Dragged-page fidelity

**Finding:** The earlier V2 leaf was a mostly rectangular plane with rounded
corners. It read as a flexible card rather than a corner-driven paper fold.

**Change:** The moving semantic leaf now uses a two-phase, progress-driven
polygon whose top fold, bottom fold, active tip, and corner origin change
independently. The front curls toward the gutter while pinned to the original
binding edge; the reverse then unfolds from the opposite gutter edge. Edge
shortening, lift, fold shadow, and sheen remain CSS-driven. Four drag phases
are covered by browser regression tests.

### 2. Content on the revealed side

**Finding:** A page turn needs three coordinated surfaces:

- The outgoing page on the moving leaf front.
- The adjacent destination page on the leaf reverse.
- The other destination page under the moving leaf.

**Change:** Forward and backward turns use that physical mapping. Continuation
pages retain one canonical source location and do not create duplicate browser
history entries.

### 3. Cover and inner-cover information

**Finding:** The legacy first pages contain substantially more publication
information than the earlier decorative V2 cover.

**Change:** The outer binding stays visually concise. Opening it now reveals:

1. An inner-cover publication record with credits and canonical URL.
2. A designed title page with institutional line, title, subtitle, author, and
   publication date.
3. A thesis page.
4. Linkable contents pages.
5. An imprint and notes page.

### 4. Missing first-page text

**Finding:** Legacy page 2 contains the paper thesis and standing disclaimer.
V2 previously opened directly on Executive Summary.

**Change:** The thesis is now a dedicated semantic front-matter page. The
disclaimer and notes status are on the imprint page.

### 5. Missing table of contents

**Finding:** The manifest already contained a semantic table of contents, but
book mode did not render it.

**Change:** Book mode creates multiple contents leaves from the manifest.
Chapter and subsection titles are links. Activating one updates the canonical
reader location and opens the corresponding semantic page.

### 6. Curl reveal

**Finding:** Legacy exposes the destination through a strong triangular fold
with directional shadows. The earlier V2 bend was broad and visually weak.

**Change:** V2 clips the free edge around the active corner while the binding
edge remains present. At halfway the polygon changes sides at the gutter, then
expands as the reverse leaf unfolds. Variable-radius curl and inner/outer
shading expose more of the destination as drag progress increases.

### 7. Binding attachment

**Finding:** Transforming the whole surface made the page appear detached from
the gutter in some frames.

**Change:** A forward leaf starts with a left-edge transform origin on the
right page, then finishes with a right-edge origin on the left page. Backward
turns mirror that sequence. The clipped polygon always includes the complete
active binding edge.

### 8. Adjustable font size

**Finding:** V2 had a single book-mode type size even though semantic text
supports responsive reflow.

**Change:** Book mode provides 80%, 90%, 100%, 110%, 120%, and 130% settings.
Changing size rebuilds presentation pages around source-span offsets, keeping
the current semantic passage visible without changing its canonical citation
anchor.

### 9. Page layout and bottom margin

**Finding:** Text could run visually into the bottom of the paper even when it
was technically clipped.

**Change:** Content and folio are separate flex regions. Body pages use
print-like type proportions, a protected footer, running title, folio number,
and responsive block/sentence pagination. Exhaustive Edge/Chromium validation
traversed all 99 desktop and 221 phone body pages with no internal page
overflow; the committed browser suite covers representative early spreads,
breakpoint transitions, font scaling, and final-page mapping.

### 10. Footnotes and endnotes

**Finding:** The designed PDF contains page footnotes. The canonical
`REPORT.md` and website semantic data contain a complete Works Cited but no
footnote markers, definitions, or citation-to-note mapping. The report build
has `markdown-it-footnote` installed, but the source contains zero footnote
tokens.

**Decision:** V2 does not invent a mapping. The imprint page states the source
limitation and links to the complete Works Cited. A reliable semantic endnotes
section requires canonical note callouts and definitions.

### 11. Reversed text during a turn

**Finding:** Reversed text becomes visible when front/back face selection and
the parent rotation are not synchronized.

**Change:** The leaf has one front and one reverse semantic face. The front is
visible during the first gutter-bound phase; the correctly oriented reverse is
composited after halfway and unfolds on the opposite side. This avoids relying
on a flattened 3D backface or a mirrored text layer. Tests inspect distinct
front/back content at forward and backward drag phases.

## Remaining visual boundary

The new curl is a lightweight CSS polygon approximation. Legacy uses a
continuously solved geometric fold with dedicated shadow geometry, so it can
produce more exact curvature at every pointer coordinate. Matching that
pixel-for-pixel would mean either:

- Porting the StPageFlip geometry/render loop to semantic HTML.
- Adopting StPageFlip for the semantic faces.
- Adding a mesh/canvas/WebGL page surface.

Those options would increase code, runtime work, and interaction complexity.
The current V2 direction keeps semantic content native while adopting the
highest-value legacy mechanics: corner-driven clipping, fixed binding edge,
correct two-sided content, and directional fold shadows.

The current physical presentation is explicitly limited to left-to-right
publications. Right-to-left publications retain the semantic scroll reader;
book mode is disabled until page order, gestures, origins, and curl geometry
are mirrored and covered by dedicated tests.
