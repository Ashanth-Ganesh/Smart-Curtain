import { test, expect, type Page } from "@playwright/test";

async function slider(page: Page, id: string, value: number) {
  await page.locator(`#${id}`).fill(String(value));
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".app-shell")).toHaveAttribute(
    "aria-busy",
    "false",
  );
  await expect(page.getByLabel("Select room")).toBeVisible();
});

test("controls move the curtain, reach opaque/clear, and save independent rooms", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await slider(page, "opening", 62);
  await slider(page, "lift", 35);
  await slider(page, "light", 0);
  await expect(page.locator(".curtain-view")).toHaveAttribute(
    "aria-label",
    /62% open, 35% raised, 0% light/,
  );
  await expect(page.locator(".fabric")).toHaveAttribute("opacity", "1");
  await expect(page.locator("#curtain-coverage rect").first()).toHaveAttribute(
    "width",
    "190",
  );
  await expect(page.locator("#curtain-coverage rect").first()).toHaveAttribute(
    "height",
    "455",
  );
  await slider(page, "light", 100);
  await expect(page.locator(".fabric")).toHaveAttribute("opacity", "0");
  await page.getByLabel("Select room").selectOption("bedroom-1");
  await expect(page.locator("#opening")).toHaveValue("0");
  await slider(page, "opening", 25);
  await page.getByLabel("Select room").selectOption("living");
  await expect(page.locator("#opening")).toHaveValue("62");
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          JSON.parse(localStorage.getItem("luma-curtain-v1")!).rooms[0].opening,
      ),
    )
    .toBe(62);
  await page.reload();
  await expect(page.locator("#opening")).toHaveValue("62");
  await page.getByLabel("Select room").selectOption("bedroom-1");
  await expect(page.locator("#opening")).toHaveValue("25");
  expect(errors).toEqual([]);
});

test("fabric sways visibly after real slider drags and small keyboard changes, then respects reduced motion and smooth mode", async ({
  page,
}, testInfo) => {
  const opening = page.locator("#opening");
  const panel = page.locator("#curtain-coverage rect").first();
  const lean = () =>
    panel.evaluate(
      (el) => new DOMMatrixReadOnly(getComputedStyle(el).transform).c * 700,
    );
  const settle = () =>
    expect
      .poll(() =>
        panel.evaluate(
          (el) =>
            el
              .getAnimations()
              .filter(
                (a) => a.effect?.getKeyframes()[0].transform !== undefined,
              ).length,
        ),
      )
      .toBe(0);
  const drag = async (target: number) => {
    const box = (await opening.boundingBox())!;
    const point = (value: number) =>
      box.x + 8 + ((box.width - 16) * value) / 100;
    await page.mouse.move(
      point(Number(await opening.inputValue())),
      box.y + box.height / 2,
    );
    await page.mouse.down();
    await page.mouse.move(point(target), box.y + box.height / 2, { steps: 40 });
    await page.mouse.up();
  };
  await drag(70);
  await expect.poll(lean).toBeGreaterThan(3);
  await page.screenshot({
    path: testInfo.outputPath("sway-after-drag.png"),
    fullPage: true,
  });
  await settle();
  await opening.focus();
  await page.keyboard.press("ArrowRight");
  await expect.poll(lean).toBeGreaterThan(3);
  await settle();
  await drag(20);
  await expect.poll(lean).toBeLessThan(-3);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(panel).toHaveCSS("transform", "none");
  await opening.focus();
  await page.keyboard.press("ArrowRight");
  await expect(panel).toHaveCSS("transform", "none");
  await settle();
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.getByRole("button", { name: "Smooth panel", exact: true }).click();
  await opening.focus();
  await page.keyboard.press("ArrowRight");
  await expect(panel).toHaveCSS("transform", "none");
  await settle();
});

