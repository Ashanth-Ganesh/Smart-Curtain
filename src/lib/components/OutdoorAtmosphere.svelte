<script lang="ts">
  import { onMount } from "svelte";
  import { fade } from "svelte/transition";

  let {
    daylight,
    rainy,
    scale,
  }: { daylight: boolean; rainy: boolean; scale: number } = $props();
  type Visitor = {
    kind: "birds" | "butterfly" | "shooting-star" | "lightning";
    reverse: boolean;
    y: number;
    x: number;
    size: number;
    duration: number;
  };
  let visitor = $state<Visitor | null>(null);
  let ready = $state(false);
  let visible = $state(true);
  let reducedMotion = $state(false);
  const between = (min: number, max: number) =>
    min + Math.random() * (max - min);
  // Fixed positions keep server and client rendering identical.
  const stars = Array.from({ length: 22 }, (_, i) => ({
    x: 50 + ((i * 173) % 900),
    y: 24 + ((i * 79) % 226),
    r: 1.3 + (i % 3) * 0.6,
  }));
  const fireflies = Array.from({ length: 7 }, (_, i) => ({
    x: 100 + ((i * 137) % 800),
    y: 485 + ((i * 53) % 150),
  }));
  const rain = Array.from({ length: 80 }, (_, i) => ({
    x: (i * 137) % 1140,
    length: 13 + (i % 5) * 3,
    duration: 0.9 + (i % 7) * 0.09,
    delay: -(i * 0.173) % 2,
  }));
  const droplets = Array.from({ length: 12 }, (_, i) => ({
    x: 35 + ((i * 211) % 930),
    y: 15 + ((i * 127) % 500),
  }));

  onMount(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateMotion = () => {
      reducedMotion = preference.matches;
    };
    const updateVisibility = () => {
      visible = !document.hidden;
    };
    updateMotion();
    updateVisibility();
    ready = true;
    preference.addEventListener("change", updateMotion);
    document.addEventListener("visibilitychange", updateVisibility);
    return () => {
      preference.removeEventListener("change", updateMotion);
      document.removeEventListener("visibilitychange", updateVisibility);
    };
  });

  $effect(() => {
    const daytime = daylight;
    const wet = rainy;
    const running = ready && visible && !reducedMotion;
    visitor = null;
    if (!running) return;
    let previous = "";
    let nextTimer: ReturnType<typeof setTimeout>;
    let endTimer: ReturnType<typeof setTimeout>;
    const schedule = (first = false) => {
      const delay = wet
        ? first
          ? between(6000, 10000)
          : between(20000, 40000)
        : first
          ? between(3000, 5000)
          : daytime
            ? between(15000, 30000)
            : between(45000, 90000);
      nextTimer = setTimeout(() => {
        const kind = wet
          ? "lightning"
          : daytime
            ? previous === "birds"
              ? "butterfly"
              : previous === "butterfly"
                ? "birds"
                : Math.random() < 0.5
                  ? "birds"
                  : "butterfly"
            : "shooting-star";
        previous = kind;
        const duration =
          kind === "lightning"
            ? 0.9
            : kind === "birds"
              ? between(7, 10)
              : kind === "butterfly"
                ? between(12, 16)
                : between(1.3, 1.9);
        visitor = {
          kind,
          duration,
          reverse: Math.random() < 0.5,
          x: between(160, kind === "lightning" ? 840 : 600),
          y:
            kind === "lightning"
              ? between(25, 65)
              : between(65, kind === "butterfly" ? 290 : 190),
          size: between(0.85, 1.2),
        };
        endTimer = setTimeout(() => {
          visitor = null;
          schedule();
        }, duration * 1000);
      }, delay);
    };
    schedule(true);
    return () => {
      clearTimeout(nextTimer);
      clearTimeout(endTimer);
    };
  });
</script>

<g
  class="outdoor-atmosphere"
  class:paused={!visible}
  data-scene={rainy ? "rain" : daylight ? "daylight" : "evening"}
  data-motion={reducedMotion ? "reduced" : visible ? "running" : "paused"}
  aria-hidden="true"
