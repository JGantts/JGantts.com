type Color = {
  hue: number, 
  saturation: number, 
  lightness: number
}

type Theme = {
  base1: Color,
  base2: Color,
  base3: Color,
  base4: Color,
  base5: Color,
  base6: Color,
  base7: Color,
  base8: Color,
  base9: Color,
  base10: Color,
  base11: Color,
  base12: Color,

  accent1: Color,
  accent2: Color,
  accent3: Color,
  accent4: Color,
  accent5: Color,
  accent6: Color,
  accent7: Color,
  accent8: Color,
  accent9: Color,
  accent10: Color,
  accent11: Color,
  accent12: Color,

  textGrayOnBaseLowContrast: Color,
  textGrayOnBase: Color,

  textGrayOnAccentLowContrast: Color,
  textGrayOnAccent: Color,

  textBaseOnBaseLowContrast: Color,
  textBaseOnBase: Color,

  textBaseOnAccentLowContrast: Color,
  textBaseOnAccent: Color,

  textAccentOnBaseLowContrast: Color,
  textAccentOnBase: Color,

  textAccentOnAccentLowContrast: Color,
  textAccentOnAccent: Color,
}

enum RainbowDirection {
  Regular,
  Reversed,
}

type Range = {
  low: number,
  high: number,
}

type Rainbow = {
  name: String,
  stops: { stop: number, color: Color}[],
  dir: RainbowDirection
}

enum BackgroundState {
  Unset,
  First,
  AfterFirstLoading,
  AfterFirstPlaying,
  AfterFirstPaused,
}

export {
  type Color,
  type Theme,
  RainbowDirection,
  type Rainbow,
  BackgroundState,
}