test("adaptive light responds to outdoor lighting and scenes reset controls", async ({
  page,
}) => {
  await page.getByRole("switch", { name: "Adaptive light" }).click();
  await expect(page.locator(".curtain-view")).toHaveAttribute(
    "aria-label",
    /33% light/,
  );
  await page.getByRole("button", { name: "Evening", exact: true }).click();
  await expect(page.locator(".curtain-view")).toHaveAttribute(
    "aria-label",
    /100% light/,
  );
  await page.getByRole("button", { name: "Morning", exact: true }).click();
  await expect(page.locator("#opening")).toHaveValue("55");
  await expect(page.locator("#light")).toHaveValue("75");
  await expect(
    page.getByRole("switch", { name: "Adaptive light" }),
  ).toHaveAttribute("aria-checked", "false");
  await page.getByRole("button", { name: "Reset room" }).click();
  await expect(page.locator("#opening")).toHaveValue("12");
});

test("widgets toggle, and tasks add, complete, and delete on the live display", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Widgets", exact: true }).click();
  await page.getByRole("switch", { name: "Weather widget" }).click();
  await expect(page.locator(".weather-widget")).toHaveCount(0);
  await page.getByRole("switch", { name: "Room temperature widget" }).click();
  await expect(page.locator(".curtain-widgets")).toContainText("70°F");
  await page.getByRole("switch", { name: "To-do list widget" }).click();
  await page
    .getByRole("textbox", { name: "New task" })
    .fill("Water the plants");
  await page.getByRole("button", { name: "Add task" }).click();
  await expect(
    page.locator(".preview-task").filter({ hasText: "Water the plants" }),
  ).toBeVisible();
  await page.getByRole("checkbox", { name: "Water the plants" }).check();
  await expect(
    page.locator(".preview-task").filter({ hasText: "Water the plants" }),
  ).toHaveClass(/done/);
  await page
    .getByRole("button", { name: "Delete task: Water the plants" })
    .click();
  await expect(
    page.locator(".preview-task").filter({ hasText: "Water the plants" }),
  ).toHaveCount(0);
});

test("grid and drawn windows update the curtain and survive reload", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Design", exact: true }).click();
  await page
    .getByRole("button", { name: "Select grid section 2", exact: true })
    .click();
  await slider(page, "section-light", 65);
  await expect(page.locator("#custom-windows path")).toHaveCount(1);
  await page.getByRole("button", { name: "Circle", exact: true }).click();
  const canvas = page.getByRole("img", {
    name: /Custom window drawing canvas/,
  });
  await canvas.scrollIntoViewIfNeeded();
  const box = (await canvas.boundingBox())!;
  await page.mouse.move(box.x + 40, box.y + 40);
  await page.mouse.down();
  await page.mouse.move(box.x + 125, box.y + 110, { steps: 12 });
  await page.mouse.up();
  await expect(page.locator("#custom-windows path")).toHaveCount(2);
  await expect(page.locator("#custom-windows path").nth(1)).toHaveAttribute(
    "d",
    / a /,
  );
  for (const tool of ["Box", "Draw"]) {
    await page.getByRole("button", { name: tool, exact: true }).click();
    await canvas.scrollIntoViewIfNeeded();
    const bounds = (await canvas.boundingBox())!;
    await page.mouse.move(bounds.x + 145, bounds.y + 40);
    await page.mouse.down();
    await page.mouse.move(bounds.x + 220, bounds.y + 50, { steps: 5 });
    await page.mouse.move(bounds.x + 205, bounds.y + 115, { steps: 5 });
    await page.mouse.up();
  }
  await expect(page.locator("#custom-windows path")).toHaveCount(4);
  await expect(page.locator("#custom-windows path").nth(2)).toHaveAttribute(
    "d",
    / h /,
  );
  await expect(page.locator("#custom-windows path").nth(3)).toHaveAttribute(
    "d",
    / L /,
  );
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          JSON.parse(localStorage.getItem("luma-curtain-v1")!).rooms[0].sections
            .length,
      ),
    )
    .toBe(4);
  await page.reload();
  await page.getByRole("button", { name: "Design", exact: true }).click();
  await expect(page.locator("#custom-windows path")).toHaveCount(4);
  await page.getByLabel("Edit a window").selectOption("grid-1");
  await expect(page.locator("#section-light")).toHaveValue("65");
  await page.getByRole("button", { name: "Delete selected window" }).click();
  await expect(page.locator("#custom-windows path")).toHaveCount(3);
});

