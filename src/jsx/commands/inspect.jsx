// @command inspect
var inspectParams = parseJsonFile(PARAMS_PATH);
var inspectDocument = requireTargetDocument();
var remainingStyleCharacters = inspectParams.maxStyleCharacters || 1000;

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

function inspectStyleRuns(frame, wantsFullStyle, hasFullStyleBudget) {
  if (frame.characters.length === 0) {
    return { mode: "empty", runs: [], truncated: false, sampledCharacterIndex: null };
  }
  if (!wantsFullStyle || !hasFullStyleBudget) {
    return {
      mode: wantsFullStyle ? "budget-truncated" : "sampled",
      runs: [styleRunAt(frame.characters[0], 0, 1)],
      truncated: wantsFullStyle && !hasFullStyleBudget,
      sampledCharacterIndex: 0
    };
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
  return { mode: "complete", runs: output, truncated: false, sampledCharacterIndex: null };
}

function inspectTextContent(frame) {
  var text = String(frame.contents);
  var mode = inspectParams.content || "truncated";
  var maxCharacters = Number(inspectParams.maxContentCharacters || 240);
  if (mode === "none") {
    return { contents: null, contentLength: text.length, contentsTruncated: text.length > 0 };
  }
  if (mode === "full") {
    return { contents: text, contentLength: text.length, contentsTruncated: false };
  }
  if (!(maxCharacters > 0)) maxCharacters = 240;
  return {
    contents: text.substring(0, maxCharacters),
    contentLength: text.length,
    contentsTruncated: text.length > maxCharacters
  };
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
  var wantsFullStyle = inspectParams.detail === "full";
  var hasFullStyleBudget = frame.characters.length <= remainingStyleCharacters;
  if (wantsFullStyle && hasFullStyleBudget) remainingStyleCharacters -= frame.characters.length;
  var textContent = inspectTextContent(frame);
  var styleInspection = inspectStyleRuns(frame, wantsFullStyle, hasFullStyleBudget);
  inspection.textFrames.push({
    uuid: inspectUuid(frame),
    name: inspectName(frame),
    kind: String(frame.kind),
    contents: textContent.contents,
    contentLength: textContent.contentLength,
    contentsTruncated: textContent.contentsTruncated,
    geometricBounds: inspectBounds(frame.geometricBounds),
    visibleBounds: inspectBounds(frame.visibleBounds),
    locked: frame.locked,
    hidden: frame.hidden,
    overflow: inspectOverflow(frame),
    styleRunMode: styleInspection.mode,
    sampledCharacterIndex: styleInspection.sampledCharacterIndex,
    styleRuns: styleInspection.runs,
    styleRunsTruncated: styleInspection.truncated
  });
}

// Documents with outlined text easily hold 10k+ nested paths (one per glyph);
// enumerating doc.pageItems then takes minutes and yields multi-megabyte JSON.
// Compact detail therefore reports TOP-LEVEL items per layer only; full detail
// walks deep but is still capped. pageItemsTotal always carries the true count.
var pageItemBudget = inspectParams.maxPageItems || (inspectParams.detail === "full" ? 2000 : 300);
inspection.pageItemsTotal = inspectDocument.pageItems.length;
inspection.pageItemsTruncated = false;

function inspectPushPageItem(pageItem, depth) {
  if (inspection.pageItems.length >= pageItemBudget) {
    inspection.pageItemsTruncated = true;
    return false;
  }
  inspection.pageItems.push({
    uuid: inspectUuid(pageItem),
    typename: pageItem.typename,
    name: inspectName(pageItem),
    note: inspectNote(pageItem),
    depth: depth,
    childCount: pageItem.typename === "GroupItem" ? pageItem.pageItems.length : 0,
    geometricBounds: inspectBounds(pageItem.geometricBounds),
    visibleBounds: inspectBounds(pageItem.visibleBounds),
    locked: pageItem.locked,
    hidden: pageItem.hidden
  });
  return true;
}

if (inspectParams.detail === "full") {
  for (inspectIndex = 0; inspectIndex < inspectDocument.pageItems.length; inspectIndex++) {
    if (!inspectPushPageItem(inspectDocument.pageItems[inspectIndex], -1)) break;
  }
} else {
  var inspectLayerIndex;
  for (inspectLayerIndex = 0; inspectLayerIndex < inspectDocument.layers.length; inspectLayerIndex++) {
    var inspectLayer = inspectDocument.layers[inspectLayerIndex];
    var inspectTopIndex;
    for (inspectTopIndex = 0; inspectTopIndex < inspectLayer.pageItems.length; inspectTopIndex++) {
      if (!inspectPushPageItem(inspectLayer.pageItems[inspectTopIndex], 0)) break;
    }
  }
}

for (inspectIndex = 0; inspectIndex < inspectDocument.placedItems.length; inspectIndex++) {
  var link = inspectDocument.placedItems[inspectIndex];
  var linkPath = "";
  var linkName = "";
  try {
    linkPath = link.file.fsName;
    try { linkName = decodeURI(link.file.name); } catch (decodeLinkError) { linkName = String(link.file.name); }
  } catch (linkError) {}
  inspection.links.push({
    uuid: inspectUuid(link),
    name: inspectName(link),
    filename: linkName,
    path: inspectParams.includeLinkPaths ? linkPath : null,
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