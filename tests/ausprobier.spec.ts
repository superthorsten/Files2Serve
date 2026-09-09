import { expect, test } from "@playwright/test";

test("poll", async ({ page }) => {
  await expect.poll(
    async () => {
      const response = await page.request.get("https://example.com");
      return response.status();
    },
    {
      message: "API sollte irgendwann 200 liefern",
      timeout: 8_000,
    },
  ).toBe(200);
});
