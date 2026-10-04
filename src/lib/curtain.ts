export type Widget =
  "clock" | "weather" | "temperature" | "light" | "tasks" | "music";
export type Tool = "grid" | "circle" | "rectangle" | "freehand";
export type Section = {
  id: string;
  name: string;
  path: string;
  x: number;
  y: number;
  width: number;
  height: number;
  light: number;
  image: string;
};
export type Room = {
  id: string;
  name: string;
  opening: number;
  lift: number;
  light: number;
  auto: boolean;
  material: "linen" | "smooth";
  color: string;
  image: string;
  widgets: Record<Widget, boolean>;
  sections: Section[];
  tasks: { id: string; text: string; done: boolean }[];
};

export const colors = [
  { name: "Natural linen", value: "#dedace" },
  { name: "Soft sage", value: "#bdc9b6" },
  { name: "Warm clay", value: "#cfae9e" },
  { name: "Slate", value: "#6d7c7a" },
];

export const widgetOptions: {
  id: Widget;
  name: string;
  detail: string;
  icon: string;
}[] = [
  {
    id: "clock",
    name: "Time & date",
    detail: "A little more present",
    icon: "clock",
  },
  {
    id: "weather",
    name: "Weather",
    detail: "Sample outdoor weather",
    icon: "sun",
  },
  {
    id: "temperature",
    name: "Room temperature",
    detail: "Sample indoor reading",
    icon: "thermometer",
  },
  {
    id: "light",
    name: "Light level",
    detail: "Your current curtain setting",
    icon: "light",
  },
  {
    id: "tasks",
    name: "To-do list",
    detail: "Make room for your day",
    icon: "check",
  },
  {
    id: "music",
    name: "Music",
    detail: "Play an audio file from your device",
    icon: "music",
  },
];

export function createRooms(): Room[] {
  return ["Living room", "Bedroom 1", "Bedroom 2", "Kitchen"].map(
    (name, i) => ({
      id: ["living", "bedroom-1", "bedroom-2", "kitchen"][i],
      name,
      opening: i === 0 ? 12 : 0,
      lift: 0,
      light: 38,
      auto: false,
      material: "linen",
      color: colors[i % colors.length].value,
      image: "",
      widgets: {
        clock: true,
        weather: true,
        temperature: false,
        light: false,
        tasks: false,
        music: false,
      },
      sections: [],
      tasks: [{ id: "first", text: "Take a moment for yourself", done: false }],
    }),
  );
}

export function gridPath(index: number): string {
  const x = (index % 4) * 250;
  const y = Math.floor(index / 4) * 175;
  return `M ${x} ${y} h 250 v 175 h -250 Z`;
}

// The sensor is a local approximation: more outdoor light needs less transmission.
export function transmission(
  target: number,
  daylight: boolean,
  rainy = false,
): number {
  const outdoorLight = daylight ? (rainy ? 0.7 : 1.15) : rainy ? 0.25 : 0.35;
  return Math.min(100, Math.round(target / outdoorLight));
}