test("local image uploads apply to the curtain and individual windows", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Design", exact: true }).click();
  const image = {
    name: "sample.png",
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a2ioAAAAASUVORK5CYII=",
      "base64",
    ),
  };
  await page
    .getByLabel("Upload curtain image", { exact: true })
    .setInputFiles(image);
  await expect(page.locator(".fabric image")).toHaveAttribute(
    "href",
    /^data:image\/png;base64,/,
  );
  await page
    .getByRole("button", { name: "Select grid section 1", exact: true })
    .click();
  await page
    .getByLabel("Upload window image", { exact: true })
    .setInputFiles(image);
  await expect(page.locator("#section-light")).toHaveValue("0");
  await expect(
    page.locator('g[clip-path="url(#section-grid-0)"] image'),
  ).toHaveCount(1);
  await expect(
    page.locator('g[clip-path="url(#section-grid-0)"] image'),
  ).toHaveAttribute("width", "250");
  await expect(
    page.locator('g[clip-path="url(#section-grid-0)"] image'),
  ).toHaveAttribute("height", "175");
  await page.getByRole("button", { name: "Remove curtain image" }).click();
  await expect(page.locator(".fabric image")).toHaveCount(0);
});

test("music plays a local audio file and pauses when hidden", async ({
  page,
}, testInfo) => {
  await page.getByRole("button", { name: "Widgets", exact: true }).click();
  await page.getByRole("switch", { name: "Music widget" }).click();
  // A short silent WAV exercises the real browser audio element without an external service.
  const wav = Buffer.alloc(44 + 16000);
  wav.write("RIFF");
  wav.writeUInt32LE(wav.length - 8, 4);
  wav.write("WAVEfmt ", 8);
  wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20);
  wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(8000, 24);
  wav.writeUInt32LE(16000, 28);
  wav.writeUInt16LE(2, 32);
  wav.writeUInt16LE(16, 34);
  wav.write("data", 36);
  wav.writeUInt32LE(16000, 40);
  await page.getByLabel("Upload music file").setInputFiles({
    name: "Quiet moment.wav",
    mimeType: "audio/wav",
    buffer: wav,
  });
  await page.getByRole("button", { name: "Play music" }).click();
  await expect(page.locator(".music-display")).toContainText("NOW PLAYING");
  await slider(page, "music-volume", 25);
  await expect
    .poll(() =>
      page.locator("audio").evaluate((el: HTMLAudioElement) => el.volume),
    )
    .toBe(0.25);
  await slider(page, "music-volume", 0);
  await expect
    .poll(() =>
      page.locator("audio").evaluate((el: HTMLAudioElement) => el.volume),
    )
    .toBe(0);
  await slider(page, "music-volume", 65);
  await page.screenshot({
    path: testInfo.outputPath("music-volume.png"),
    fullPage: true,
  });
  await page.getByRole("switch", { name: "Music widget" }).click();
  await expect
    .poll(() =>
      page.locator("audio").evaluate((el: HTMLAudioElement) => el.paused),
    )
    .toBe(true);
  await page.reload();
  await expect(page.locator(".app-shell")).toHaveAttribute(
    "aria-busy",
    "false",
  );
  await expect
    .poll(() =>
      page.locator("audio").evaluate((el: HTMLAudioElement) => el.volume),
    )
    .toBe(0.65);
  await page.getByRole("button", { name: "Widgets", exact: true }).click();
  await page.getByRole("switch", { name: "Music widget" }).click();
  await expect(page.locator("#music-volume")).toHaveValue("65");
});

