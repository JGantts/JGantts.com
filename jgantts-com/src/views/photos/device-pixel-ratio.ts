import { onBeforeUnmount, onMounted, readonly, ref, type DeepReadonly, type Ref } from 'vue'

function currentDevicePixelRatio() {
  if (typeof window === 'undefined') return 1
  return Math.max(1, window.devicePixelRatio || 1)
}

const devicePixelRatio = ref(currentDevicePixelRatio())
let subscribers = 0
let resolutionQuery: MediaQueryList | null = null

function stopResolutionQuery() {
  resolutionQuery?.removeEventListener('change', handleDevicePixelRatioChange)
  resolutionQuery = null
}

function watchCurrentResolution() {
  stopResolutionQuery()
  if (typeof window.matchMedia !== 'function') return
  // This query stops matching when the window crosses onto a display with a
  // different scale factor, even if its CSS-pixel dimensions do not change.
  resolutionQuery = window.matchMedia(`(resolution: ${devicePixelRatio.value}dppx)`)
  resolutionQuery.addEventListener('change', handleDevicePixelRatioChange)
}

function handleDevicePixelRatioChange() {
  const nextDevicePixelRatio = currentDevicePixelRatio()
  if (devicePixelRatio.value !== nextDevicePixelRatio) {
    devicePixelRatio.value = nextDevicePixelRatio
  }
  watchCurrentResolution()
}

function startWatching() {
  handleDevicePixelRatioChange()
  window.addEventListener('resize', handleDevicePixelRatioChange, { passive: true })
  window.addEventListener('focus', handleDevicePixelRatioChange)
}

function stopWatching() {
  stopResolutionQuery()
  window.removeEventListener('resize', handleDevicePixelRatioChange)
  window.removeEventListener('focus', handleDevicePixelRatioChange)
}

export function useDevicePixelRatio(): DeepReadonly<Ref<number>> {
  devicePixelRatio.value = currentDevicePixelRatio()
  onMounted(() => {
    subscribers += 1
    if (subscribers === 1) startWatching()
  })
  onBeforeUnmount(() => {
    subscribers -= 1
    if (subscribers === 0) stopWatching()
  })
  return readonly(devicePixelRatio)
}
