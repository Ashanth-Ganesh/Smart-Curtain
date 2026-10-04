<script lang="ts">
  import { onMount } from "svelte";
  import {
    colors,
    createRooms,
    transmission,
    widgetOptions,
    type Room,
    type Section,
    type CustomPreset,
  } from "#lib/curtain.js";
  import Icon from "#lib/components/Icon.svelte";
  import CurtainPreview from "#lib/components/CurtainPreview.svelte";
  import SectionEditor from "#lib/components/SectionEditor.svelte";
  import "./app.css";
  let rooms = $state(createRooms());
  let roomId = $state("living");
  let room = $derived(rooms.find((r) => r.id === roomId) ?? rooms[0]);
  let tab = $state<"controls" | "widgets" | "design">("controls");
  let daylight = $state(true);
  let rainy = $state(false);
  let customPresets = $state<CustomPreset[]>([]);
  let presetName = $state("");
  let volume = $state(75);
  let windowUndo = $state<
    Record<string, { sections: Section[]; selected: string } | null>
  >({});
  let editingWindow = false;
  let expanded = $state(false);
  let nativeFullscreen = false;
  let previewElement: HTMLElement;
  let theme = $state<"light" | "dark">("light");
  let selected = $state("");
  let section = $derived(room.sections.find((s) => s.id === selected));
  let light = $derived(
    room.auto ? transmission(room.light, daylight, rainy) : room.light,
  );
  let time = $state("09:41");
  let date = $state("A lovely day ahead");
  let loaded = $state(false);
  let storageWarningShown = false;
  let message = $state("");
  let taskText = $state("");
  let track = $state("");
  let audioUrl = $state("");
  let playing = $state(false);
  let audio: HTMLAudioElement;
  let audioInput: HTMLInputElement;
  let fullImageInput: HTMLInputElement;
  let sectionImageInput: HTMLInputElement;
  let activeScene = $state("");
  let toastTimer: ReturnType<typeof setTimeout>;
  const storageKey = "luma-curtain-v1";
  const tabs = [
    { id: "controls", name: "Controls", icon: "settings" },
    { id: "widgets", name: "Widgets", icon: "widgets" },
    { id: "design", name: "Design", icon: "pen" },
  ] as const;
  function notify(text: string) {
    message = text;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      message = "";
    }, 4500);
  }
  function changeRoom() {
    selected = "";
    activeScene = "";
    taskText = "";
    editingWindow = false;
  }
  function savePreset(event: SubmitEvent) {
    event.preventDefault();
    const name = presetName.trim();
    if (!name || customPresets.length >= 12) return;
    if (
      customPresets.some((p) => p.name.toLowerCase() === name.toLowerCase())
    ) {
      notify("Choose a different name for this preset.");
      return;
    }
    customPresets.push({
      id: crypto.randomUUID(),
      name,
      opening: room.opening,
      lift: room.lift,
      light: room.light,
      auto: room.auto,
      daylight,
      rainy,
    });
    presetName = "";
    notify(`Saved ${name}.`);
  }
  function applyPreset(saved: CustomPreset) {
    room.opening = saved.opening;
    room.lift = saved.lift;
    room.light = saved.light;
    room.auto = saved.auto;
    daylight = saved.daylight;
    rainy = saved.rainy;
    activeScene = saved.id;
  }
  function rememberWindows(destination = room) {
    windowUndo[destination.id] = {
      sections: JSON.parse(JSON.stringify(destination.sections)),
      selected: destination.id === room.id ? selected : "",
    };
    editingWindow = false;
  }
  function undoWindowEdit() {
    const previous = windowUndo[room.id];
    if (!previous) return;
    room.sections = previous.sections;
    selected = previous.selected;
    windowUndo[room.id] = null;
    editingWindow = false;
  }
  function editWindowLight(event: Event) {
    if (!section) return;
    if (!editingWindow) {
      rememberWindows();
      editingWindow = true;
    }
    section.light = (event.currentTarget as HTMLInputElement).valueAsNumber;
  }
  async function togglePreview() {
    if (expanded) {
      if (document.fullscreenElement === previewElement)
        await document.exitFullscreen();
      expanded = false;
    } else {
      expanded = true;
      try {
        await previewElement.requestFullscreen();
      } catch {
        // Filling the browser viewport also works when native fullscreen is unavailable.
      }
    }
  }
  function preset(name: string) {
    activeScene = name;
    room.auto = false;
    room.lift = 0;
    if (name === "Morning") {
      room.opening = 55;
      room.light = 75;
      daylight = true;
      room.widgets.clock = true;
      room.widgets.weather = true;
    }
    if (name === "Focus") {
      room.opening = 0;
      room.light = 25;
      daylight = true;
      room.widgets.weather = false;
      room.widgets.clock = true;
    }
    if (name === "Unwind") {
      room.opening = 0;
      room.light = 12;
      daylight = false;
      room.widgets.weather = true;
      room.widgets.clock = true;
    }
  }
  function addTask(event: SubmitEvent) {
    event.preventDefault();
    if (!taskText.trim()) return;
    if (room.tasks.length >= 20) {
      notify("Keep your list simple: up to 20 tasks.");
      return;
    }
    room.tasks.push({
      id: crypto.randomUUID(),
      text: taskText.trim().slice(0, 100),
      done: false,
    });
    taskText = "";
  }
  async function uploadImage(event: Event, target: "full" | "section") {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    // Capture the destination before reading so changing rooms cannot redirect an upload.
    const destination = target === "section" ? section : room;
    const destinationRoom = room;
    input.value = "";
    if (!destination) return;
    if (
      !["image/jpeg", "image/png", "image/webp", "image/gif"].includes(
        file.type,
      )
    ) {
      notify("Choose a JPG, PNG, WebP, or GIF image.");
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      notify("Please choose an image smaller than 3 MB.");
      return;
    }
    try {
      const data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const check = new Image();
      check.src = data;
      await check.decode();
      if (target === "section") {
        if (!destinationRoom.sections.includes(destination as Section)) {
          notify("That window was removed before the image finished loading.");
          return;
        }
        rememberWindows(destinationRoom);
      }
      destination.image = data;
      if (target === "section") destination.light = 0;
      notify("Your image is on the curtain.");
    } catch {
      notify("That image could not be opened. Please try another.");
    }
  }
  function uploadAudio(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("audio/")) {
      notify("Choose an audio file, such as MP3 or WAV.");
      input.value = "";
      return;
    }
    playing = false;
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    audioUrl = URL.createObjectURL(file);
    track = file.name.replace(/\.[^.]+$/, "");
    input.value = "";
  }
  async function toggleAudio() {
    if (!audioUrl) {
      audioInput.click();
      return;
    }
    if (playing) audio.pause();
    else {
      try {
        await audio.play();
      } catch {
        notify("This audio format could not play. Try an MP3 or WAV.");
      }
    }
  }
  function resetRoom() {
    windowUndo[room.id] = null;
    editingWindow = false;
    rooms = rooms.map((r) =>
      r.id === room.id
        ? createRooms().find((defaultRoom) => defaultRoom.id === r.id)!
        : r,
    );
    selected = "";
    activeScene = "";
    notify("This room is back to a fresh start.");
  }
  onMount(() => {
    const syncFullscreen = () => {
      if (document.fullscreenElement === previewElement) {
        nativeFullscreen = true;
        expanded = true;
      } else if (nativeFullscreen) {
        nativeFullscreen = false;
        expanded = false;
      }
    };
    document.addEventListener("fullscreenchange", syncFullscreen);
    const systemTheme = window.matchMedia("(prefers-color-scheme: dark)")
      .matches
      ? "dark"
      : "light";
    try {
      const savedTheme = localStorage.getItem("luma-theme");
      theme =
        savedTheme === "dark" || savedTheme === "light"
          ? savedTheme
          : systemTheme;
    } catch {
      theme = systemTheme;
    }
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || "null");
      if (saved?.version === 1 && Array.isArray(saved.rooms)) {
        const valid =
          saved.rooms.length === 4 &&
          saved.rooms.every(
            (r: Room, i: number) =>
              r.id === rooms[i].id &&
              [r.opening, r.lift, r.light].every(
                (n) => typeof n === "number" && n >= 0 && n <= 100,
              ) &&
              typeof r.auto === "boolean" &&
              ["linen", "smooth"].includes(r.material) &&
              colors.some((c) => c.value === r.color) &&
              typeof r.image === "string" &&
              widgetOptions.every(
                (w) => typeof r.widgets?.[w.id] === "boolean",
              ) &&
              Array.isArray(r.sections) &&
              r.sections.length <= 32 &&
              r.sections.every(
                (s) =>
                  typeof s.id === "string" &&
                  typeof s.path === "string" &&
                  typeof s.name === "string" &&
                  typeof s.image === "string" &&
                  [s.x, s.y, s.width, s.height].every(
                    (n) => typeof n === "number" && Number.isFinite(n),
                  ) &&
                  typeof s.light === "number" &&
                  s.light >= 0 &&
                  s.light <= 100,
              ) &&
              Array.isArray(r.tasks) &&
              r.tasks.length <= 20 &&
              r.tasks.every(
                (t) =>
                  typeof t.id === "string" &&
                  typeof t.text === "string" &&
                  typeof t.done === "boolean",
              ),
          );
        if (valid) rooms = saved.rooms;
      }
    } catch {
      // Start with the defaults when saved settings cannot be read.
    }
    try {
      const saved = JSON.parse(localStorage.getItem("luma-presets-v1") || "[]");
      if (Array.isArray(saved))
        customPresets = saved
          .filter(
            (p: CustomPreset) =>
              p &&
              typeof p.id === "string" &&
              typeof p.name === "string" &&
              p.name.trim() &&
              p.name.length <= 32 &&
              [p.opening, p.lift, p.light].every(
                (n) =>
                  typeof n === "number" &&
                  Number.isFinite(n) &&
                  n >= 0 &&
                  n <= 100,
              ) &&
              [p.auto, p.daylight, p.rainy].every(
                (b) => typeof b === "boolean",
              ),
          )
          .slice(0, 12);
      const savedVolume = Number(localStorage.getItem("luma-volume") ?? 75);
      if (
        Number.isFinite(savedVolume) &&
        savedVolume >= 0 &&
        savedVolume <= 100
      )
        volume = savedVolume;
    } catch {
      // Keep the defaults when optional saved preferences cannot be read.
    }
    loaded = true;
    const updateClock = () => {
      const now = new Date();
      time = now.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
      date = now.toLocaleDateString([], {
        weekday: "long",
        month: "short",
        day: "numeric",
      });
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => {
      clearInterval(interval);
      clearTimeout(toastTimer);
      document.removeEventListener("fullscreenchange", syncFullscreen);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  });
  $effect(() => {
    if (!loaded) return;
    const serialized = JSON.stringify({ version: 1, rooms });
    const savedPresets = JSON.stringify(customPresets);
    const savedVolume = String(volume);
    try {
      localStorage.setItem(storageKey, serialized);
      localStorage.setItem("luma-presets-v1", savedPresets);
      localStorage.setItem("luma-volume", savedVolume);
    } catch {
      if (!storageWarningShown) {
        storageWarningShown = true;
        notify("Device storage is unavailable. Changes last for this visit.");
      }
    }
  });
  $effect(() => {
    if (!loaded) return;
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem("luma-theme", theme);
    } catch {
      /* The theme still works for this visit. */
    }
  });
  $effect(() => {
    if (loaded && !room.widgets.music && playing) audio?.pause();
  });
  $effect(() => {
    if (audio) audio.volume = volume / 100;
  });
  $effect(() => {
    if (!expanded) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  });
