import {
  bronze,
  bronzeDark,

  // Mauve
  mauve,
  mauveDark,

  tomato,
  tomatoDark,
  red,
  redDark,
  crimson,
  crimsonDark,
  plum,
  plumDark,
  violet,
  violetDark,
  purple,
  purpleDark,

  // Slate
  slate,
  slateDark,

  indigo,
  indigoDark,
  blue,
  blueDark,
  sky,
  skyDark,
  cyan,
  cyanDark,

  // Sage
  sage,
  sageDark,

  teal,
  tealDark,
  green,
  greenDark,

  // Olive
  olive,
  oliveDark,

  grass,
  grassDark,
  lime,
  limeDark,

  // Sand
  sand,
  sandDark,

  yellow,
  yellowDark,
  amber,
  amberDark,
  orange,
  orangeDark,

} from '@radix-ui/colors';

import type { Theme, Color } from './Types'



const theme_BlueDark_slate__Tomato_mauve: Theme = {
  base1: hslToComponents(blueDark.blue1),
  base2: hslToComponents(blueDark.blue2),
  base3: hslToComponents(blueDark.blue3),
  base4: hslToComponents(blueDark.blue4),
  base5: hslToComponents(blueDark.blue5),
  base6: hslToComponents(blueDark.blue6),
  base7: hslToComponents(blueDark.blue7),
  base8: hslToComponents(blueDark.blue8),
  base9: hslToComponents(blueDark.blue9),
  base10: hslToComponents(blueDark.blue10),
  base11: hslToComponents(blueDark.blue11),
  base12: hslToComponents(blueDark.blue12),

  accent1: hslToComponents(tomatoDark.tomato1),
  accent2: hslToComponents(tomatoDark.tomato2),
  accent3: hslToComponents(tomatoDark.tomato3),
  accent4: hslToComponents(tomatoDark.tomato4),
  accent5: hslToComponents(tomatoDark.tomato5),
  accent6: hslToComponents(tomatoDark.tomato6),
  accent7: hslToComponents(tomatoDark.tomato7),
  accent8: hslToComponents(tomatoDark.tomato8),
  accent9: hslToComponents(tomatoDark.tomato9),
  accent10: hslToComponents(tomatoDark.tomato10),
  accent11: hslToComponents(tomatoDark.tomato11),
  accent12: hslToComponents(tomatoDark.tomato12),

  textGrayOnBaseLowContrast: hslToComponents(slateDark.slate11),
  textGrayOnBase: hslToComponents(slateDark.slate12),

  textGrayOnAccentLowContrast: hslToComponents(mauveDark.mauve11),
  textGrayOnAccent: hslToComponents(mauveDark.mauve12),

  textBaseOnBaseLowContrast: hslToComponents(blueDark.blue11),
  textBaseOnBase: hslToComponents(blueDark.blue12),

  textBaseOnAccentLowContrast: hslToComponents(blueDark.blue11),
  textBaseOnAccent: hslToComponents(blueDark.blue12),

  textAccentOnBaseLowContrast: hslToComponents(tomatoDark.tomato11),
  textAccentOnBase: hslToComponents(tomatoDark.tomato10),

  textAccentOnAccentLowContrast: hslToComponents(tomatoDark.tomato11),
  textAccentOnAccent: hslToComponents(tomatoDark.tomato12),
}

const theme_Blue_slate__Orange_sand: Theme = {
  base1: hslToComponents(blue.blue1),
  base2: hslToComponents(blue.blue2),
  base3: hslToComponents(blue.blue3),
  base4: hslToComponents(blue.blue4),
  base5: hslToComponents(blue.blue5),
  base6: hslToComponents(blue.blue6),
  base7: hslToComponents(blue.blue7),
  base8: hslToComponents(blue.blue8),
  base9: hslToComponents(blue.blue9),
  base10: hslToComponents(blue.blue10),
  base11: hslToComponents(blue.blue11),
  base12: hslToComponents(blue.blue12),

  accent1: hslToComponents(orange.orange1),
  accent2: hslToComponents(orange.orange2),
  accent3: hslToComponents(orange.orange3),
  accent4: hslToComponents(orange.orange4),
  accent5: hslToComponents(orange.orange5),
  accent6: hslToComponents(orange.orange6),
  accent7: hslToComponents(orange.orange7),
  accent8: hslToComponents(orange.orange8),
  accent9: hslToComponents(orange.orange9),
  accent10: hslToComponents(orange.orange10),
  accent11: hslToComponents(orange.orange11),
  accent12: hslToComponents(orange.orange12),

  textGrayOnBaseLowContrast: hslToComponents(slate.slate11),
  textGrayOnBase: hslToComponents(slate.slate12),

  textGrayOnAccentLowContrast: hslToComponents(sandDark.sand11),
  textGrayOnAccent: hslToComponents(sandDark.sand12),

  textBaseOnBaseLowContrast: hslToComponents(blueDark.blue11),
  textBaseOnBase: hslToComponents(blueDark.blue12),

  textBaseOnAccentLowContrast: hslToComponents(blue.blue11),
  textBaseOnAccent: hslToComponents(blue.blue12),

  textAccentOnBaseLowContrast: hslToComponents(orange.orange11),
  textAccentOnBase: hslToComponents(orange.orange10),

  textAccentOnAccentLowContrast: hslToComponents(orangeDark.orange11),
  textAccentOnAccent: hslToComponents(orangeDark.orange12),

  /*backgroundColors: [
    { stop: 0/6, color: hslToComponents(red.red9) },
    { stop: 1/6, color: hslToComponents(orange.orange9) },
    { stop: 2/6, color: hslToComponents(yellow.yellow9) },
    { stop: 3/6, color: hslToComponents(green.green9) },
    { stop: 4/6, color: hslToComponents(blue.blue9) },
    { stop: 5/6, color: hslToComponents(indigo.indigo9) },
    { stop: 6/6, color: hslToComponents(violet.violet9) },
  ],*/
}

function hslToComponents(hsl: string): Color {
  const splitA = hsl.split(',')
  const hue = splitA[0].split('(')[1]
  const saturation = splitA[1].split('%')[0]
  const lightness = splitA[2].split('%')[0]
  const color = {
    hue: Number(hue),
    saturation: Number(saturation),
    lightness: Number(lightness),
  }
  return color
}

export {
  theme_BlueDark_slate__Tomato_mauve,
  theme_Blue_slate__Orange_sand,
}