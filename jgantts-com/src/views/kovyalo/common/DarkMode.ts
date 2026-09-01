import { computed, ref, watch } from "vue";
import { useSettings } from "./Settings";

const settings = useSettings();

const darkModeSystem = ref(false);

const media = window.matchMedia("(prefers-color-scheme: dark)");

darkModeSystem.value = media.matches;

media.addEventListener("change", (e) => {
  darkModeSystem.value = e.matches;

  if (settings.darkMode !== "auto") {
    applyDocumentTheme(settings.darkMode);
  }
});

const effectiveDarkMode = computed(() => {
  if (settings.darkMode === "auto") {
    return darkModeSystem.value ? "dark" : "light";
  }
  return settings.darkMode;
});

function applyDocumentTheme(mode: "light" | "dark") {
  document.documentElement.classList.remove("dark", "light");
  document.documentElement.classList.add(mode);
}

watch(
  effectiveDarkMode,
  (mode) => {
    applyDocumentTheme(mode);
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
