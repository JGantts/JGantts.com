import { computed, type ComputedRef, type Ref, ref, watch } from 'vue'
import { useSettings } from './Settings';

const settings = useSettings();

const darkModeUser: Ref<"light" | "dark" | "auto"> = ref("auto")
const darkModeSystem = ref(false);
const darkMode: ComputedRef<"dark" | "light"> = computed(() => {
  if (settings.darkMode === "auto") {
    return darkModeSystem.value ? "dark" : "light";
  } else {
    return settings.darkMode;
  }
});

watch(settings, () => {
    if (darkModeUser.value !== settings.darkMode) {
        darkModeUser.value = settings.darkMode
    }
})

watch(darkMode, () => {
  const root = document.documentElement;

  if (darkMode.value === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
}, { immediate: true })

function toggleUserTheme() {
  if (settings.darkMode === "auto") {
    // if currently auto, switch to opposite of system
    settings.darkMode = darkModeSystem.value ? "light" : "dark";
  } else if (settings.darkMode === "dark") {
    settings.darkMode = "light";
  } else {
    settings.darkMode = "dark";
  }
}

function clearUserTheme() {
  settings.darkMode = "auto";

}

let media: MediaQueryList;



const darkModeObject = {
    darkMode,
    darkModeUser,
    darkModeSystem,
    toggleUserTheme,
    clearUserTheme,
}

let initialized = false
function useDarkMode() {
    if (!initialized) {
        media = window.matchMedia("(prefers-color-scheme: dark)");

        // initial value
        darkModeSystem.value = media.matches;

        // listen for changes
        const handler = (e: MediaQueryListEvent) => {
            darkModeSystem.value = e.matches;
        };

        media.addEventListener("change", handler);

        initialized = true
    }

    return darkModeObject;
}

export {
    useDarkMode
}



