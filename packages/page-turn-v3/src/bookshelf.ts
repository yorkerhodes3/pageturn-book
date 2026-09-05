import type { PageTurnPublicationAppearance } from "./publication-types.js";
import {
  applyPublicationAppearance,
  resolvePageTurnAppearance,
} from "./appearance.js";

export type BookshelfAction = {
  label: string;
  href: string;
  description?: string;
};

export type BookshelfPlacement =
  | Readonly<{ pose: "upright" }>
  | Readonly<{ pose: "stacked"; stackId: string; order: number }>
  | Readonly<{
      pose: "open-on-stand";
      standStyle?: "lectern" | "easel";
    }>;

export type BookshelfVolume = {
  id: string;
  title: string;
  shelfLabel: string;
  collection: string;
  pageCount: number;
  appearance: PageTurnPublicationAppearance;
  actions: BookshelfAction[];
  subtitle?: string;
  extentLabel?: string;
  placement?: BookshelfPlacement;
};

export type BookshelfSection = {
  id: string;
  title: string;
  volumes: BookshelfVolume[];
};

export type BookshelfHandle = {
  select(volumeId: string): void;
  clearSelection(): void;
  destroy(): void;
};

function element<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) {
    node.textContent = text;
  }
  return node;
}

function spineWidth(pageCount: number): string {
  return `${Math.min(3.8, Math.max(1.7, 1.15 + Math.sqrt(pageCount) * 0.38)).toFixed(2)}rem`;
}

function volumeHeight(id: string): string {
  const variance = Array.from(id).reduce(
    (total, character) => total + character.charCodeAt(0),
    0,
  );
  return `${(11.3 + (variance % 5) * 0.28).toFixed(2)}rem`;
}

function volumeTilt(id: string): string {
  const variance = Array.from(id).reduce(
    (total, character) => total + character.charCodeAt(0),
    0,
  );
  return `${((variance % 5) - 2) * 0.24}deg`;
}

function isPlainNavigation(event: MouseEvent): boolean {
  return (
    event.button === 0 &&
    !event.altKey &&
    !event.ctrlKey &&
    !event.metaKey &&
    !event.shiftKey
  );
}