test("custom presets save locally, restore controls and weather in another room, and can be deleted", async ({
  page,
}, testInfo) => {
  await slider(page, "opening", 58);
  await slider(page, "lift", 21);
  await slider(page, "light", 45);
  await page.getByRole("switch", { name: "Adaptive light" }).click();
  await page.getByRole("button", { name: "Evening", exact: true }).click();
  await page.getByRole("button", { name: "Rain", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Preset name" })
    .fill("Rainy reading");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(
    page.getByRole("button", {
      name: "Apply preset: Rainy reading",
      exact: true,
    }),
  ).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(
        () => JSON.parse(localStorage.getItem("luma-presets-v1")!).length,
      ),
    )
    .toBe(1);
  await page
    .getByRole("textbox", { name: "Preset name" })
    .fill("rainy reading");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.locator(".toast")).toContainText("different name");
  await expect(page.locator(".custom-preset")).toHaveCount(1);
  await page.reload();
  await page.getByLabel("Select room").selectOption("bedroom-1");
  await page
    .getByRole("button", { name: "Apply preset: Rainy reading", exact: true })
    .click();
  await expect(page.locator("#opening")).toHaveValue("58");
  await expect(page.locator("#lift")).toHaveValue("21");
  await expect(page.locator("#light")).toHaveValue("45");
  await expect(
    page.getByRole("switch", { name: "Adaptive light" }),
  ).toHaveAttribute("aria-checked", "true");
  await expect(
    page.getByRole("button", { name: "Evening", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.getByRole("button", { name: "Rain", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".outdoor-atmosphere")).toHaveAttribute(
    "data-scene",
    "rain",
  );
  await page.screenshot({
    path: testInfo.outputPath("saved-preset.png"),
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Delete preset: Rainy reading", exact: true })
    .click();
  await expect(page.locator(".custom-preset")).toHaveCount(0);
  await page.reload();
  await expect(page.locator(".custom-preset")).toHaveCount(0);
});

test("undo restores window creation, an entire slider gesture, images and deletion with independent room history", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Design", exact: true }).click();
  const undo = page.getByRole("button", { name: "Undo last window edit" });
  await expect(undo).toBeDisabled();
  const grid = page.getByRole("button", {
    name: "Select grid section 1",
    exact: true,
  });
  await grid.click();
  await undo.click();
  await expect(page.locator("#custom-windows path")).toHaveCount(0);
  await expect(undo).toBeDisabled();
  await grid.click();
  await page.locator("#section-light").evaluate((el: HTMLInputElement) => {
    for (const value of [80, 65, 40]) {
      el.value = String(value);
      el.dispatchEvent(new Event("input", { bubbles: true }));
    }
    el.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await expect(page.locator("#section-light")).toHaveValue("40");
  await undo.click();
  await expect(page.locator("#section-light")).toHaveValue("100");
  await slider(page, "section-light", 65);
  await page.getByLabel("Upload window image", { exact: true }).setInputFiles({
    name: "sample.png",
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a2ioAAAAASUVORK5CYII=",
      "base64",
    ),
  });
  await expect(page.locator("#section-light")).toHaveValue("0");
  await undo.click();
  await expect(page.locator("#section-light")).toHaveValue("65");
  await expect(page.locator(".section-fabric image")).toHaveCount(0);
  await page.getByRole("button", { name: "Delete selected window" }).click();
  await expect(page.locator("#custom-windows path")).toHaveCount(0);
  await page.getByLabel("Select room").selectOption("bedroom-1");
  await expect(undo).toBeDisabled();
  await page
    .getByRole("button", { name: "Select grid section 2", exact: true })
    .click();
  await page.getByLabel("Select room").selectOption("living");
  await undo.click();
  await expect(page.locator("#custom-windows path")).toHaveCount(1);
  await expect(page.locator("#section-light")).toHaveValue("65");
  await page.getByLabel("Select room").selectOption("bedroom-1");
  await undo.click();
  await expect(page.locator("#custom-windows path")).toHaveCount(0);
  await page.reload();
  await page.getByRole("button", { name: "Design", exact: true }).click();
  await expect(undo).toBeDisabled();
  await expect(page.locator("#custom-windows path")).toHaveCount(1);
});

test("fullscreen fills the viewport, keeps scene controls, and exits through its button or browser exit", async ({
  page,
}, testInfo) => {
  await slider(page, "opening", 75);
  await page.getByRole("button", { name: "Switch to dark mode" }).click();
  await page
    .getByRole("button", { name: "Fullscreen preview", exact: true })
    .click();
  await expect(page.locator(".preview-column")).toHaveClass(/expanded/);
  await expect
    .poll(() =>
      page.evaluate(() =>
        document.fullscreenElement?.classList.contains("preview-column"),
      ),
    )
    .toBe(true);
  const preview = (await page.locator(".preview-column").boundingBox())!;
  expect(preview.x).toBe(0);
  expect(preview.y).toBe(0);
  expect(preview.width).toBe(await page.evaluate(() => innerWidth));
  await expect(page.locator(".phone-column")).toHaveAttribute("inert", "");
  await page.getByRole("button", { name: "Rain", exact: true }).click();
  await expect(page.locator(".outdoor-atmosphere")).toHaveAttribute(
    "data-scene",
    "rain",
  );
  await expect(page.locator("#sky stop").first()).toHaveCSS(
    "stop-color",
    "rgb(129, 156, 169)",
  );
  await page.screenshot({
    path: testInfo.outputPath("fullscreen.png"),
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Exit fullscreen preview", exact: true })
    .click();
  await expect(page.locator(".preview-column")).not.toHaveClass(/expanded/);
  await expect(page.locator(".phone-column")).not.toHaveAttribute("inert", "");
  await expect(page.locator("#opening")).toHaveValue("75");
  await page
    .getByRole("button", { name: "Fullscreen preview", exact: true })
    .click();
  await expect
    .poll(() => page.evaluate(() => Boolean(document.fullscreenElement)))
    .toBe(true);
  await page.evaluate(() => document.exitFullscreen());
  await expect(page.locator(".preview-column")).not.toHaveClass(/expanded/);
});

test("fullscreen falls back to filling the mobile browser and Escape restores the page", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 900 });
  await page.locator(".preview-column").evaluate((el) => {
    el.requestFullscreen = () =>
      Promise.reject(new Error("Fullscreen is unavailable"));
  });
  await page
    .getByRole("button", { name: "Fullscreen preview", exact: true })
    .click();
  await expect(page.locator(".preview-column")).toHaveClass(/expanded/);
  await expect(page.locator("body")).toHaveCSS("overflow", "hidden");
  const preview = (await page.locator(".preview-column").boundingBox())!;
  expect(preview.height).toBe(900);
  const scene = (await page.locator(".room-scene").boundingBox())!;
  expect(scene.y + scene.height).toBeLessThanOrEqual(900);
  expect(scene.height).toBeGreaterThan(600);
  await page.keyboard.press("Escape");
  await expect(page.locator(".preview-column")).not.toHaveClass(/expanded/);
  await expect(page.locator("body")).not.toHaveCSS("overflow", "hidden");
  await expect(page.getByLabel("Select room")).toBeEnabled();
});

test("desktop and mobile layouts have no horizontal overflow", async ({
  page,
}, testInfo) => {
  await page.screenshot({
    path: testInfo.outputPath("desktop.png"),
    fullPage: true,
  });
  await expect(
    page.getByRole("button", { name: "Soft linen" }),
  ).toBeInViewport();
  const materialBox = (await page.locator(".material-options").boundingBox())!;
  const footerBox = (await page.locator(".home-indicator").boundingBox())!;
  expect(materialBox.y + materialBox.height).toBeLessThanOrEqual(footerBox.y);
  for (const size of [
    { width: 1440, height: 900 },
    { width: 1280, height: 720 },
    { width: 1024, height: 768 },
    { width: 768, height: 600 },
    { width: 1920, height: 1080 },
  ]) {
    await page.setViewportSize(size);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollHeight <= innerHeight,
      ),
    ).toBe(true);
  }
  for (const width of [320, 375, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await page.setViewportSize({ width: 375, height: 900 });
  await page.screenshot({
    path: testInfo.outputPath("mobile.png"),
    fullPage: true,
  });
});

test("dark mode themes all phone tabs, keeps room settings, and persists", async ({
  page,
}, testInfo) => {
  await slider(page, "opening", 30);
  const lightBackground = await page
    .locator(".phone")
    .evaluate((el) => getComputedStyle(el).backgroundColor);
  const lightScene = await page
    .locator(".room-scene")
    .evaluate((el) => getComputedStyle(el).backgroundImage);
  await page.getByRole("button", { name: "Switch to dark mode" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.locator("html")).toHaveCSS("color-scheme", "dark");
  expect(
    await page
      .locator(".phone")
      .evaluate((el) => getComputedStyle(el).backgroundColor),
  ).not.toBe(lightBackground);
  expect(
    await page
      .locator(".room-scene")
      .evaluate((el) => getComputedStyle(el).backgroundImage),
  ).not.toBe(lightScene);
  await expect(
    page.getByRole("button", { name: "Daylight", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("#opening")).toHaveValue("30");
  await expect
    .poll(async () => {
      const accent = await page
        .locator(".phone-tabs button.active")
        .evaluate((el) => getComputedStyle(el).color);
      const [red, green, blue] = accent.match(/\d+/g)!.map(Number);
      return blue - Math.max(red, green);
    })
    .toBeGreaterThan(0);
  await page.screenshot({
    path: testInfo.outputPath("dark-controls.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "Widgets", exact: true }).click();
  await page.getByRole("switch", { name: "Room temperature widget" }).click();
  await expect(page.locator(".curtain-widgets")).toContainText("70°F");
  await page.screenshot({
    path: testInfo.outputPath("dark-widgets.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "Design", exact: true }).click();
  await page
    .getByRole("button", { name: "Select grid section 1", exact: true })
    .click();
  await expect(page.locator("#custom-windows path")).toHaveCount(1);
  await page.screenshot({
    path: testInfo.outputPath("dark-design.png"),
    fullPage: true,
  });
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Switch to light mode" }),
  ).toBeEnabled();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.locator("#opening")).toHaveValue("30");
  await expect(page.locator("#custom-windows path")).toHaveCount(1);
  await page.getByRole("button", { name: "Switch to light mode" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await expect(page.locator(".phone")).toHaveCSS(
    "background-color",
    lightBackground,
  );
});

test("system dark preference is used until a theme is selected", async ({
  page,
}) => {
  await page.evaluate(() => localStorage.removeItem("luma-theme"));
  await page.emulateMedia({ colorScheme: "dark" });
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Switch to light mode" }),
  ).toBeEnabled();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.getByRole("button", { name: "Switch to light mode" }).click();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Switch to dark mode" }),
  ).toBeEnabled();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
});

test("rain works by day and night, stays behind the curtain, and updates sample weather and adaptive light", async ({
  page,
}, testInfo) => {
  await slider(page, "opening", 0);
  await slider(page, "light", 0);
  const rain = page.getByRole("button", { name: "Rain", exact: true });
  await rain.click();
  await expect(rain).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".outdoor-atmosphere")).toHaveAttribute(
    "data-scene",
    "rain",
  );
  await expect(page.locator(".rain-streak")).toHaveCount(80);
  await expect(page.locator(".celestial")).toHaveCSS("opacity", "0");
  await expect(page.locator(".weather-widget")).toContainText("Rainy");
  await expect(page.locator(".fabric")).toHaveAttribute("opacity", "1");
  expect(
    await page
      .locator(".outdoor-atmosphere")
      .evaluate((el) =>
        Boolean(
          el.compareDocumentPosition(document.querySelector(".fabric")!) &
          Node.DOCUMENT_POSITION_FOLLOWING,
        ),
      ),
  ).toBe(true);
  await slider(page, "light", 38);
  await page.getByRole("switch", { name: "Adaptive light" }).click();
  await expect(page.locator(".curtain-view")).toHaveAttribute(
    "aria-label",
    /54% light/,
  );
  await slider(page, "opening", 45);
  await expect(page.locator(".fabric")).toHaveCSS("opacity", "0.46");
  await expect
    .poll(() =>
      page
        .locator("#curtain-coverage rect")
        .first()
        .evaluate((el) => Math.round((el as SVGRectElement).getBBox().width)),
    )
    .toBe(275);
  await page.screenshot({
    path: testInfo.outputPath("rain-day.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "Evening", exact: true }).click();
  await expect(page.locator("#sky stop").first()).toHaveCSS(
    "stop-color",
    "rgb(22, 39, 56)",
  );
  await expect(rain).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".stars, .fireflies, .visitor")).toHaveCount(0);
  await expect(page.locator(".curtain-widgets")).toHaveClass(/light-text/);
  await page.screenshot({
    path: testInfo.outputPath("rain-night.png"),
    fullPage: true,
  });
  await rain.click();
  await expect(page.locator(".outdoor-atmosphere")).toHaveAttribute(
    "data-scene",
    "evening",
  );
  await expect(page.locator(".rain")).toHaveCount(0);
  await expect(page.locator(".twinkle")).toHaveCount(22);
  await expect(page.locator(".firefly")).toHaveCount(7);
  await expect(page.locator("#sky stop").first()).toHaveCSS(
    "stop-color",
    "rgb(23, 44, 66)",
  );
  await page.screenshot({
    path: testInfo.outputPath("clear-evening.png"),
    fullPage: true,
  });
});

test("rain schedules occasional lightning by day and night and cancels it when disabled", async ({
  page,
}, testInfo) => {
  await page.addInitScript(() => {
    Math.random = () => 0.25;
  });
  await page.clock.install();
  await page.reload();
  await expect(page.locator(".app-shell")).toHaveAttribute(
    "aria-busy",
    "false",
  );
  await slider(page, "opening", 75);
  const rain = page.getByRole("button", { name: "Rain", exact: true });
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000));
  const flash = page.locator(".lightning");
  await rain.click();
  await page.clock.runFor(6000);
  await expect(flash).toHaveCount(0);
  await page.clock.runFor(1100);
  await expect(flash).toHaveCount(1);
  expect(
    await flash.evaluate((el) =>
      Boolean(
        el.compareDocumentPosition(document.querySelector(".fabric")!) &
        Node.DOCUMENT_POSITION_FOLLOWING,
      ),
    ),
  ).toBe(true);
  await flash.evaluate((el) => {
    for (const animation of el.getAnimations()) {
      animation.pause();
      animation.currentTime = 180;
    }
  });
  await page.screenshot({
    path: testInfo.outputPath("lightning-day.png"),
    fullPage: true,
  });
  await page.clock.runFor(1000);
  await expect(flash).toHaveCount(0);
  await page.clock.runFor(20000);
  await expect(flash).toHaveCount(0);
  await page.clock.runFor(4900);
  await expect(flash).toHaveCount(1);
  await rain.click();
  await expect(flash).toHaveCount(0);
  await page.clock.runFor(60000);
  await expect(flash).toHaveCount(0);
  await page.getByRole("button", { name: "Evening", exact: true }).click();
  await rain.click();
  await page.clock.runFor(7100);
  await expect(flash).toHaveCount(1);
  await flash.evaluate((el) => {
    for (const animation of el.getAnimations()) {
      animation.pause();
      animation.currentTime = 180;
    }
  });
  await page.screenshot({
    path: testInfo.outputPath("lightning-night.png"),
    fullPage: true,
  });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(flash).toHaveCount(0);
  await page.clock.runFor(60000);
  await expect(flash).toHaveCount(0);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect(page.locator(".outdoor-atmosphere")).toHaveAttribute(
    "data-motion",
    "running",
  );
  await page.clock.runFor(7100);
  await expect(flash).toHaveCount(1);
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      get: () => true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(flash).toHaveCount(0);
  await page.clock.runFor(60000);
  await expect(flash).toHaveCount(0);
});

test("clear scenes schedule visitors, alternate daylight visitors, and cancel incompatible events", async ({
  page,
}, testInfo) => {
  await page.addInitScript(() => {
    Math.random = () => 0.25;
  });
  await page.clock.install();
  await page.reload();
  await expect(page.locator(".app-shell")).toHaveAttribute(
    "aria-busy",
    "false",
  );
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000));
  await page.clock.runFor(5000);
  await expect(page.locator(".visitor")).toHaveAttribute("data-event", "birds");
  await page.locator(".bird-flight").evaluate((el) => {
    for (const animation of el.getAnimations()) {
      animation.pause();
      animation.currentTime = 3800;
    }
  });
  await page.screenshot({
    path: testInfo.outputPath("birds.png"),
    fullPage: true,
  });
  await page.clock.runFor(7000);
  await expect(page.locator(".visitor")).toHaveCount(0);
  await page.clock.runFor(19000);
  await expect(page.locator(".visitor")).toHaveAttribute(
    "data-event",
    "butterfly",
  );
  await page.locator(".butterfly-flight").evaluate((el) => {
    for (const animation of el.getAnimations()) {
      animation.pause();
      animation.currentTime = 6000;
    }
  });
  await page.screenshot({
    path: testInfo.outputPath("butterfly.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "Evening", exact: true }).click();
  await page.clock.runFor(3600);
  await expect(page.locator(".visitor")).toHaveAttribute(
    "data-event",
    "shooting-star",
  );
  await page.clock.runFor(2000);
  await expect(page.locator(".visitor")).toHaveCount(0);
  await page.clock.runFor(40000);
  await expect(page.locator(".visitor")).toHaveCount(0);
  await page.clock.runFor(16000);
  await expect(page.locator(".visitor")).toHaveAttribute(
    "data-event",
    "shooting-star",
  );
  await page.getByRole("button", { name: "Rain", exact: true }).click();
  await page.clock.runFor(100000);
  await expect(page.locator(".visitor")).toHaveCount(0);
});

test("outdoor animation pauses while hidden and stops for reduced motion", async ({
  page,
}) => {
  await page.clock.install();
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      get: () => true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(page.locator(".outdoor-atmosphere")).toHaveAttribute(
    "data-motion",
    "paused",
  );
  await expect(page.locator(".clouds")).toHaveCSS(
    "animation-play-state",
    "paused",
  );
  await page.clock.runFor(100000);
  await expect(page.locator(".visitor")).toHaveCount(0);
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      get: () => false,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(page.locator(".outdoor-atmosphere")).toHaveAttribute(
    "data-motion",
    "running",
  );
  await page.clock.runFor(5000);
  await expect(page.locator(".visitor")).toHaveCount(1);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator(".outdoor-atmosphere")).toHaveAttribute(
    "data-motion",
    "reduced",
  );
  await expect(page.locator(".visitor")).toHaveCount(0);
  await expect(page.locator(".clouds")).toHaveCSS("animation-name", "none");
  await page.getByRole("button", { name: "Rain", exact: true }).click();
  await expect(page.locator(".rain-streak").first()).toHaveCSS(
    "animation-name",
    "none",
  );
  await page.clock.runFor(100000);
  await expect(page.locator(".visitor")).toHaveCount(0);
});
