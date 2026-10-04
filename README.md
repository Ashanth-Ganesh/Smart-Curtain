# Luma · Smart curtain

A UI-only smart curtain prototype built with Svelte 5 and TypeScript. The phone controls a live, animated curtain preview, based on [the feature notes](docs/smart-curtain.md) and [the sketch](docs/smart-curtain-sketch.jpg).

## Run locally

Use Node.js 22.12+ (or a newer supported version).

```sh
npm install
npm run dev -- --open
```

```sh
npm run check
npm run build
npm run preview
```

The build generates a static site in `build/`. Serve that directory with any static web host; no backend or Node server is required.

## Try it

- Switch between four rooms. Each has independent settings, widgets, tasks, and designs.
- Open the curtain horizontally, raise it vertically, and adjust light transmission. Daylight and Evening change the outdoor scene.
- Toggle Rain for daytime or nighttime showers. Clear daylight brings occasional birds and butterflies; clear evenings have twinkling stars, fireflies, and rare shooting stars. All outdoor animation is behind the curtain and follows its transparency.
- Turn on Adaptive light, set a preferred brightness, and switch the outdoor lighting to see the simulated sensor respond. This approximation adjusts transmission; it cannot guarantee a target when the curtain is open or outside is too dark.
- Toggle time, sample weather, sample indoor temperature, light level, tasks, and music widgets. Add, complete, and delete tasks. Music plays a local audio file with pause/resume and a volume slider, including mute at 0%.
- Use Design to change the curtain color, select linen or a smooth panel, or upload an image.
- Choose tiles in the 4×4 grid, or drag to draw circles, rectangles, and freehand windows. Select a window to change its transparency, add an image, or delete it. Up to 32 sections per room. Keyboard users can use the grid and section selector.
- Use Undo in the Design tab to reverse the last window creation, transparency adjustment, image change/removal, or deletion. A slider drag counts as one edit. Each room has its own single undo step; history resets on refresh or when that room is reset.
- Try Morning, Focus, and Unwind scenes, or reset the current room.
- Save up to 12 named custom presets under Your presets in the Controls tab. Presets capture opening, lift, brightness, adaptive light, and outdoor scene; apply them to any room or delete them. They leave the room's designs, widgets, and tasks in place.
- Use the theme button beside Daylight / Evening for a navy dark mode with a night-sky blue accent. The theme follows your system preference initially and remembers your selection independently of the outdoor lighting.
- Use the fullscreen button above the preview to expand the curtain for presentations. Scene controls remain available. Exit with the same button or Escape; browsers without native fullscreen use the browser viewport instead.

The desktop layout fits the browser height, with extra phone content scrolling inside the phone. On narrow screens, the preview and phone stack vertically.

Room settings, custom presets, and music volume save in the browser's local storage. Uploaded images stay on the device, are limited to 3 MB each, and count toward the browser's storage limit. If storage fills up or is unavailable, a brief notice explains that changes last for the current visit. Audio files must be reselected after refresh. Weather and temperature are clearly labeled sample data; time and date use the device's clock. The outdoor landscape, its two trees, and animation are local SVGs. Daylight, Evening, and Rain are preview controls for the current visit, unless restored from a saved custom preset.

Clear scenes show their first visitor after 3–5 seconds. Birds and butterflies alternate with random 15–30 second gaps, while shooting stars have 45–90 second gaps. Rain replaces visitors and stars with falling streaks, slow glass droplets, and occasional lightning behind the curtain. A soft 0.9-second lightning pulse first appears after 6–10 seconds, then repeats with random 20–40 second gaps, by day or night. Scene changes fade incompatible effects; background motion pauses in hidden tabs, and reduced-motion preferences disable movement and scheduled events while retaining the static scene. Rain also changes the simulated weather widget and adaptive-light calculation.

Video/security feeds, live weather and sensor integrations, hardware control, and an AI assistant are omitted because this is a frontend prototype. The material selector changes the rendering; it is not a fabric physics simulation. Google Fonts is optional, with system sans-serif fallbacks when offline.

## Browser checks

```sh
npx playwright install chromium
npm test
```

The tests cover real curtain movement and transparency, room isolation and persistence, custom presets, window undo, adaptive lighting, widgets and tasks, grid and drawn windows, local image/audio uploads and volume, native and fallback fullscreen, desktop viewport fitting, mobile overflow, saved/system theme preferences, outdoor scene changes, visitor scheduling, visibility pauses, and reduced motion. Screenshots are written to the ignored `test-results/` directory.

## Code map

- `src/routes/+page.svelte`: app state, phone controls, uploads, and local saving.
- `src/routes/app.css`: page and phone styling, including responsive layouts.
- `src/lib/curtain.ts`: small types, room defaults, and sensor approximation.
- `src/lib/components/CurtainPreview.svelte`: SVG landscape, movement, cutouts, and widgets.
- `src/lib/components/OutdoorAtmosphere.svelte`: outdoor effects and the occasional-visitor scheduler.
- `src/lib/components/SectionEditor.svelte`: grid selection and pointer drawing.
- `src/lib/components/Icon.svelte`: shared SVG icons, with no component library required.

SvelteKit handles the development and static build tooling. There are no API routes or backend services.
