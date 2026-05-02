import { reactive, watch } from "vue";

type DarkMode = "light" | "dark" | "auto";
type AppSettings = {
  center: [number, number]
  zoom: number
  pitch: number
  bearing: number
  darkMode: DarkMode
};

const STORAGE_KEY = "app-settings";

const DEFAULT_SETTINGS: AppSettings = {
    center: [-34.3927, 11.8405],
    zoom: 6,
    pitch: 0,
    bearing: 0,
    darkMode: "auto",
};

function load(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;

    const parsed = JSON.parse(raw);

    // shallow merge to protect against missing fields after updates
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function save(state: AppSettings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

// single reactive store instance
const state = reactive<AppSettings>(load());

// persist automatically
watch(
  state,
  (val) => {
    save(val);
  },
  { deep: true }
);

function useSettings() {
  return state;
}

export {
    type DarkMode,
    type AppSettings,
    useSettings
}