>
  <ellipse
    class="celestial scene-layer"
    cx="760"
    cy="124"
    rx={daylight ? 47 : 32}
    ry={(daylight ? 47 : 32) * scale}
    fill={daylight ? "#f9f1cb" : "#f0eee1"}
    opacity={rainy ? 0 : 0.85}
  />

  {#if !daylight && !rainy}
    <g class="stars" transition:fade={{ duration: reducedMotion ? 0 : 600 }}>
      {#each stars as star, i}
        <ellipse
          class="twinkle motion"
          cx={star.x}
          cy={star.y}
          rx={star.r}
          ry={star.r * scale}
          fill="#fff3d5"
          style:--duration={`${3 + (i % 5)}s`}
          style:--delay={`${-i * 0.7}s`}
        />
      {/each}
    </g>
    <g
      class="fireflies"
      transition:fade={{ duration: reducedMotion ? 0 : 600 }}
    >
      {#each fireflies as fly, i}
        <g transform={`translate(${fly.x} ${fly.y}) scale(1 ${scale})`}>
          <g
            class="firefly motion"
            style:--duration={`${9 + i}s`}
            style:--delay={`${-i * 2}s`}
          >
            <circle r="11" fill="#e2ee99" opacity="0.07" />
            <circle r="5" fill="#e2ee99" opacity="0.2" />
            <circle r="2.5" fill="#fff2a6" />
          </g>
        </g>
      {/each}
    </g>
  {/if}

  <g
    class="clouds motion"
    fill={rainy ? "#d3dfe4" : "#fff"}
    opacity={rainy ? 0.5 : daylight ? 0.36 : 0.1}
  >
    <path d="M92 141c15-39 48-40 67-11 29-18 61-3 66 20H70c2-7 10-10 22-9Z" />
    <path d="M472 211c15-39 48-40 67-11 29-18 61-3 66 20H450c2-7 10-10 22-9Z" />
    <path
      class="scene-layer"
      opacity={rainy ? 0.65 : 0}
      d="M-80 70Q-10 2 80 50Q155-10 245 40Q330-5 415 45Q515-20 610 40Q725-25 815 42Q920-15 1040 65V92H-80Z"
    />
  </g>

  {#if visitor}
    <g
      class="visitor"
      data-event={visitor.kind}
      transform={visitor.kind === "lightning"
        ? undefined
        : `translate(${visitor.kind === "shooting-star" ? visitor.x : 0} ${visitor.y}) scale(1 ${scale})`}
      transition:fade={{
        duration: reducedMotion || rainy ? 0 : 250,
      }}
    >
      {#if visitor.kind === "birds"}
        <g
          class="bird-flight motion"
          style:--duration={`${visitor.duration}s`}
          style:--from={visitor.reverse ? "1080px" : "-80px"}
          style:--to={visitor.reverse ? "-80px" : "1080px"}
        >
          {#each [0, 1] as bird}
            <g
              transform={`translate(${bird * 48} ${bird * 17}) scale(${visitor.reverse ? -visitor.size : visitor.size} ${visitor.size})`}
              fill="none"
              stroke="#314d58"
              stroke-width="3"
              stroke-linecap="round"
            >
              <path class="bird-wing motion" d="M0 0Q-10-14-22-10" />
              <path class="bird-wing other motion" d="M0 0Q10-14 22-10" />
              <path d="M-3 1h7" stroke-width="4" />
            </g>
          {/each}
        </g>
      {:else if visitor.kind === "butterfly"}
        <g
          class="butterfly-flight motion"
          style:--duration={`${visitor.duration}s`}
          style:--from={visitor.reverse ? "1060px" : "-60px"}
          style:--to={visitor.reverse ? "-60px" : "1060px"}
          style:--middle={visitor.reverse ? "570px" : "430px"}
        >
          <g transform={`scale(${visitor.size})`}>
            <g
              class="butterfly-wings motion"
              fill="#cc8c57"
              stroke="#795334"
              stroke-width="1.2"
            >
              <path d="M0 0C-26-31-28-1-8 4C-26 15-9 24 0 4Z" />
              <path d="M0 0C26-31 28-1 8 4C26 15 9 24 0 4Z" />
              <path d="M-9-7l-8-7M9-7l8-7" stroke="#f8d9b7" stroke-width="3" />
            </g>
            <path
              d="M0-7V12M0-6l-4-5M0-6l4-5"
              fill="none"
              stroke="#564a38"
              stroke-width="2"
              stroke-linecap="round"
            />
          </g>
        </g>
      {:else if visitor.kind === "shooting-star"}
        <g
          class="shooting-star motion"
          style:--duration={`${visitor.duration}s`}
        >
          <path
            d="M-100-58L0 0"
            stroke="url(#meteor-tail)"
            stroke-width="3"
            stroke-linecap="round"
          />
          <circle r="3" fill="#fff9de" />
        </g>
      {:else}
        <g class="lightning motion" style:--duration={`${visitor.duration}s`}>
          <rect width="1000" height="380" fill="url(#lightning-sky)" />
          <g
            transform={`translate(${visitor.x} ${visitor.y}) scale(${visitor.reverse ? -1 : 1} ${scale})`}
            fill="none"
            stroke="#ecf5ff"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path
              d="M0 0L-19 44H4L-23 91H-5L-36 145M-19 44L-43 63L-38 81"
              stroke-width="18"
              opacity="0.12"
            />
            <path
              d="M0 0L-19 44H4L-23 91H-5L-36 145M-19 44L-43 63L-38 81"
              stroke-width="3"
              opacity="0.85"
            />
          </g>
        </g>
      {/if}
    </g>
  {/if}

  {#if rainy}
    <g class="rain" transition:fade={{ duration: reducedMotion ? 0 : 700 }}>
      {#each rain as drop}
        <path
          class="rain-streak motion"
          d={`M${drop.x} -40l-3 ${drop.length}`}
          style:--duration={`${drop.duration}s`}
          style:--delay={`${drop.delay}s`}
        />
      {/each}
      {#each droplets as drop, i}
        <g transform={`translate(${drop.x} ${drop.y})`}>
          <g
            class="glass-drop motion"
            style:--duration={`${7 + (i % 6)}s`}
            style:--delay={`${-i * 1.7}s`}
          >
            <ellipse rx="2.3" ry={5 * scale} fill="#e3f2f7" opacity="0.55" />
            <path
              d="M0-20V-5"
              stroke="#e3f2f7"
              stroke-opacity="0.2"
              stroke-width="1.3"
            />
          </g>
        </g>
      {/each}
    </g>
  {/if}
  <defs>
    <linearGradient id="lightning-sky" x2="0" y2="1">
      <stop stop-color="#e1eeff" stop-opacity="0.24" />
      <stop offset="1" stop-color="#e1eeff" stop-opacity="0" />
    </linearGradient>
    <linearGradient id="meteor-tail" x1="0" y1="0" x2="1" y2="1">
      <stop stop-color="#dceaff" stop-opacity="0" />
      <stop offset="1" stop-color="#fff9de" />
    </linearGradient>
  </defs>
</g>

<style>
  .outdoor-atmosphere {
    pointer-events: none;
  }
  .scene-layer,
  .clouds {
    transition:
      opacity 700ms,
      fill 700ms;
  }
  .motion {
    animation-duration: var(--duration);
    animation-delay: var(--delay, 0s);
  }
  .paused .motion {
    animation-play-state: paused;
  }
  .clouds {
    --duration: 45s;
    animation-name: drift;
    animation-timing-function: ease-in-out;
    animation-iteration-count: infinite;
    animation-direction: alternate;
  }
  .twinkle {
    animation-name: twinkle;
    animation-timing-function: ease-in-out;
    animation-iteration-count: infinite;
    animation-direction: alternate;
  }
  .firefly {
    animation-name: firefly;
    animation-timing-function: ease-in-out;
    animation-iteration-count: infinite;
    animation-direction: alternate;
  }
  .bird-flight {
    animation-name: fly;
    animation-timing-function: linear;
    animation-fill-mode: both;
  }
  .bird-wing {
    --duration: 650ms;
    transform-origin: 0 0;
    animation-name: flap;
    animation-timing-function: ease-in-out;
    animation-iteration-count: infinite;
    animation-direction: alternate;
  }
  .bird-wing.other {
    animation-name: flap-other;
  }
  .butterfly-flight {
    animation-name: wander;
    animation-timing-function: ease-in-out;
    animation-fill-mode: both;
  }
  .butterfly-wings {
    --duration: 180ms;
    transform-origin: 0 0;
    animation-name: flutter;
    animation-timing-function: ease-in-out;
    animation-iteration-count: infinite;
    animation-direction: alternate;
  }
  .shooting-star {
    animation-name: shoot;
    animation-timing-function: ease-out;
    animation-fill-mode: both;
  }
  .rain-streak {
    stroke: #d8edf6;
    stroke-width: 1.4;
    stroke-linecap: round;
    opacity: 0.5;
    animation-name: rainfall;
    animation-timing-function: linear;
    animation-iteration-count: infinite;
  }
  .lightning {
    opacity: 0;
    animation-name: lightning;
    animation-timing-function: ease-out;
    animation-fill-mode: both;
  }
  .glass-drop {
    animation-name: slide;
    animation-timing-function: ease-in;
    animation-iteration-count: infinite;
  }
  @keyframes drift {
    to {
      transform: translateX(120px);
    }
  }
  @keyframes twinkle {
    from {
      opacity: 0.25;
    }
    to {
      opacity: 0.95;
    }
  }
  @keyframes firefly {
    0% {
      transform: translate(-16px, 12px);
      opacity: 0.2;
    }
    45% {
      opacity: 0.9;
    }
    100% {
      transform: translate(22px, -28px);
      opacity: 0.4;
    }
  }
  @keyframes fly {
    0% {
      transform: translate(var(--from), 0);
    }
    50% {
      transform: translate(500px, -20px);
    }
    100% {
      transform: translate(var(--to), 6px);
    }
  }
  @keyframes flap {
    to {
      transform: rotate(-38deg);
    }
  }
  @keyframes flap-other {
    to {
      transform: rotate(38deg);
    }
  }
  @keyframes wander {
    0% {
      transform: translate(var(--from), 45px);
    }
    35% {
      transform: translate(var(--middle), -20px);
    }
    50% {
      transform: translate(500px, 0);
    }
    65% {
      transform: translate(530px, -35px);
    }
    100% {
      transform: translate(var(--to), -65px);
    }
  }
  @keyframes flutter {
    to {
      transform: scaleX(0.25);
    }
  }
  @keyframes shoot {
    0% {
      transform: translate(0, 0);
      opacity: 0;
    }
    15% {
      opacity: 1;
    }
    80% {
      opacity: 0.8;
    }
    100% {
      transform: translate(300px, 175px);
      opacity: 0;
    }
  }
  @keyframes rainfall {
    to {
      transform: translate(-100px, 820px);
    }
  }
  @keyframes lightning {
    0%,
    100% {
      opacity: 0;
    }
    20% {
      opacity: 1;
    }
  }
  @keyframes slide {
    0% {
      transform: translateY(0);
      opacity: 0;
    }
    15% {
      opacity: 0.8;
    }
    85% {
      opacity: 0.6;
    }
    100% {
      transform: translateY(150px);
      opacity: 0;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .lightning {
      display: none;
    }
    .motion {
      animation: none;
    }
    .twinkle {
      opacity: 0.65;
    }
    .firefly {
      opacity: 0.5;
    }
    .scene-layer,
    .clouds {
      transition: none;
    }
  }
</style>
