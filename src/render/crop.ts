export interface PixelRectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DocumentCropInput {
  artboardTop: number;
  artboardLeft: number;
  dpi: number;
  bounds: number[];
  paddingPt?: number;
  imageWidth: number;
  imageHeight: number;
}

export function documentBoundsToPixels(input: DocumentCropInput): PixelRectangle {
  if (
    input.bounds.length !== 4
    || input.bounds[2]! <= input.bounds[0]!
    || input.bounds[1]! <= input.bounds[3]!
  ) {
    throw new Error('Invalid Illustrator bounds: expected [left, top, right, bottom].');
  }
  if (!(input.dpi > 0)) throw new Error('DPI must be greater than zero.');

  const scale = input.dpi / 72;
  const padding = input.paddingPt ?? 0;
  const left = (input.bounds[0]! - padding - input.artboardLeft) * scale;
  const top = (input.artboardTop - (input.bounds[1]! + padding)) * scale;
  const right = (input.bounds[2]! + padding - input.artboardLeft) * scale;
  const bottom = (input.artboardTop - (input.bounds[3]! - padding)) * scale;
  const x = Math.max(0, Math.floor(left));
  const y = Math.max(0, Math.floor(top));
  const clippedRight = Math.min(input.imageWidth, Math.ceil(right));
  const clippedBottom = Math.min(input.imageHeight, Math.ceil(bottom));
  if (clippedRight <= x || clippedBottom <= y) throw new Error('Crop is outside the rendered page.');
  return { x, y, width: clippedRight - x, height: clippedBottom - y };
}
