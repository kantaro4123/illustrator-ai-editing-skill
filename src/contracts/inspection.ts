export type Bounds = [number, number, number, number];

export interface TextStyleRunInspection {
  start: number;
  length: number;
  font: string;
  size: number;
  horizontalScale: number;
  verticalScale: number;
  tracking: number;
  leading: number;
}

export interface InspectionResult {
  document: Record<string, unknown> & { path: string; name: string };
  artboards: Array<Record<string, unknown> & { bounds: Bounds }>;
  layers: Array<Record<string, unknown>>;
  textFrames: Array<
    Record<string, unknown> & {
      geometricBounds: Bounds;
      visibleBounds: Bounds;
      styleRuns: TextStyleRunInspection[];
    }
  >;
  pageItems: Array<
    Record<string, unknown> & { geometricBounds: Bounds; visibleBounds: Bounds }
  >;
  links: Array<Record<string, unknown>>;
  rasterItems: Array<Record<string, unknown>>;
}

function record(value: unknown, label: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
  return value as Record<string, unknown>;
}

function array(value: unknown, label: string): unknown[] {
  if (!Array.isArray(value)) throw new Error(`${label} must be an array`);
  return value;
}

function bounds(value: unknown, label: string): Bounds {
  if (!Array.isArray(value) || value.length !== 4 || value.some((entry) => typeof entry !== 'number')) {
    throw new Error(`${label} must contain four numbers`);
  }
  return value as Bounds;
}

function numberField(value: Record<string, unknown>, key: string, label: string): number {
  if (typeof value[key] !== 'number') throw new Error(`${label}.${key} must be a number`);
  return value[key];
}

export function parseInspection(value: unknown): InspectionResult {
  const root = record(value, 'inspection');
  const document = record(root.document, 'document');
  if (typeof document.path !== 'string' || typeof document.name !== 'string') {
    throw new Error('document path and name must be strings');
  }

  const artboards = array(root.artboards, 'artboards').map((entry, index) => {
    const item = record(entry, `artboards[${index}]`);
    return { ...item, bounds: bounds(item.bounds, `artboards[${index}].bounds`) };
  });
  const layers = array(root.layers, 'layers').map((entry, index) =>
    record(entry, `layers[${index}]`),
  );
  const textFrames = array(root.textFrames, 'textFrames').map((entry, index) => {
    const item = record(entry, `textFrames[${index}]`);
    const styleRuns = array(item.styleRuns, `textFrames[${index}].styleRuns`).map(
      (run, runIndex) => {
        const style = record(run, `textFrames[${index}].styleRuns[${runIndex}]`);
        return {
          start: numberField(style, 'start', 'styleRun'),
          length: numberField(style, 'length', 'styleRun'),
          font: String(style.font ?? ''),
          size: numberField(style, 'size', 'styleRun'),
          horizontalScale: numberField(style, 'horizontalScale', 'styleRun'),
          verticalScale: numberField(style, 'verticalScale', 'styleRun'),
          tracking: numberField(style, 'tracking', 'styleRun'),
          leading: numberField(style, 'leading', 'styleRun'),
        };
      },
    );
    return {
      ...item,
      geometricBounds: bounds(item.geometricBounds, `textFrames[${index}].geometricBounds`),
      visibleBounds: bounds(item.visibleBounds, `textFrames[${index}].visibleBounds`),
      styleRuns,
    };
  });
  const pageItems = array(root.pageItems, 'pageItems').map((entry, index) => {
    const item = record(entry, `pageItems[${index}]`);
    return {
      ...item,
      geometricBounds: bounds(item.geometricBounds, `pageItems[${index}].geometricBounds`),
      visibleBounds: bounds(item.visibleBounds, `pageItems[${index}].visibleBounds`),
    };
  });

  return {
    document: document as InspectionResult['document'],
    artboards,
    layers,
    textFrames,
    pageItems,
    links: array(root.links, 'links').map((entry, index) => record(entry, `links[${index}]`)),
    rasterItems: array(root.rasterItems, 'rasterItems').map((entry, index) =>
      record(entry, `rasterItems[${index}]`),
    ),
  };
}
