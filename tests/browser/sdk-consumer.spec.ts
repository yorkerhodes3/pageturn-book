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