</script>

<svelte:window
  onkeydown={(event) => {
    if (event.key === "Escape" && expanded) void togglePreview();
  }}
/>

<svelte:head>
  <title>Luma — a little light, your way</title>
  <meta
    name="description"
    content="An interactive smart curtain concept. Shape the light, create custom windows, and make your space your own."
  />
  <meta name="theme-color" content={theme === "dark" ? "#0b1322" : "#f7f7f2"} />
</svelte:head>

<div class="app-shell" aria-busy={!loaded}>
  <main>
    <div class="workspace">
      <aside
        class="phone-column"
        aria-label="Smartphone curtain controls"
        inert={expanded}
      >
        <div class="phone">
          <div class="phone-status">
            <span>{time}</span>
            <div class="phone-island"></div>
            <div class="phone-indicators">
              <span class="signal">▂▄▆</span><span class="battery"></span>
            </div>
          </div>
          <div class="room-select-wrap">
            <Icon name="home" size={17} /><select
              aria-label="Select room"
              bind:value={roomId}
              onchange={changeRoom}
              >{#each rooms as item}<option value={item.id}>{item.name}</option
                >{/each}</select
            ><Icon name="down" size={15} />
          </div>
          <nav class="phone-tabs" aria-label="Curtain settings">
            {#each tabs as item}<button
                disabled={!loaded}
                class:active={tab === item.id}
                aria-pressed={tab === item.id}
                onclick={() => (tab = item.id)}
                ><Icon name={item.icon} size={16} />{item.name}</button
              >{/each}
          </nav>
          <div class="phone-content">
            {#if tab === "controls"}
              <div class="phone-section-title">
                <h2>Curtain controls</h2>
              </div>
              <div class="light-summary">
                <span class="sun-circle"
                  ><Icon
                    name={rainy ? "rain" : daylight ? "sun" : "moon"}
                    size={23}
                  /></span
                >
                <div>
                  <strong
                    >{light >= 70
                      ? "Bright & airy"
                      : light >= 25
                        ? "Soft daylight"
                        : "Cozy & quiet"}</strong
                  ><span>{light}% light transmission</span>
                </div>
                <span class="summary-spark">✦</span>
              </div>
              <div class="control-block">
                <label for="opening"
                  ><span><Icon name="curtain" size={16} />Curtain opening</span
                  ><output>{room.opening}%</output></label
                ><input
                  id="opening"
                  type="range"
                  min="0"
                  max="100"
                  bind:value={room.opening}
                  oninput={() => (activeScene = "")}
                  style:--range={room.opening + "%"}
                />
                <div class="range-labels">
                  <span>Closed</span><span>Open</span>
                </div>
              </div>
              <div class="control-block">
                <label for="lift"
                  ><span><Icon name="arrow" size={16} />Vertical lift</span
                  ><output>{room.lift}%</output></label
                ><input
                  id="lift"
                  type="range"
                  min="0"
                  max="100"
                  bind:value={room.lift}
                  oninput={() => (activeScene = "")}
                  style:--range={room.lift + "%"}
                />
                <div class="range-labels">
                  <span>Lowered</span><span>Raised</span>
                </div>
              </div>
              <div class="control-block">
                <label for="light"
                  ><span
                    ><Icon name="sun" size={16} />{room.auto
                      ? "Preferred brightness"
                      : "Light transmission"}</span
                  ><output>{room.light}%</output></label
                ><input
                  id="light"
                  type="range"
                  min="0"
                  max="100"
                  bind:value={room.light}
                  oninput={() => (activeScene = "")}
                  style:--range={room.light + "%"}
                />
                <div class="range-labels">
                  <span>{room.auto ? "Dim" : "Blackout"}</span><span
                    >{room.auto ? "Bright" : "Sheer"}</span
                  >
                </div>
              </div>
              <div class="auto-light-row">
                <div>
                  <strong>Adaptive light</strong>
                  <p>Keep your brightness just right.</p>
                </div>
                <button
                  class="toggle"
                  class:on={room.auto}
                  role="switch"
                  aria-checked={room.auto}
                  aria-label="Adaptive light"
                  onclick={() => {
                    room.auto = !room.auto;
                    activeScene = "";
                  }}><span></span></button
                >
              </div>
              {#if room.auto}<p class="small-note">
                  Simulated sensor responds to outdoor weather.
                </p>{/if}
              <div class="section-heading">
                <span>THE FEEL OF YOUR CURTAIN</span>
              </div>
              <div class="material-options">
                <button
                  class:active={room.material === "linen"}
                  aria-pressed={room.material === "linen"}
                  onclick={() => (room.material = "linen")}
                  ><span class="material-sample linen"></span>Soft linen</button
                ><button
                  class:active={room.material === "smooth"}
                  aria-pressed={room.material === "smooth"}
                  onclick={() => (room.material = "smooth")}
                  ><span class="material-sample smooth"></span>Smooth panel</button
                >
              </div>
              <div class="section-heading">
                <span>YOUR PRESETS</span><span class="section-count"
                  >{customPresets.length}/12</span
                >
              </div>
              <form class="preset-form" onsubmit={savePreset}>
                <input
                  aria-label="Preset name"
                  placeholder="Name this setting"
                  maxlength="32"
                  bind:value={presetName}
                />
                <button
                  type="submit"
                  disabled={!presetName.trim() || customPresets.length >= 12}
                  ><Icon name="plus" size={14} />Save</button
                >
              </form>
              <p class="small-note">
                Saves position, brightness &amp; outdoor scene.
              </p>
              {#if customPresets.length}<div class="custom-preset-list">
                  {#each customPresets as saved (saved.id)}<div
                      class="custom-preset"
                      class:active={activeScene === saved.id}
                    >
                      <button
                        class="apply-preset"
                        aria-label={`Apply preset: ${saved.name}`}
                        aria-pressed={activeScene === saved.id}
                        onclick={() => applyPreset(saved)}
                      >
                        <Icon name="bookmark" size={14} /><span
                          >{saved.name}</span
                        >
                      </button>
                      <button
                        aria-label={`Delete preset: ${saved.name}`}
                        onclick={() => {
                          customPresets = customPresets.filter(
                            (p) => p.id !== saved.id,
                          );
                          if (activeScene === saved.id) activeScene = "";
                        }}><Icon name="close" size={13} /></button
                      >
                    </div>{/each}
                </div>{/if}
            {:else if tab === "widgets"}
              <div class="phone-section-title">
                <h2>Widgets</h2>
              </div>
              <div class="widget-options">
                {#each widgetOptions as widget}<div class="widget-option">
                    <span class="widget-icon"
                      ><Icon name={widget.icon} size={18} /></span
                    >
                    <div>
                      <strong>{widget.name}</strong>
                      <p>{widget.detail}</p>
                    </div>
                    <button
                      class="toggle"
                      class:on={room.widgets[widget.id]}
                      role="switch"
                      aria-checked={room.widgets[widget.id]}
                      aria-label={`${widget.name} widget`}
                      onclick={() =>
                        (room.widgets[widget.id] = !room.widgets[widget.id])}
                      ><span></span></button
                    >
                  </div>{/each}
              </div>
              {#if room.widgets.tasks}<div class="section-heading">
                  <span>YOUR LITTLE THINGS</span>
                </div>
                <form class="task-form" onsubmit={addTask}>
                  <input
                    aria-label="New task"
                    placeholder="Add something to do…"
                    maxlength="100"
                    bind:value={taskText}
                  /><button aria-label="Add task" disabled={!taskText.trim()}
                    ><Icon name="arrow" size={17} /></button
                  >
                </form>
                <div class="task-list">
                  {#each room.tasks as task}<div class="task-item">
                      <label
                        ><input type="checkbox" bind:checked={task.done} /><span
                          class:done={task.done}>{task.text}</span
                        ></label
                      ><button
                        aria-label={`Delete task: ${task.text}`}
                        onclick={() =>
                          (room.tasks = room.tasks.filter(
                            (t) => t.id !== task.id,
                          ))}><Icon name="close" size={13} /></button
                      >
                    </div>{/each}
                </div>{/if}
              {#if room.widgets.music}<div class="section-heading">
                  <span>YOUR SOUNDTRACK</span>
                </div>
                <div class="audio-controls">
                  <button
                    class="play-button"
                    aria-label={playing ? "Pause music" : "Play music"}
                    onclick={toggleAudio}
                    ><Icon
                      name={playing ? "pause" : "play"}
                      size={17}
                    /></button
                  ><span>{track || "Choose an audio file"}</span><button
                    aria-label="Upload audio"
                    onclick={() => audioInput.click()}
                    ><Icon name="upload" size={16} /></button
                  >
                </div>
                <div class="control-block volume-control">
                  <label for="music-volume"
                    ><span><Icon name="volume" size={15} />Music volume</span
                    ><output>{volume}%</output></label
                  >
                  <input
                    id="music-volume"
                    type="range"
                    min="0"
                    max="100"
                    bind:value={volume}
                    style:--range={volume + "%"}
                  />
                  <div class="range-labels">
                    <span>Muted</span><span>Full volume</span>
                  </div>
                </div>
                <p class="small-note">
                  Plays locally. Choose again after refreshing.
                </p>{/if}
            {:else}
              <div class="phone-section-title design-title">
                <h2>Curtain design</h2>
                <button
                  class="undo-button"
                  aria-label="Undo last window edit"
                  title="Undo last window edit"
                  disabled={!windowUndo[room.id]}
                  onclick={undoWindowEdit}
                  ><Icon name="undo" size={14} />Undo</button
                >
              </div>
              <div class="section-heading first">
                <span>CURTAIN COLOR</span>
              </div>
              <div class="swatches">
                {#each colors as color}<button
                    class:active={room.color === color.value}
                    style:--swatch={color.value}
                    aria-label={color.name}
                    aria-pressed={room.color === color.value}
                    onclick={() => (room.color = color.value)}
                    >{#if room.color === color.value}<Icon
                        name="check"
                        size={18}
                      />{/if}</button
                  >{/each}<span
                  >{colors.find((c) => c.value === room.color)?.name}</span
                >
              </div>
              <div class="image-actions">
                <button
                  class="upload-button"
                  onclick={() => fullImageInput.click()}
                  ><Icon name="upload" size={15} />{room.image
                    ? "Change curtain image"
                    : "Add a curtain image"}</button
                >{#if room.image}<button
                    aria-label="Remove curtain image"
                    onclick={() => (room.image = "")}
                    ><Icon name="trash" size={15} /></button
                  >{/if}
              </div>
              <div class="section-heading">
                <span>CREATE YOUR OWN WINDOWS</span><span class="section-count"
                  >{room.sections.length}/32</span
                >
              </div>
              <SectionEditor
                {room}
                bind:selected
                onedit={() => rememberWindows()}
              />
              {#if room.sections.length}<label
                  class="field-label"
                  for="section-select">Edit a window</label
                ><select
                  id="section-select"
                  class="section-select"
                  bind:value={selected}
                  onchange={() => (editingWindow = false)}
                  ><option value="">Choose a section</option
                  >{#each room.sections as item}<option value={item.id}
                      >{item.name}</option
                    >{/each}</select
                >{/if}
              {#if section}<div class="control-block section-control">
                  <label for="section-light"
                    ><span>Window transparency</span><output
                      >{section.light}%</output
                    ></label
                  ><input
                    id="section-light"
                    type="range"
                    min="0"
                    max="100"
                    value={section.light}
                    oninput={editWindowLight}
                    onchange={() => (editingWindow = false)}
                    onblur={() => (editingWindow = false)}
                    style:--range={section.light + "%"}
                  />
                  <div class="range-labels">
                    <span>Opaque</span><span>Clear</span>
                  </div>
                </div>
                <div class="image-actions">
                  <button
                    class="upload-button"
                    onclick={() => sectionImageInput.click()}
                    ><Icon name="upload" size={14} />{section.image
                      ? "Change window image"
                      : "Add a window image"}</button
                  ><button
                    aria-label="Delete selected window"
                    onclick={() => {
                      rememberWindows();
                      room.sections = room.sections.filter(
                        (s) => s.id !== selected,
                      );
                      selected = "";
                    }}><Icon name="trash" size={15} /></button
                  >
                </div>
                {#if section.image}<button
                    class="text-button"
                    onclick={() => {
                      if (section) {
                        rememberWindows();
                        section.image = "";
                      }
                    }}>Remove window image</button
                  >{/if}{/if}
              <p class="small-note">
                Images stay on your device. JPG, PNG, WebP or GIF · up to 3 MB.
              </p>
            {/if}
          </div>
          <div class="home-indicator"></div>
        </div>
      </aside>
      <section
        class="preview-column"
        class:expanded
        bind:this={previewElement}
        aria-label="Live curtain preview"
      >
        <div class="preview-header">
          <div class="preset-buttons" aria-label="Curtain presets">
            {#each [{ name: "Morning", icon: "sun" }, { name: "Focus", icon: "light" }, { name: "Unwind", icon: "moon" }] as presetOption}
              <button
                class:active={activeScene === presetOption.name}
                aria-pressed={activeScene === presetOption.name}
                onclick={() => preset(presetOption.name)}
                ><Icon
                  name={presetOption.icon}
                  size={16}
                />{presetOption.name}</button
              >
            {/each}
          </div>
          <button class="reset-button" onclick={resetRoom}
            ><Icon name="reset" size={13} />Reset room</button
          >
          <div class="day-toggle" aria-label="Outdoor lighting">
            <button
              class:active={daylight}
              aria-pressed={daylight}
              onclick={() => {
                daylight = true;
                activeScene = "";
              }}><Icon name="sun" size={15} />Daylight</button
            ><button
              class:active={!daylight}
              aria-pressed={!daylight}
              onclick={() => {
                daylight = false;
                activeScene = "";
              }}><Icon name="moon" size={15} />Evening</button
            >
          </div>
          <button
            class="rain-toggle"
            class:active={rainy}
            aria-pressed={rainy}
            onclick={() => {
              rainy = !rainy;
              activeScene = "";
            }}><Icon name="rain" size={16} />Rain</button
          >
          <button
            class="theme-toggle"
            disabled={!loaded}
            aria-label={theme === "dark"
              ? "Switch to light mode"
              : "Switch to dark mode"}
            title={theme === "dark" ? "Light mode" : "Dark mode"}
            aria-pressed={theme === "dark"}
            onclick={() => (theme = theme === "dark" ? "light" : "dark")}
            ><Icon name={theme === "dark" ? "sun" : "moon"} size={17} /></button
          >
          <button
            class="preview-expand theme-toggle"
            aria-label={expanded
              ? "Exit fullscreen preview"
              : "Fullscreen preview"}
            title={expanded ? "Exit fullscreen preview" : "Fullscreen preview"}
            aria-pressed={expanded}
            onclick={togglePreview}
            ><Icon name={expanded ? "collapse" : "expand"} size={17} /></button
          >
        </div>
        <CurtainPreview
          {room}
          {light}
          {daylight}
          {rainy}
          {time}
          {date}
          {playing}
          {track}
        />
      </section>
    </div>
  </main>
</div>
<input
  class="hidden-input"
  type="file"
  accept="image/jpeg,image/png,image/webp,image/gif"
  aria-label="Upload curtain image"
  bind:this={fullImageInput}
  onchange={(e) => uploadImage(e, "full")}
/>
<input
  class="hidden-input"
  type="file"
  accept="image/jpeg,image/png,image/webp,image/gif"
  aria-label="Upload window image"
  bind:this={sectionImageInput}
  onchange={(e) => uploadImage(e, "section")}
/>
<input
  class="hidden-input"
  type="file"
  accept="audio/*"
  aria-label="Upload music file"
  bind:this={audioInput}
  onchange={uploadAudio}
/>
<audio
  bind:this={audio}
  src={audioUrl || undefined}
  onplay={() => (playing = true)}
  onpause={() => (playing = false)}
  onended={() => (playing = false)}
  onerror={() => {
    if (audioUrl) notify("That audio file could not play. Try another format.");
  }}
></audio>
{#if message}<div class="toast" role="status">
    <Icon name="check" size={17} />{message}
  </div>{/if}
