import { reactive, watch } from "vue";
import { labelModes, type LabelMode } from '../maps/townLabels';

export type DarkMode = "light" | "dark" | "auto";

export type AppSettings = {
  center: [number, number];
  zoom: number;
  pitch: number;
  bearing: number;
  darkMode: DarkMode;
  labelMode: LabelMode;
};

const STORAGE_KEY = "app-settings";

const DEFAULT_SETTINGS: AppSettings = {
  center: [-34.3927, 11.8405],
  zoom: 6,
  pitch: 0,
  bearing: 0,
  darkMode: "auto",
  labelMode: "both",
};

function load(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };

    const parsed = JSON.parse(raw);

    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      labelMode: labelModes.includes(parsed.labelMode) ? parsed.labelMode : 'both',
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

function save(state: AppSettings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

const state = reactive<AppSettings>(load());

let timeout: number | undefined;

watch(
  state,
  (val) => {
    clearTimeout(timeout);
    timeout = window.setTimeout(() => save(val), 200);
  },
  { deep: true }
);

export function useSettings() {
  return state;
}
