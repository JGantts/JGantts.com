import type { Color, Theme } from "./Types"

function setCSSColors(theme: Theme) {
  const bs = document.body.style
  bs.setProperty("--base1", componentsToHsl(theme.base1))
  bs.setProperty("--base2", componentsToHsl(theme.base2))
  bs.setProperty("--base3", componentsToHsl(theme.base3))
  bs.setProperty("--base4", componentsToHsl(theme.base4))
  bs.setProperty("--base5", componentsToHsl(theme.base5))
  bs.setProperty("--base6", componentsToHsl(theme.base6))
  bs.setProperty("--base7", componentsToHsl(theme.base7))
  bs.setProperty("--base8", componentsToHsl(theme.base8))
  bs.setProperty("--base9", componentsToHsl(theme.base9))
  bs.setProperty("--base10", componentsToHsl(theme.base10))
  bs.setProperty("--base11", componentsToHsl(theme.base11))
  bs.setProperty("--base12", componentsToHsl(theme.base12))

  bs.setProperty("--accent1", componentsToHsl(theme.accent1))
  bs.setProperty("--accent2", componentsToHsl(theme.accent2))
  bs.setProperty("--accent3", componentsToHsl(theme.accent3))
  bs.setProperty("--accent4", componentsToHsl(theme.accent4))
  bs.setProperty("--accent5", componentsToHsl(theme.accent5))
  bs.setProperty("--accent6", componentsToHsl(theme.accent6))
  bs.setProperty("--accent7", componentsToHsl(theme.accent7))
  bs.setProperty("--accent8", componentsToHsl(theme.accent8))
  bs.setProperty("--accent9", componentsToHsl(theme.accent9))
  bs.setProperty("--accent10", componentsToHsl(theme.accent10))
  bs.setProperty("--accent11", componentsToHsl(theme.accent11))
  bs.setProperty("--accent12", componentsToHsl(theme.accent12))


  bs.setProperty("--textGrayOnBaseLowContrast", componentsToHsl(theme.textGrayOnBaseLowContrast))
  bs.setProperty("--textGrayOnBase", componentsToHsl(theme.textGrayOnBase))

  bs.setProperty("--textGrayOnAccentLowContrast", componentsToHsl(theme.textGrayOnAccentLowContrast))
  bs.setProperty("--textGrayOnAccent", componentsToHsl(theme.textGrayOnAccent))


  bs.setProperty("--textBaseOnBaseLowContrast", componentsToHsl(theme.textBaseOnBaseLowContrast))
  bs.setProperty("--textBaseOnBase", componentsToHsl(theme.textBaseOnBase))

  bs.setProperty("--textBaseOnAccentLowContrast", componentsToHsl(theme.textBaseOnAccentLowContrast))
  bs.setProperty("--textBaseOnAccent", componentsToHsl(theme.textBaseOnAccent))


  bs.setProperty("--textAccentOnBaseLowContrast", componentsToHsl(theme.textAccentOnBaseLowContrast))
  bs.setProperty("--textAccentOnBase", componentsToHsl(theme.textAccentOnBase))

  bs.setProperty("--textAccentOnAccentLowContrast", componentsToHsl(theme.textAccentOnAccentLowContrast))
  bs.setProperty("--textAccentOnAccent", componentsToHsl(theme.textAccentOnAccent))
}

function componentsToHsl(color: Color): string {
  return `hsl(${color.hue}, ${color.saturation}%, ${color.lightness}%)`
}

export {
  setCSSColors
}