export function mountBookshelf(
  host: HTMLElement,
  sections: BookshelfSection[],
): BookshelfHandle {
  if (sections.length === 0 || sections.every(({ volumes }) => volumes.length === 0)) {
    throw new Error("Bookshelf requires at least one volume");
  }

  const allVolumes = sections.flatMap(({ volumes }) => volumes);
  const volumeIds = new Set<string>();
  const stackOrders = new Map<string, Set<number>>();
  for (const volume of allVolumes) {
    if (volumeIds.has(volume.id)) {
      throw new Error(`Bookshelf volume ID is duplicated: ${volume.id}`);
    }
    if (volume.actions.length === 0) {
      throw new Error(`Bookshelf volume has no reading action: ${volume.id}`);
    }
    if (
      !Number.isInteger(volume.pageCount) ||
      volume.pageCount <= 0 ||
      volume.shelfLabel.trim().length === 0
    ) {
      throw new Error(`Bookshelf volume metadata is invalid: ${volume.id}`);
    }
    if (volume.placement?.pose === "stacked") {
      if (
        volume.placement.stackId.trim() === "" ||
        !Number.isInteger(volume.placement.order) ||
        volume.placement.order < 0
      ) {
        throw new Error(`Bookshelf stack metadata is invalid: ${volume.id}`);
      }
      const orders = stackOrders.get(volume.placement.stackId) ?? new Set();
      if (orders.has(volume.placement.order)) {
        throw new Error(
          `Bookshelf stack order is duplicated: ${volume.placement.stackId}`,
        );
      }
      orders.add(volume.placement.order);
      stackOrders.set(volume.placement.stackId, orders);
    }
    volumeIds.add(volume.id);
  }

  const root = element("div", "bookshelf");
  const casework = element("div", "bookshelf-case");
  const crown = element("div", "bookshelf-crown");
  crown.setAttribute("aria-hidden", "true");
  const crownMonogram = element("span", "bookshelf-crown-monogram", "ETC");
  crown.append(crownMonogram);
  casework.append(crown);

  const bookButtons: HTMLButtonElement[] = [];
  const buttonsById = new Map<string, HTMLButtonElement>();
  const volumesById = new Map(allVolumes.map((volume) => [volume.id, volume]));

  const createVolumeItem = (volume: BookshelfVolume) => {
    const placement = volume.placement ?? { pose: "upright" as const };
    const item = element(
      "div",
      `bookshelf-volume-item bookshelf-volume-item-${placement.pose}`,
    );
    item.setAttribute("role", "listitem");
    if (placement.pose === "stacked") {
      item.style.setProperty("--shelf-stack-order", String(placement.order));
      item.style.setProperty(
        "--shelf-stack-bottom",
        `${(0.45 + placement.order * 1.42).toFixed(2)}rem`,
      );
      item.style.setProperty(
        "--shelf-stack-tilt",
        `${((placement.order - 1) * 0.65).toFixed(2)}deg`,
      );
    }
    const button = element(
      "button",
      `bookshelf-book bookshelf-book-${placement.pose}`,
    );
    button.type = "button";
    button.dataset.bookId = volume.id;
    button.dataset.shelfPose = placement.pose;
    const normalizedLabel = volume.shelfLabel.toLocaleLowerCase();
    const normalizedTitle = volume.title.toLocaleLowerCase();
    const labelAlreadyInTitle =
      normalizedLabel === normalizedTitle ||
      normalizedTitle.startsWith(`${normalizedLabel}:`);
    button.setAttribute(
      "aria-label",
      labelAlreadyInTitle
        ? `${volume.title}, ${volume.pageCount} pages`
        : `${volume.shelfLabel}: ${volume.title}, ${volume.pageCount} pages`,
    );
    button.setAttribute("aria-pressed", "false");
    button.setAttribute("aria-controls", "bookshelf-selection");
    button.title = volume.subtitle ?? volume.title;
    button.style.setProperty("--shelf-book-width", spineWidth(volume.pageCount));
    button.style.setProperty("--shelf-book-height", volumeHeight(volume.id));
    button.style.setProperty("--shelf-book-tilt", volumeTilt(volume.id));
    const resolvedAppearance = resolvePageTurnAppearance(volume.appearance);
    applyPublicationAppearance(button, resolvedAppearance);

    const spine = element("span", "bookshelf-book-spine");
    const headband = element("span", "bookshelf-book-headband");
    const tailband = element("span", "bookshelf-book-tailband");
    const label = element("span", "bookshelf-book-label", volume.shelfLabel);
    const pageCount = element(
      "span",
      "bookshelf-book-pages",
      `${volume.pageCount} pages`,
    );
    const hubs = element("span", "bookshelf-book-hubs");
    for (let index = 0; index < resolvedAppearance.binding.hubs; index += 1) {
      hubs.append(element("span", "bookshelf-book-hub"));
    }
    spine.append(headband, hubs, label, pageCount, tailband);
    button.append(spine);
    if (placement.pose === "open-on-stand") {
      const display = element("span", "bookshelf-open-display");
      const stand = element(
        "span",
        `bookshelf-stand bookshelf-stand-${placement.standStyle ?? "lectern"}`,
      );
      const openBook = element("span", "bookshelf-open-book");
      openBook.append(
        element("span", "bookshelf-open-page bookshelf-open-page-left"),
        element("span", "bookshelf-open-page bookshelf-open-page-right"),
        element("span", "bookshelf-open-gutter"),
      );
      display.append(stand, openBook);
      button.append(display);
    }
    item.append(button);
    bookButtons.push(button);
    buttonsById.set(volume.id, button);
    return item;
  };

  for (const section of sections) {
    const bay = element("section", "bookshelf-bay");
    const heading = element("h2", "bookshelf-bay-title", section.title);
    heading.id = `bookshelf-section-${section.id}`;
    bay.setAttribute("aria-labelledby", heading.id);
    const recess = element("div", "bookshelf-recess");
    const row = element("div", "bookshelf-volume-row");
    row.setAttribute("role", "list");

    const renderedStacks = new Set<string>();
    for (const volume of section.volumes) {
      const placement = volume.placement ?? { pose: "upright" as const };
      if (placement.pose !== "stacked") {
        row.append(createVolumeItem(volume));
        continue;
      }
      if (renderedStacks.has(placement.stackId)) {
        continue;
      }
      renderedStacks.add(placement.stackId);
      const stack = element("div", "bookshelf-stack");
      stack.setAttribute("role", "group");
      stack.setAttribute("aria-label", "Horizontal book stack");
      const stackVolumes = section.volumes
        .filter(
          (candidate) =>
            candidate.placement?.pose === "stacked" &&
            candidate.placement.stackId === placement.stackId,
        )
        .sort((left, right) => {
          const leftOrder =
            left.placement?.pose === "stacked"
              ? left.placement.order
              : 0;
          const rightOrder =
            right.placement?.pose === "stacked"
              ? right.placement.order
              : 0;
          return leftOrder - rightOrder;
        });
      stack.append(...stackVolumes.map(createVolumeItem));
      row.append(stack);
    }

    const shelfBoard = element("div", "bookshelf-shelf-board");
    shelfBoard.setAttribute("aria-hidden", "true");
    recess.append(row, shelfBoard);
    bay.append(heading, recess);
    casework.append(bay);
  }

  const selection = element("aside", "bookshelf-selection");
  selection.id = "bookshelf-selection";
  selection.hidden = true;
  selection.setAttribute("aria-live", "polite");
  const selectionClose = element(
    "button",
    "bookshelf-selection-close",
    "Return book",
  );
  selectionClose.type = "button";
  const selectionCollection = element("p", "bookshelf-selection-collection");
  const selectionTitle = element("h2", "bookshelf-selection-title");
  const selectionSubtitle = element("p", "bookshelf-selection-subtitle");
  const selectionMeta = element("p", "bookshelf-selection-meta");
  const selectionActions = element("div", "bookshelf-selection-actions");
  selection.append(
    selectionClose,
    selectionCollection,
    selectionTitle,
    selectionSubtitle,
    selectionMeta,
    selectionActions,
  );
  root.append(casework, selection);
  host.replaceChildren(root);

  let selectedId: string | undefined;
  let navigating = false;
  let destroyed = false;
  let cancelDeparture: (() => void) | undefined;
  let actionDisposers: Array<() => void> = [];
  const disposers: Array<() => void> = [];

  const clearActions = () => {
    for (const dispose of actionDisposers) {
      dispose();
    }
    actionDisposers = [];
    selectionActions.replaceChildren();
  };

  const clearSelection = () => {
    if (navigating) {
      return;
    }
    const selectedButton = selectedId
      ? buttonsById.get(selectedId)
      : undefined;
    selectedButton?.classList.remove("bookshelf-book-selected");
    selectedButton?.setAttribute("aria-pressed", "false");
    selectedId = undefined;
    selection.hidden = true;
    clearActions();
    selectedButton?.focus({ preventScroll: true });
  };

  const depart = (
    volume: BookshelfVolume,
    action: BookshelfAction,
    source: HTMLButtonElement,
  ) => {
    if (navigating || destroyed) {
      return;
    }
    navigating = true;
    selection.setAttribute("aria-busy", "true");
    root.classList.add("bookshelf-navigating");
    source.classList.add("bookshelf-book-departing");

    if (
      matchMedia("(prefers-reduced-motion: reduce)").matches ||
      volume.placement?.pose === "stacked" ||
      volume.placement?.pose === "open-on-stand"
    ) {
      globalThis.location.assign(action.href);
      return;
    }

    const rect = source.getBoundingClientRect();
    const flight = element("div", "bookshelf-book-flight");
    flight.setAttribute("aria-hidden", "true");
    applyPublicationAppearance(flight, volume.appearance);
    const spine = source
      .querySelector(".bookshelf-book-spine")
      ?.cloneNode(true);
    if (spine) {
      flight.append(spine);
    }
    const cover = element("div", "bookshelf-flight-cover");
    const coverFrame = element("div", "bookshelf-flight-cover-frame");
    const coverTitle = element(
      "span",
      "bookshelf-flight-cover-title",
      volume.title,
    );
    const coverOrg = element(
      "span",
      "bookshelf-flight-cover-org",
      "Ethical Tech CoLab",
    );
    coverFrame.append(coverTitle, coverOrg);
    cover.append(coverFrame);
    flight.append(cover);
    flight.style.setProperty("--shelf-flight-left", `${rect.left}px`);
    flight.style.setProperty("--shelf-flight-top", `${rect.top}px`);
    flight.style.setProperty("--shelf-flight-width", `${rect.width}px`);
    flight.style.setProperty("--shelf-flight-height", `${rect.height}px`);
    flight.style.setProperty(
      "--shelf-flight-cover-width",
      `${rect.height * 0.7727}px`,
    );
    document.body.append(flight);

    let completed = false;
    let fallback: ReturnType<typeof globalThis.setTimeout> | undefined;
    const onAnimationEnd = () => navigate();
    const removeDeparture = () => {
      if (fallback !== undefined) {
        globalThis.clearTimeout(fallback);
      }
      flight.removeEventListener("animationend", onAnimationEnd);
      flight.remove();
    };
    const navigate = () => {
      if (completed) {
        return;
      }
      completed = true;
      removeDeparture();
      cancelDeparture = undefined;
      globalThis.location.assign(action.href);
    };
    cancelDeparture = () => {
      if (completed) {
        return;
      }
      completed = true;
      removeDeparture();
      navigating = false;
      selection.removeAttribute("aria-busy");
      root.classList.remove("bookshelf-navigating");
      source.classList.remove("bookshelf-book-departing");
    };
    flight.addEventListener("animationend", onAnimationEnd, { once: true });
    fallback = globalThis.setTimeout(navigate, 1_250);
  };

  const select = (volumeId: string) => {
    if (destroyed) {
      throw new Error("Bookshelf has been destroyed");
    }
    if (navigating || selectedId === volumeId) {
      return;
    }
    const volume = volumesById.get(volumeId);
    const button = buttonsById.get(volumeId);
    if (!volume || !button) {
      throw new Error(`Unknown bookshelf volume: ${volumeId}`);
    }

    if (selectedId) {
      const previous = buttonsById.get(selectedId);
      previous?.classList.remove("bookshelf-book-selected");
      previous?.setAttribute("aria-pressed", "false");
    }

    selectedId = volumeId;
    button.classList.add("bookshelf-book-selected");
    button.setAttribute("aria-pressed", "true");
    button.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });

    selectionCollection.textContent = volume.collection;
    selectionTitle.textContent = volume.title;
    selectionSubtitle.textContent =
      volume.subtitle ?? "Ethical Tech CoLab research publication";
    selectionMeta.textContent = `${volume.extentLabel ?? `${volume.pageCount} designed pages`} · ${volume.appearance.binding.material} binding`;
    clearActions();
    for (const action of volume.actions) {
      const link = element("a", "bookshelf-selection-action", action.label);
      link.href = action.href;
      if (action.description) {
        link.title = action.description;
      }
      const onAction = (event: MouseEvent) => {
        if (!isPlainNavigation(event)) {
          return;
        }
        event.preventDefault();
        depart(volume, action, button);
      };
      link.addEventListener("click", onAction);
      actionDisposers.push(() => link.removeEventListener("click", onAction));
      selectionActions.append(link);
    }
    selection.hidden = false;
    selectionActions
      .querySelector<HTMLAnchorElement>(".bookshelf-selection-action")
      ?.focus({ preventScroll: true });
  };

  for (const button of bookButtons) {
    const onClick = () => {
      const id = button.dataset.bookId;
      if (id) {
        select(id);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      const index = bookButtons.indexOf(button);
      let target = -1;
      if (event.key === "ArrowRight" || event.key === "ArrowDown") {
        target = (index + 1) % bookButtons.length;
      } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
        target = (index - 1 + bookButtons.length) % bookButtons.length;
      } else if (event.key === "Home") {
        target = 0;
      } else if (event.key === "End") {
        target = bookButtons.length - 1;
      } else if (event.key === "Escape") {
        clearSelection();
        return;
      }
      if (target >= 0) {
        event.preventDefault();
        bookButtons[target]?.focus();
        bookButtons[target]?.scrollIntoView({
          block: "nearest",
          inline: "nearest",
        });
      }
    };
    button.addEventListener("click", onClick);
    button.addEventListener("keydown", onKeyDown);
    disposers.push(() => {
      button.removeEventListener("click", onClick);
      button.removeEventListener("keydown", onKeyDown);
    });
  }

  const onClose = () => clearSelection();
  const onDocumentKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Escape" && selectedId) {
      clearSelection();
    }
  };
  selectionClose.addEventListener("click", onClose);
  document.addEventListener("keydown", onDocumentKeyDown);
  disposers.push(() => {
    selectionClose.removeEventListener("click", onClose);
    document.removeEventListener("keydown", onDocumentKeyDown);
  });

  return {
    select,
    clearSelection,
    destroy() {
      if (destroyed) {
        return;
      }
      destroyed = true;
      cancelDeparture?.();
      cancelDeparture = undefined;
      clearActions();
      for (const dispose of disposers) {
        dispose();
      }
      host.replaceChildren();
    },
  };
}
