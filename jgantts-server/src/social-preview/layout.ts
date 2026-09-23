export const SOCIAL_PREVIEW_WIDTH = 1_200;
export const SOCIAL_PREVIEW_HEIGHT = 630;
export const SOCIAL_PREVIEW_GAP = 12;
export const SOCIAL_PREVIEW_MAX_IMAGES = 5;

export interface SocialPreviewTile {
  height: number;
  width: number;
  x: number;
  y: number;
}

export function socialPreviewLayout(count: number): SocialPreviewTile[] {
  if (!Number.isInteger(count) || count < 1 || count > SOCIAL_PREVIEW_MAX_IMAGES) {
    throw new RangeError('Social preview layout supports one through five images.');
  }
  if (count === 1) return [{ x: 0, y: 0, width: 1_200, height: 630 }];
  if (count === 2) return [
    { x: 0, y: 0, width: 594, height: 630 },
    { x: 606, y: 0, width: 594, height: 630 },
  ];
  if (count === 3) return [
    { x: 0, y: 0, width: 792, height: 630 },
    { x: 804, y: 0, width: 396, height: 309 },
    { x: 804, y: 321, width: 396, height: 309 },
  ];
  if (count === 4) return [
    { x: 0, y: 0, width: 594, height: 309 },
    { x: 606, y: 0, width: 594, height: 309 },
    { x: 0, y: 321, width: 594, height: 309 },
    { x: 606, y: 321, width: 594, height: 309 },
  ];
  return [
    { x: 0, y: 0, width: 720, height: 630 },
    { x: 732, y: 0, width: 228, height: 309 },
    { x: 972, y: 0, width: 228, height: 309 },
    { x: 732, y: 321, width: 228, height: 309 },
    { x: 972, y: 321, width: 228, height: 309 },
  ];
}
