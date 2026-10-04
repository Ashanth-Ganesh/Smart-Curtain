<script lang="ts">
  import type { Room } from "#lib/curtain.js";
  import Icon from "./Icon.svelte";
  import OutdoorAtmosphere from "./OutdoorAtmosphere.svelte";
  let {
    room,
    light,
    daylight,
    rainy,
    time,
    date,
    playing,
    track,
  }: {
    room: Room;
    light: number;
    daylight: boolean;
    rainy: boolean;
    time: string;
    date: string;
    playing: boolean;
    track: string;
  } = $props();
  let panelWidth = $derived(500 * (1 - room.opening / 100));
  let panelHeight = $derived(700 * (1 - room.lift / 100));
  let transmission = $derived(1 - light / 100);
  let frameWidth = $state(1018);
  let frameHeight = $state(718);
  // Keep widget text proportional even when the curtain's aspect ratio changes.
  let widgetScale = $derived(
    ((frameWidth - 18) / Math.max(1, frameHeight - 18)) * 0.7,
  );
</script>

<div
  class="room-scene"
  class:night={!daylight}
  style:--room-light={daylight
    ? (rainy ? 0.8 : 0.91) + light / 1100
    : 0.62 + light / 350}
>
  <div class="wall-line"></div>
  <div
    class="window-frame"
    bind:clientWidth={frameWidth}
    bind:clientHeight={frameHeight}
    style:--widget-scale={widgetScale}
  >
    <svg
      class="curtain-view"
      viewBox="0 0 1000 700"
      preserveAspectRatio="none"
      role="img"
      aria-label={`${room.name} curtain: ${room.opening}% open, ${room.lift}% raised, ${light}% light transmission, ${room.sections.length} custom windows`}
    >
      <defs>
        <linearGradient id="sky" x2="0" y2="1"
          ><stop
            stop-color={rainy
              ? daylight
                ? "#819ca9"
                : "#162738"
              : daylight
                ? "#b9d1cf"
                : "#172c42"}
          /><stop
            offset="1"
            stop-color={rainy
              ? daylight
                ? "#c3ced0"
                : "#526a79"
              : daylight
                ? "#ecedcf"
                : "#73818b"}
          /></linearGradient
        >
        <linearGradient id="hill" x2="0" y2="1"
          ><stop stop-color={daylight ? "#8fa79a" : "#3f5a60"} /><stop
            offset="1"
            stop-color={daylight ? "#647e6f" : "#283c46"}
          /></linearGradient
        >
        <linearGradient id="fold"
          ><stop stop-color="#000" stop-opacity="0.02" /><stop
            offset="0.24"
            stop-color="#fff"
            stop-opacity="0.16"
          /><stop offset="0.57" stop-color="#000" stop-opacity="0.11" /><stop
            offset="0.8"
            stop-color="#fff"
            stop-opacity="0.05"
          /><stop
            offset="1"
            stop-color="#000"
            stop-opacity="0.02"
          /></linearGradient
        >
        <pattern
          id="linen-folds"
          width="58"
          height="700"
          patternUnits="userSpaceOnUse"
          ><rect width="58" height="700" fill="url(#fold)" /><path
            d="M18 0Q26 210 19 420T18 700"
            fill="none"
            stroke="#fff"
            stroke-opacity="0.07"
          /></pattern
        >
        <pattern
          id="linen-grain"
          width="4"
          height="4"
          patternUnits="userSpaceOnUse"
          ><path
            d="M0 0h4M0 0v4"
            stroke="#6e7463"
            stroke-width="0.4"
            stroke-opacity="0.13"
          /></pattern
        >
        <clipPath id="curtain-coverage"
          ><rect
            class="moving-panel"
            width={panelWidth}
            height={panelHeight}
          /><rect
            class="moving-panel"
            x={1000 - panelWidth}
            width={panelWidth}
            height={panelHeight}
          /></clipPath
        >
        <mask id="custom-windows"
          ><rect
            width="1000"
            height="700"
            fill="white"
          />{#each room.sections as section}<path
              d={section.path}
              fill="black"
            />{/each}</mask
        >
        {#each room.sections as section}<clipPath id={`section-${section.id}`}
            ><path d={section.path} /></clipPath
          >{/each}
      </defs>
      <rect width="1000" height="700" fill="url(#sky)" />
      <path
        d="M0 416Q135 296 274 386T543 380T810 345T1080 388V700H0Z"
        fill={daylight ? "#a5b8a4" : "#627678"}
      />
      <path
        d="M0 503Q144 362 345 468T692 426T1000 458V700H0Z"
        fill="url(#hill)"
      />
      <path
        d="M0 597Q239 491 447 593T1000 533V700H0Z"
        fill={daylight ? "#647e6b" : "#314b50"}
      />
      <path
        d="M707 489C630 535 646 599 535 700H594C696 601 676 557 742 489Z"
        fill={daylight ? "#b8c7ae" : "#617c7b"}
        opacity="0.6"
      />
      <OutdoorAtmosphere {daylight} {rainy} scale={widgetScale} />
      <g clip-path="url(#curtain-coverage)">
        <g mask="url(#custom-windows)" class="fabric" opacity={transmission}>
          <rect width="1000" height="700" fill={room.color} />
          {#if room.image}<image
              href={room.image}
              width="1000"
              height="700"
              preserveAspectRatio="xMidYMid slice"
            />{/if}
          {#if room.material === "linen"}<rect
              width="1000"
              height="700"
              fill="url(#linen-folds)"
            /><rect
              width="1000"
              height="700"
              fill="url(#linen-grain)"
            />{:else}<rect width="1000" height="700" fill="url(#fold)" />{/if}
        </g>
        {#each room.sections as section}
          <g
            class="section-fabric"
            clip-path={`url(#section-${section.id})`}
            opacity={1 - section.light / 100}
            ><path
              d={section.path}
              fill={room.color}
            />{#if section.image}<image
                href={section.image}
                x={section.x}
                y={section.y}
                width={section.width}
                height={section.height}
                preserveAspectRatio="xMidYMid slice"
              />{:else if room.image}<image
                href={room.image}
                width="1000"
                height="700"
                preserveAspectRatio="xMidYMid slice"
              />{/if}</g
          >
        {/each}
        <foreignObject width="1000" height="700">
          <div
            class="curtain-widgets"
            class:light-text={room.color === "#6d7c7a" ||
              (!daylight && light >= 60)}
          >
            <div class="left-widgets">
              {#if room.widgets.clock}<div class="clock-widget">
                  <div class="clock-time">{time}</div>
                  <div class="widget-date">{date}</div>
                </div>{/if}
              {#if room.widgets.tasks}<div class="display-card">
                  <span class="widget-eyebrow">TASKS</span
                  >{#each room.tasks.slice(0, 4) as task}<div
                      class="preview-task"
                      class:done={task.done}
                    >
                      <span>{task.done ? "✓" : "○"}</span>{task.text}
                    </div>{/each}{#if !room.tasks.length}<div
                      class="widget-date"
                    >
                      A fresh start. No tasks yet.
                    </div>{/if}
                </div>{/if}
            </div>
            <div class="right-widgets">
              {#if room.widgets.weather}<div class="weather-widget">
                  <Icon
                    name={rainy ? "rain" : daylight ? "sun" : "moon"}
                    size={38}
                  />
                  <div class="weather-temp">{daylight ? "22°" : "17°"}</div>
                  <div class="widget-date">
                    {rainy ? "Rainy" : daylight ? "Sunny" : "Clear"}
                  </div>
                  <small>Sample weather</small>
                </div>{/if}
              {#if room.widgets.temperature}<div class="display-card">
                  <div class="widget-eyebrow">INSIDE · SAMPLE</div>
                  <div class="small-reading">
                    21°<span> A comfortable space</span>
                  </div>
                </div>{/if}
              {#if room.widgets.light}<div class="display-card">
                  <div class="widget-eyebrow">LIGHT TRANSMISSION</div>
                  <div class="small-reading">
                    {light}%<span
                      >{room.auto
                        ? " Auto-adjusting"
                        : " Just how you like it"}</span
                    >
                  </div>
                </div>{/if}
              {#if room.widgets.music}<div class="display-card music-display">
                  <Icon name="music" size={24} />
                  <div>
                    <div class="widget-eyebrow">
                      {playing ? "NOW PLAYING" : "MUSIC"}
                    </div>
                    <div class="track-title">
                      {track || "Choose your own soundtrack"}
                    </div>
                  </div>
                  {#if playing}<div class="equalizer">
                      <i></i><i></i><i></i>
                    </div>{/if}
                </div>{/if}
            </div>
          </div>
        </foreignObject>
      </g>
    </svg>
    <div class="curtain-rail"></div>
  </div>
  <div class="plant" aria-hidden="true">
    <svg viewBox="0 0 150 220"
      ><path
        d="M77 175V51M76 145L41 109M78 115l33-40M78 93L55 64"
        fill="none"
        stroke="#6c7b55"
        stroke-width="4"
      /><g fill="#788765"
        ><path d="M75 80C30 63 29 26 42 19c35 2 41 33 33 61Z" /><path
          d="M78 112c-4-47 22-73 46-63 2 35-19 55-46 63Z"
        /><path d="M64 138c-43 0-65-26-48-44 31-3 49 17 48 44Z" /><path
          d="M79 66c-10-32 1-59 18-60 13 27 3 50-18 60Z"
        /><path d="M82 156c7-36 35-52 48-38-2 26-26 36-48 38Z" /></g
      ><path d="M43 166h66l-9 54H53Z" fill="#bda58c" /><path
        d="M43 166h66v12H43Z"
        fill="#cbb7a2"
      /></svg
    >
  </div>
  <div class="bench" aria-hidden="true">
    <div class="cushion"></div>
    <div class="bench-seat"></div>
    <div class="bench-leg left"></div>
    <div class="bench-leg right"></div>
  </div>
</div>

<style>
  .room-scene {
    flex: 1;
    min-height: 0;
    height: max(560px, calc(100svh - 100px));
    position: relative;
    border-radius: 18px;
    background: var(
      --scene-wall,
      linear-gradient(105deg, #e9e9dd, #eeeee5 56%, #e3e4d8)
    );
    overflow: hidden;
    isolation: isolate;
    transition: background 1s;
    box-shadow: inset 0 0 50px #b2b6a31a;
  }
  .room-scene::after {
    content: "";
    position: absolute;
    inset: 0;
    background: #162423;
    opacity: calc(1 - var(--room-light));
    pointer-events: none;
    transition: opacity 1s;
    z-index: 5;
  }
  .room-scene::before {
    content: "";
    position: absolute;
    bottom: 0;
    height: 5%;
    width: 100%;
    background: var(--scene-floor, linear-gradient(#d7d5c7, #e2dfd1));
    border-top: 1px solid var(--scene-border, #cdcdbd);
  }
  .wall-line {
    position: absolute;
    top: 0;
    bottom: 5%;
    left: 1%;
    width: 1px;
    background: var(--scene-border, #c5c8b333);
  }
  .window-frame {
    position: absolute;
    inset: 2% 2% 5%;
    padding: 9px;
    background: var(--scene-frame, #eeeae0);
    box-shadow: var(
      --scene-frame-shadow,
      0 12px 26px #5f665e20,
      0 0 0 1px #deded2,
      inset 2px 2px 2px #fff
    );
    border-radius: 3px;
  }
  .curtain-view {
    width: 100%;
    height: 100%;
    display: block;
    box-shadow: inset 0 0 15px #0002;
    overflow: hidden;
  }
  .curtain-rail {
    position: absolute;
    top: 0;
    left: -11px;
    right: -11px;
    height: 7px;
    border-radius: 8px;
    background: var(--scene-rail, linear-gradient(#b6b8aa, #e0e0d5, #a6ac99));
    box-shadow: 0 4px 7px #51594a17;
  }
  .moving-panel {
    transition:
      width 850ms cubic-bezier(0.2, 0.7, 0.2, 1),
      x 850ms cubic-bezier(0.2, 0.7, 0.2, 1),
      height 850ms cubic-bezier(0.2, 0.7, 0.2, 1);
  }
  .fabric,
  .section-fabric {
    transition: opacity 700ms;
  }
  #sky stop {
    transition: stop-color 700ms;
  }
  .curtain-widgets {
    transform: scaleY(var(--widget-scale));
    transform-origin: top left;
    display: flex;
    justify-content: space-between;
    height: 100%;
    padding: 68px 53px;
    color: var(--curtain-widget-ink, #3d4e40);
    font-family: Arial, sans-serif;
    box-sizing: border-box;
  }
  .left-widgets {
    width: 365px;
  }
  .right-widgets {
    width: 275px;
    text-align: right;
    display: flex;
    flex-direction: column;
    gap: 23px;
  }
  .widget-eyebrow {
    font-size: 11px;
    letter-spacing: 2.8px;
    font-weight: 600;
    opacity: 0.7;
  }
  .clock-time {
    font-size: 90px;
    font-weight: 300;
    letter-spacing: -5px;
    margin: 12px 0 9px;
    line-height: 1;
  }
  .widget-date {
    font-size: 17px;
    line-height: 1.6;
    opacity: 0.85;
  }
  .weather-temp {
    font-size: 60px;
    letter-spacing: -2px;
    font-weight: 300;
    line-height: 1.15;
    margin-top: 9px;
  }
  .weather-widget small {
    display: block;
    opacity: 0.5;
    font-size: 11px;
    margin-top: 6px;
  }
  .display-card {
    padding-top: 20px;
    border-top: 1px solid #4b65422b;
  }
  .left-widgets .display-card {
    margin-top: 46px;
  }
  .small-reading {
    font-size: 32px;
    margin-top: 9px;
  }
  .small-reading span {
    display: block;
    font-size: 13px;
    margin-top: 3px;
  }
  .preview-task {
    font-size: 17px;
    display: flex;
    align-items: center;
    gap: 11px;
    line-height: 1.6;
    margin-top: 11px;
  }
  .preview-task.done {
    text-decoration: line-through;
    opacity: 0.5;
  }
  .preview-task span {
    font-size: 23px;
  }
  .music-display {
    display: flex;
    text-align: left;
    align-items: center;
    gap: 12px;
  }
  .music-display .widget-eyebrow {
    font-size: 9px;
    letter-spacing: 1px;
  }
  .track-title {
    font-size: 14px;
    max-width: 190px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    margin-top: 9px;
  }
  .equalizer {
    display: flex;
    align-items: center;
    gap: 3px;
    height: 22px;
  }
  .equalizer i {
    width: 3px;
    height: 17px;
    background: currentColor;
    animation: music 1s infinite alternate;
  }
  .equalizer i:nth-child(2) {
    animation-delay: 0.3s;
  }
  .equalizer i:nth-child(3) {
    animation-delay: 0.6s;
  }
  .light-text {
    color: #f3f1e8;
  }
  .plant {
    position: absolute;
    left: 12px;
    bottom: 12px;
    width: 95px;
    filter: drop-shadow(3px 10px 4px #7c806d19);
  }
  .plant svg {
    width: 100%;
    display: block;
  }
  .bench {
    position: absolute;
    right: 12px;
    bottom: 12px;
    width: 180px;
    height: 58px;
  }
  .bench-seat {
    position: absolute;
    left: 0;
    right: 0;
    top: 14px;
    height: 15px;
    background: #a78e73;
    border-radius: 3px;
    box-shadow: 0 2px 0 #8d795f;
  }
  .cushion {
    position: absolute;
    right: 12px;
    top: -1px;
    width: 103px;
    height: 18px;
    border-radius: 12px 12px 3px 3px;
    background: #c4c5b0;
    box-shadow: inset 0 3px 5px #ffffff35;
  }
  .bench-leg {
    position: absolute;
    top: 29px;
    height: 29px;
    width: 7px;
    background: #9d886d;
  }
  .bench-leg.left {
    left: 11px;
  }
  .bench-leg.right {
    right: 11px;
  }
  .night {
    background: var(
      --scene-wall-night,
      linear-gradient(105deg, #c4cbc6, #d6d9ce)
    );
  }
  @keyframes music {
    to {
      height: 5px;
    }
  }
  @media (max-width: 1100px) {
    .room-scene {
      height: max(540px, calc(100svh - 140px));
    }
    .bench {
      width: 135px;
    }
    .plant {
      width: 75px;
    }
  }
  @media (max-width: 760px) {
    .room-scene {
      flex: none;
      height: clamp(420px, 70svh, 650px);
    }
    .plant {
      width: 57px;
    }
    .bench {
      width: 110px;
      height: 48px;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .moving-panel,
    .fabric,
    .room-scene::after {
      transition: none;
    }
    .equalizer i {
      animation: none;
    }
  }
</style>
