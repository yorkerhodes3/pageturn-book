import { expect, test } from "@playwright/test";

const pagesBase = process.env.PAGES_BASE_PATH ?? "/";
const route = (path: string) =>
  `${pagesBase.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;

test("mounts and destroys V3 through the public SDK", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const hostUrl = route(
    "/sdk/?media=host-video&chapter=host-route#host-anchor",
  );
  await page.goto(hostUrl);

  const root = page.locator("#page-turn-book");
  await expect(root).toHaveAttribute("data-sdk-ready", "true");
  await expect(root).toHaveClass(/pageturn-book/);
  await expect(
    page.getByRole("region", { name: "Semantic book reader" }),
  ).toBeVisible();
  await expect(page).toHaveTitle("PageTurn Book V3 SDK example");
  await expect(page.getByRole("link", { name: "Library" })).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Book appearance settings" }),
  ).toHaveCount(0);
  expect(
    await page.locator("[data-v3-appearance]").evaluate((button) => ({
      hidden: (button as HTMLElement).hidden,
      display: getComputedStyle(button).display,
    })),
  ).toEqual({ hidden: true, display: "none" });
  await expect(page.getByRole("button", { name: "Share location" })).toHaveCount(
    0,
  );
  await expect(page.locator("[data-v3-counter]")).toContainText("Front matter");
  await expect(page.locator("[data-v3-reader]")).toHaveAttribute(
    "data-v3-loaded-chapters",
    /[12]/,
  );
  const counter = page.locator("[data-v3-counter]");
  const counterBeforeHostKey = await counter.textContent();
  await page.getByRole("button", { name: "Destroy SDK reader" }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(counter).toHaveText(counterBeforeHostKey ?? "");
  await expect(page).toHaveURL(new RegExp(`${hostUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`));

  await page.getByRole("button", { name: "Destroy SDK reader" }).click();
  await expect(root).toHaveAttribute("data-sdk-destroyed", "true");
  await expect(root).not.toHaveClass(/pageturn-book/);
  await expect(root).toBeEmpty();
  await expect(page).toHaveTitle("PageTurn Book V3 SDK example");
});

test("cancels a hidden SDK mount cleanly during layout", async ({ page }) => {
  const pageErrors: Error[] = [];
  page.on("pageerror", (error) => pageErrors.push(error));
  await page.goto(route("/sdk/?hidden=1"));

  const root = page.locator("#page-turn-book");
  await expect(root).toHaveClass(/pageturn-book/);
  await page.getByRole("button", { name: "Destroy SDK reader" }).click();

  await expect(root).toHaveAttribute("data-sdk-destroyed", "true");
  await expect(root).toHaveAttribute("data-sdk-ready", "true");
  await expect(root).toBeEmpty();
  expect(pageErrors).toEqual([]);
});

test("retains an SDK appearance selected before ready", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(
    route(
      "/sdk/?appearance=modern-lab&paper=%23ffffff&ink=%23112233",
    ),
  );

  const root = page.locator("#page-turn-book");
  await expect(root).toHaveAttribute("data-sdk-ready", "true");
  await expect(page.locator("[data-v3-reader]")).toHaveAttribute(
    "data-v3-appearance-theme",
    "custom",
  );
  await expect(page.locator("[data-v3-reader]")).toHaveCSS(
    "--v3-page-paper",
    "#ffffff",
  );
  await expect(page.locator("[data-v3-reader]")).toHaveCSS(
    "--v3-page-ink",
    "#112233",
  );
  await expect(
    page.locator("[data-v3-stationary] .v3-sheet").first(),
  ).toHaveCSS(
    "font-family",
    /Inter|ui-sans-serif|system-ui/,
  );
});
