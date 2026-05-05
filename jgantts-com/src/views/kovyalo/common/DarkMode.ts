import { computed, ref, watch } from "vue";
import { useSettings } from "./Settings";

const settings = useSettings();

const darkModeSystem = ref(false);

const media = window.matchMedia("(prefers-color-scheme: dark)");

darkModeSystem.value = media.matches;

media.addEventListener("change", (e) => {
  darkModeSystem.value = e.matches;
});

const effectiveDarkMode = computed(() => {
  if (settings.darkMode === "auto") {
    return darkModeSystem.value ? "dark" : "light";
  }
  return settings.darkMode;
});

// 👇 THIS is what MapLibre should depend on
watch(
  effectiveDarkMode,
  (mode) => {
    document.documentElement.classList.toggle("dark", mode === "dark");
  },
  { immediate: true }
);

const toggleUserTheme = () => {
  if (settings.darkMode == "auto") {
    if (darkModeSystem.value == true) {
      settings.darkMode = "light"
    } else {
      settings.darkMode = "dark"
    }
  } else if (settings.darkMode == "dark") {
    settings.darkMode = "light"
  } else {
    settings.darkMode = "dark"
  }
}

const clearUserTheme = () => {
  settings.darkMode = "auto"
}

export {
    effectiveDarkMode,
    darkModeSystem,
    toggleUserTheme,
    clearUserTheme,
}