// @command inspect
var inspectParams = parseJsonFile(PARAMS_PATH);
var inspectDocument = requireTargetDocument();

function inspectBounds(value) {
  return [value[0], value[1], value[2], value[3]];
}

function inspectUuid(item) {
  try { return item.uuid || ""; } catch (uuidError) { return ""; }
}

function inspectName(item) {
  try { return item.name || ""; } catch (nameError) { return ""; }
}

function inspectNote(item) {
  try { return item.note || ""; } catch (noteError) { return ""; }
}

function inspectOverflow(frame) {
  if (frame.kind !== TextType.AREATEXT) return false;
  try {
    var visible = 0;
    var lineIndex;
    for (lineIndex = 0; lineIndex < frame.lines.length; lineIndex++) {
      visible += frame.lines[lineIndex].characters.length;
    }
    var breaks = 0;
    var text = frame.contents;
    var textIndex;
    for (textIndex = 0; textIndex < text.length; textIndex++) {
      var code = text.charCodeAt(textIndex);
      if (code === 10 || code === 13 || code === 3) breaks++;
    }
    return visible < frame.textRange.characters.length - breaks;
  } catch (overflowError) { return null; }
}

function styleRunAt(range, startValue, lengthValue) {
  var attributes = range.characterAttributes;
  var fontName = "";
  try { fontName = attributes.textFont.name; } catch (fontError) {}
  return {
    start: startValue,
    length: lengthValue,
    font: fontName,
    size: attributes.size,
    horizontalScale: attributes.horizontalScale,
    verticalScale: attributes.verticalScale,
    tracking: attributes.tracking,
    leading: attributes.leading
  };
}

function styleSignature(run) {
  return [run.font, run.size, run.horizontalScale, run.verticalScale, run.tracking, run.leading].join("|");
}

function inspectStyleRuns(frame, fullDetail) {
  if (!fullDetail || frame.characters.length === 0) {
    return [styleRunAt(frame.textRange, 0, frame.characters.length)];
  }
  var output = [];
  var current = null;
  var currentSignature = "";
  var index;
  for (index = 0; index < frame.characters.length; index++) {
    var next = styleRunAt(frame.characters[index], index, 1);
    var nextSignature = styleSignature(next);
    if (current && nextSignature === currentSignature) {
      current.length++;
    } else {
      if (current) output.push(current);
      current = next;
      currentSignature = nextSignature;
    }
  }
  if (current) output.push(current);
  return output;
}

var inspection = {
  document: {
    path: documentFsPath(inspectDocument),
    name: decodedDocumentName(inspectDocument),
    saved: inspectDocument.saved,
    colorSpace: inspectDocument.documentColorSpace === DocumentColorSpace.CMYK ? "CMYK" : "RGB"
  },
  artboards: [],
  layers: [],
  textFrames: [],
  pageItems: [],
  links: [],
  rasterItems: []
};

var inspectIndex;
for (inspectIndex = 0; inspectIndex < inspectDocument.artboards.length; inspectIndex++) {
  var artboard = inspectDocument.artboards[inspectIndex];
  inspection.artboards.push({
    index: inspectIndex,
    name: artboard.name,
    bounds: inspectBounds(artboard.artboardRect)
  });
}

for (inspectIndex = 0; inspectIndex < inspectDocument.layers.length; inspectIndex++) {
  var layer = inspectDocument.layers[inspectIndex];
  inspection.layers.push({
    index: inspectIndex,
    name: layer.name,
    locked: layer.locked,
    visible: layer.visible,
    itemCount: layer.pageItems.length
  });
}

for (inspectIndex = 0; inspectIndex < inspectDocument.textFrames.length; inspectIndex++) {
  var frame = inspectDocument.textFrames[inspectIndex];
  inspection.textFrames.push({
    uuid: inspectUuid(frame),
    name: inspectName(frame),
    kind: String(frame.kind),
    contents: frame.contents,
    geometricBounds: inspectBounds(frame.geometricBounds),
    visibleBounds: inspectBounds(frame.visibleBounds),
    locked: frame.locked,
    hidden: frame.hidden,
    overflow: inspectOverflow(frame),
    styleRuns: inspectStyleRuns(frame, inspectParams.detail === "full")
  });
}

for (inspectIndex = 0; inspectIndex < inspectDocument.pageItems.length; inspectIndex++) {
  var pageItem = inspectDocument.pageItems[inspectIndex];
  inspection.pageItems.push({
    uuid: inspectUuid(pageItem),
    typename: pageItem.typename,
    name: inspectName(pageItem),
    note: inspectNote(pageItem),
    geometricBounds: inspectBounds(pageItem.geometricBounds),
    visibleBounds: inspectBounds(pageItem.visibleBounds),
    locked: pageItem.locked,
    hidden: pageItem.hidden
  });
}

for (inspectIndex = 0; inspectIndex < inspectDocument.placedItems.length; inspectIndex++) {
  var link = inspectDocument.placedItems[inspectIndex];
  var linkPath = "";
  try { linkPath = link.file.fsName; } catch (linkError) {}
  inspection.links.push({
    uuid: inspectUuid(link),
    name: inspectName(link),
    path: linkPath,
    geometricBounds: inspectBounds(link.geometricBounds)
  });
}

for (inspectIndex = 0; inspectIndex < inspectDocument.rasterItems.length; inspectIndex++) {
  var raster = inspectDocument.rasterItems[inspectIndex];
  inspection.rasterItems.push({
    uuid: inspectUuid(raster),
    name: inspectName(raster),
    embedded: raster.embedded,
    geometricBounds: inspectBounds(raster.geometricBounds)
  });
}

writeResultFile(RESULT_PATH, inspection);
