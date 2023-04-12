export const RGBToHSL = (r: number, g: number, b: number): [h: number, s: number, l: number] => {
    console.log(`${r}, ${g}, ${b}`)
    r /= 255
    g /= 255
    b /= 255
    const l = Math.max(r, g, b);
    const s = l - Math.min(r, g, b);
    const h = s
        ? l === r
        ? (g - b) / s
        : l === g
        ? 2 + (b - r) / s
        : 4 + (r - g) / s
        : 0;
        console.log(`${h}, ${s}, ${l}`)
    return [
        Math.round(60 * h < 0 ? 60 * h + 360 : 60 * h),
        Math.round(100 * (s ? (l <= 0.5 ? s / (2 * l - s) : s / (2 - (2 * l - s))) : 0)),
        Math.round((100 * (2 * l - s)) / 2),
    ]
}
