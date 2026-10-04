<script lang="ts">
  let { name, size = 20 }: { name: string; size?: number } = $props();
  const paths: Record<string, string> = {
    sun: "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M12 2v2 M12 20v2 M2 12h2 M20 12h2 M5 5l1.5 1.5 M17.5 17.5L19 19 M5 19l1.5-1.5 M17.5 6.5L19 5",
    moon: "M20 15.5A8.5 8.5 0 0 1 8.5 4 8.5 8.5 0 1 0 20 15.5Z",
    rain: "M6 14a4 4 0 0 1 0-8 6 6 0 0 1 11-1 4.5 4.5 0 0 1 1 9 M7 17l-1 3 M12 17l-1 3 M17 17l-1 3",
    clock: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18 M12 7v5l3 2",
    thermometer: "M9 14V5a3 3 0 0 1 6 0v9a5 5 0 1 1-6 0 M12 8v9",
    light: "M9 18h6 M10 21h4 M8 14a6 6 0 1 1 8 0l-1 2H9Z",
    check: "M5 12l4 4L19 6",
    music:
      "M9 18V5l11-2v13 M9 5v4l11-2 M9 18a3 3 0 1 1-3-3c1.6 0 3 1.3 3 3 M20 16a3 3 0 1 1-3-3c1.6 0 3 1.3 3 3",
    curtain: "M3 4h18 M5 4v16h5V4 M14 4v16h5V4 M7 7v10 M17 7v10",
    settings: "M4 7h16 M4 17h16 M8 4v6 M16 14v6",
    widgets: "M3 3h7v7H3Z M14 3h7v7h-7Z M3 14h7v7H3Z M14 14h7v7h-7Z",
    pen: "M4 20l4-1L20 7l-4-4L4 15Z M13 6l4 4 M4 20h7",
    down: "M7 10l5 5 5-5",
    arrow: "M5 12h14 M14 7l5 5-5 5",
    home: "M3 11l9-8 9 8 M5 9v12h14V9 M9 21v-8h6v8",
    grid: "M3 3h18v18H3Z M9 3v18 M15 3v18 M3 9h18 M3 15h18",
    circle: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18",
    rectangle: "M4 5h16v14H4Z",
    upload: "M12 16V3 M7 8l5-5 5 5 M4 15v6h16v-6",
    trash: "M4 6h16 M9 6V3h6v3 M6 6l1 15h10l1-15 M10 10v7 M14 10v7",
    play: "M8 4l12 8-12 8Z",
    pause: "M8 5v14 M16 5v14",
    leaf: "M20 3C9 2 3 7 5 15c5 8 15 3 15-12Z M4 21L16 8",
    reset: "M4 10a8 8 0 1 1 1 8 M4 4v6h6",
    undo: "M4 9h9a6 6 0 0 1 0 12 M4 9l5-5 M4 9l5 5",
    plus: "M12 5v14 M5 12h14",
    bookmark: "M6 3h12v18l-6-4-6 4Z",
    expand: "M8 3H3v5 M16 3h5v5 M21 16v5h-5 M8 21H3v-5",
    collapse: "M3 8h5V3 M16 3v5h5 M21 16h-5v5 M8 21v-5H3",
    close: "M6 6l12 12 M18 6L6 18",
    volume: "M3 9h4l5-4v14l-5-4H3Z M16 8a6 6 0 0 1 0 8 M19 5a10 10 0 0 1 0 14",
  };
</script>

<svg
  width={size}
  height={size}
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="1.6"
  stroke-linecap="round"
  stroke-linejoin="round"
  aria-hidden="true"><path d={paths[name] ?? paths.curtain} /></svg
>
