// @command inspect-target
var targetParams = parseJsonFile(PARAMS_PATH);
var targetDocument = requireTargetDocument();

function targetBounds(value) {
  return [value[0], value[1], value[2], value[3]];
}

function targetUuid(item) {
  try { return item.uuid || ""; } catch (error) { return ""; }
}

function targetName(item) {
  try { return item.name || ""; } catch (error) { return ""; }
}

function targetNote(item) {
  try { return item.note || ""; } catch (error) { return ""; }
}

function targetContent(frame) {
  var text = String(frame.contents);
  var mode = targetParams.content || "truncated";
  var limit = Number(targetParams.maxContentCharacters || 240);
  if (mode === "none") return { contents: null, contentLength: text.length, contentsTruncated: text.length > 0 };
  if (mode === "full") return { contents: text, contentLength: text.length, contentsTruncated: false };
  if (!(limit > 0)) limit = 240;
  return { contents: text.substring(0, limit), contentLength: text.length, contentsTruncated: text.length > limit };
}

function targetStyleAt(range, startValue, lengthValue) {
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

function targetStyleSignature(run) {
  return [run.font, run.size, run.horizontalScale, run.verticalScale, run.tracking, run.leading].join("|");
}

function targetStyles(frame) {
  if (frame.characters.length === 0) return { mode: "empty", runs: [], truncated: false };
  var wantsFull = targetParams.detail === "full";
  var budget = Number(targetParams.maxStyleCharacters || 1000);
  if (!wantsFull || frame.characters.length > budget) {
    return {
      mode: wantsFull ? "budget-truncated" : "sampled",
      runs: [targetStyleAt(frame.characters[0], 0, 1)],
      truncated: wantsFull && frame.characters.length > budget,
      sampledCharacterIndex: 0
    };
  }
  var output = [];
  var current = null;
  var currentSignature = "";
  var index;
  for (index = 0; index < frame.characters.length; index++) {
    var next = targetStyleAt(frame.characters[index], index, 1);
    var signature = targetStyleSignature(next);
    if (current && signature === currentSignature) current.length++;
    else {
      if (current) output.push(current);
      current = next;
      currentSignature = signature;
    }
  }
  if (current) output.push(current);
  return { mode: "complete", runs: output, truncated: false };
}

function targetTextFrame(frame) {
  var content = targetContent(frame);
  var styles = targetStyles(frame);
  return {
    uuid: targetUuid(frame),
    typename: frame.typename,
    name: targetName(frame),
    note: targetNote(frame),
    contents: content.contents,
    contentLength: content.contentLength,
    contentsTruncated: content.contentsTruncated,
    geometricBounds: targetBounds(frame.geometricBounds),
    visibleBounds: targetBounds(frame.visibleBounds),
    locked: frame.locked,
    hidden: frame.hidden,
    styleRunMode: styles.mode,
    sampledCharacterIndex: styles.sampledCharacterIndex === undefined ? null : styles.sampledCharacterIndex,
    styleRuns: styles.runs,
    styleRunsTruncated: styles.truncated
  };
}

function targetPageItem(item) {
  if (item.typename === "TextFrame") return targetTextFrame(item);
  return {
    uuid: targetUuid(item),
    typename: item.typename,
    name: targetName(item),
    note: targetNote(item),
    geometricBounds: targetBounds(item.geometricBounds),
    visibleBounds: targetBounds(item.visibleBounds),
    locked: item.locked,
    hidden: item.hidden
  };
}

function uniqueLayerByName(nameValue) {
  var found = null;
  var count = 0;
  var index;
  for (index = 0; index < targetDocument.layers.length; index++) {
    if (targetDocument.layers[index].name === nameValue) {
      found = targetDocument.layers[index];
      count++;
    }
  }
  if (count !== 1) throw new Error("INSPECT_TARGET_AMBIGUOUS: expected exactly one layer, got " + count);
  return found;
}

var result = {
  document: { path: documentFsPath(targetDocument), name: decodedDocumentName(targetDocument) },
  targeted: true,
  selector: targetParams.selector,
  items: [],
  totalMatches: 0,
  truncated: false
};

if (targetParams.selector === "uuid") {
  var uuidItem = findPageItemByUuid(targetDocument, targetParams.value);
  if (!uuidItem) throw new Error("INSPECT_TARGET_NOT_FOUND: uuid");
  result.items.push(targetPageItem(uuidItem));
  result.totalMatches = 1;
} else if (targetParams.selector === "name") {
  var namedItems = findPageItemsBySignature(targetDocument, { name: targetParams.value });
  if (namedItems.length !== 1) throw new Error("INSPECT_TARGET_AMBIGUOUS: expected exactly one named item, got " + namedItems.length);
  result.items.push(targetPageItem(namedItems[0]));
  result.totalMatches = 1;
} else if (targetParams.selector === "layer") {
  var layer = uniqueLayerByName(targetParams.value);
  var maxItems = Number(targetParams.maxPageItems || 100);
  var layerIndex;
  result.totalMatches = layer.pageItems.length;
  for (layerIndex = 0; layerIndex < layer.pageItems.length && result.items.length < maxItems; layerIndex++) {
    result.items.push(targetPageItem(layer.pageItems[layerIndex]));
  }
  result.truncated = layer.pageItems.length > result.items.length;
} else {
  throw new Error("INSPECT_TARGET_SELECTOR: selector must be uuid, name, or layer");
}

writeResultFile(RESULT_PATH, result);