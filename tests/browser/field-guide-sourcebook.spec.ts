import { expect, test } from "@playwright/test";

const pagesBase = (process.env.PAGES_BASE_PATH ?? "").replace(/\/$/, "");
const route = (path: string) => `${pagesBase}${path}`;

test("opens every linked field-guide source chapter at its canonical location", async ({
  page,
}) => {
  test.setTimeout(120_000);
  const chapters = [
    "gates-turbulent-ai-era",
    "what-is-ethical-ai",
    "magnifica-humanitas",
    "plurality-book-and-repository",
    "radicalxchange",
    "plurality-dot-net",
    "ai-2027",
    "ai-2040-plan-a",
    "ai-2040-reading-group-handout",
  ];

  for (const chapter of chapters) {
    await page.goto(
      route(
        `/v3/?book=human-choice-source-guide&chapter=${chapter}#${chapter}`,
      ),
    );
    await expect(page.locator("[data-v3-reader]")).toHaveAttribute(
      "data-v3-ready",
      "true",
    );
    await expect(page.locator("[data-v3-chapter-select]")).toHaveValue(chapter);
    expect(new URL(page.url()).hash).toBe(`#${chapter}`);
  }

  await expect(page).toHaveTitle(
    "The Human Choice: Source Guide - Semantic book reader",
  );
  await expect(
    page.getByRole("heading", {
      name: "Source brief: AI 2040 - Reading Group handout",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", {
      name: "AI 2040: Plan A - Reading Group",
    }),
  ).toHaveAttribute("href", /docs\.google\.com/);
});
