<script lang="ts">
  import { gridPath, type Room, type Tool } from "#lib/curtain.js";
  import Icon from "./Icon.svelte";
  let {
    room,
    selected = $bindable(""),
    onedit,
  }: { room: Room; selected?: string; onedit: () => void } = $props();
  let tool = $state<Tool>("grid");
  let drawing = $state(false);
  let start = { x: 0, y: 0 };
  let points: { x: number; y: number }[] = [];
  let draft = $state("");
  let canvas: SVGSVGElement;
  const tools: { id: Tool; name: string; icon: string }[] = [
    { id: "grid", name: "Grid", icon: "grid" },
    { id: "circle", name: "Circle", icon: "circle" },
    { id: "rectangle", name: "Box", icon: "rectangle" },
    { id: "freehand", name: "Draw", icon: "pen" },
  ];
  function point(event: PointerEvent) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: Math.round(
        Math.max(
          0,
          Math.min(1000, ((event.clientX - rect.left) / rect.width) * 1000),
        ),
      ),
      y: Math.round(
        Math.max(
          0,
          Math.min(700, ((event.clientY - rect.top) / rect.height) * 700),
        ),
      ),
    };
  }
  function begin(event: PointerEvent) {
    if (tool === "grid" || event.button !== 0) return;
    canvas.setPointerCapture(event.pointerId);
    start = point(event);
    points = [start];
    drawing = true;
    draft = "";
  }
  function move(event: PointerEvent) {
    if (!drawing) return;
    const end = point(event);
    if (tool === "freehand") {
      points.push(end);
      draft = `M ${points.map((p) => `${p.x} ${p.y}`).join(" L ")} Z`;
    } else {
      const x = Math.min(start.x, end.x),
        y = Math.min(start.y, end.y);
      const w = Math.abs(start.x - end.x),
        h = Math.abs(start.y - end.y);
      draft =
        tool === "rectangle"
          ? `M ${x} ${y} h ${w} v ${h} h ${-w} Z`
          : `M ${x} ${y + h / 2} a ${w / 2} ${h / 2} 0 1 0 ${w} 0 a ${w / 2} ${h / 2} 0 1 0 ${-w} 0 Z`;
      points = [start, end];
    }
  }
  function finish() {
    if (!drawing) return;
    const width =
      Math.max(...points.map((p) => p.x)) - Math.min(...points.map((p) => p.x));
    const height =
      Math.max(...points.map((p) => p.y)) - Math.min(...points.map((p) => p.y));
    if (draft && width > 15 && height > 15 && room.sections.length < 32) {
      onedit();
      selected = crypto.randomUUID();
      room.sections.push({
        id: selected,
        name: `Window ${room.sections.length + 1}`,
        path: draft,
        x: Math.min(...points.map((p) => p.x)),
        y: Math.min(...points.map((p) => p.y)),
        width,
        height,
        light: 100,
        image: "",
      });
    }
    drawing = false;
    draft = "";
  }
  function grid(index: number) {
    const id = `grid-${index}`;
    if (!room.sections.some((s) => s.id === id) && room.sections.length < 32) {
      onedit();
      room.sections.push({
        id,
        name: `Grid ${index + 1}`,
        path: gridPath(index),
        x: (index % 4) * 250,
        y: Math.floor(index / 4) * 175,
        width: 250,
        height: 175,
        light: 100,
        image: "",
      });
    }
    selected = id;
  }
</script>

<svelte:window
  onkeydown={(e) => {
    if (e.key === "Escape") {
      drawing = false;
      draft = "";
    }
  }}
/>

<div class="tools" aria-label="Window drawing tools">
  {#each tools as item}<button
      class:active={tool === item.id}
      aria-pressed={tool === item.id}
      onclick={() => {
        tool = item.id;
        drawing = false;
        draft = "";
      }}><Icon name={item.icon} size={15} />{item.name}</button
    >{/each}
</div>
<div class="editor" style:background={room.color}>
  <svg
    bind:this={canvas}
    viewBox="0 0 1000 700"
    role="img"
    aria-label="Custom window drawing canvas. Choose a tool and drag to draw. Use Grid for keyboard controls."
    onpointerdown={begin}
    onpointermove={move}
    onpointerup={finish}
    onpointercancel={() => {
      drawing = false;
      draft = "";
    }}
  >
    {#if room.image}<image
        href={room.image}
        width="1000"
        height="700"
        preserveAspectRatio="xMidYMid slice"
      />{/if}
    {#each room.sections as section}<path
        d={section.path}
        fill="#edf4ec"
        fill-opacity={section.light / 100}
        stroke={selected === section.id
          ? "var(--accent)"
          : "var(--drawing-border)"}
        stroke-width="5"
      />{/each}
    {#if draft}<path
        d={draft}
        fill="#edf4ec"
        fill-opacity="0.65"
        stroke="var(--accent)"
        stroke-width="5"
        stroke-dasharray="16 10"
      />{/if}
  </svg>
  {#if tool === "grid"}<div class="grid">
      {#each Array(16) as _, i}<button
          class:selected={selected === `grid-${i}`}
          aria-label={`Select grid section ${i + 1}`}
          aria-pressed={selected === `grid-${i}`}
          onclick={() => grid(i)}
        ></button>{/each}
    </div>{/if}
</div>
<p class="hint">
  {tool === "grid"
    ? "Choose a tile to make your own window."
    : "Drag to draw a window. It appears on your curtain."}
</p>

<style>
  .tools {
    display: flex;
    gap: 4px;
    margin: 12px 0;
  }
  .tools button {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    padding: 8px 5px;
    flex: 1;
    font-size: 10px;
    border-radius: 7px;
    background: var(--surface-soft);
    color: var(--muted);
  }
  .tools button.active {
    background: var(--surface-active);
    color: var(--accent-text);
  }
  .editor {
    position: relative;
    border-radius: 10px;
    overflow: hidden;
    aspect-ratio: 10/7;
  }
  .editor svg {
    display: block;
    width: 100%;
    height: 100%;
    touch-action: none;
    cursor: crosshair;
  }
  .grid {
    position: absolute;
    inset: 0;
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    grid-template-rows: repeat(4, 1fr);
  }
  .grid button {
    background: transparent;
    border: 1px solid var(--drawing-border);
    border-radius: 0;
  }
  .grid button:hover,
  .grid button.selected {
    background: #ffffff30;
    box-shadow: inset 0 0 0 2px var(--accent);
  }
  .hint {
    font-size: 11px;
    line-height: 1.6;
    color: var(--muted);
    margin: 8px 0;
  }
</style>
