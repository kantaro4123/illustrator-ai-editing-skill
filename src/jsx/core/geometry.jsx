// @module geometry
function setLeft(item, leftValue) {
  var boundsValue = item.geometricBounds;
  item.translate(leftValue - boundsValue[0], 0);
}

function centerX(item, centerValue) {
  var boundsValue = item.geometricBounds;
  item.translate(centerValue - (boundsValue[0] + boundsValue[2]) / 2, 0);
}

function centerY(item, centerValue) {
  var boundsValue = item.geometricBounds;
  item.translate(0, centerValue - (boundsValue[1] + boundsValue[3]) / 2);
}

function setTop(item, topValue) {
  var boundsValue = item.geometricBounds;
  item.translate(0, topValue - boundsValue[1]);
}

// item.left and item.top address visibleBounds. Assigning them a value derived from
// geometricBounds displaces anything carrying a glow, shadow or stroke by exactly the size
// of that effect -- silently, because each item still reports a plausible position. Move by
// a delta instead, which is all translate() does.
function moveItemTo(item, leftValue, topValue) {
  var boundsValue = item.geometricBounds;
  item.translate(leftValue - boundsValue[0], topValue - boundsValue[1]);
}

// Moves a set as one unit by anchoring on a single member, so relative positions survive.
// Use it for artwork plus the separate text frames sitting on top of it: they are not
// parented to each other, so nothing else preserves the arrangement.
function moveSetTo(items, anchorItem, leftValue, topValue) {
  var boundsValue = anchorItem.geometricBounds;
  return translateRigid(items, leftValue - boundsValue[0], topValue - boundsValue[1]);
}

// Captures each item's offset from a reference item, so an arrangement can be verified or
// rebuilt after edits that moved the pieces separately.
function relativeOffsets(items, referenceItem) {
  var origin = referenceItem.geometricBounds;
  var offsets = [];
  var index;
  for (index = 0; index < items.length; index++) {
    var boundsValue = items[index].geometricBounds;
    offsets.push([boundsValue[0] - origin[0], boundsValue[1] - origin[1]]);
  }
  return offsets;
}

function restoreRelative(items, referenceItem, offsets) {
  var origin = referenceItem.geometricBounds;
  var moves = [];
  var index;
  for (index = 0; index < items.length; index++) {
    var boundsValue = items[index].geometricBounds;
    var deltaX = (origin[0] + offsets[index][0]) - boundsValue[0];
    var deltaY = (origin[1] + offsets[index][1]) - boundsValue[1];
    items[index].translate(deltaX, deltaY);
    moves.push([deltaX, deltaY]);
  }
  return moves;
}

function inkBounds(textFrame) {
  var duplicate = textFrame.duplicate();
  var outline = duplicate.createOutline();
  var boundsValue = copyBounds(outline.geometricBounds);
  outline.remove();
  return boundsValue;
}

function alignInkBottom(textFrame, referenceFrame) {
  var delta = inkBounds(referenceFrame)[3] - inkBounds(textFrame)[3];
  textFrame.translate(0, delta);
  return delta;
}

function translateRigid(items, deltaX, deltaY) {
  var index;
  for (index = 0; index < items.length; index++) items[index].translate(deltaX, deltaY);
  return { deltaX: deltaX, deltaY: deltaY, count: items.length };
}

function equalizeVerticalGaps(items, gapValue) {
  if (!items || items.length < 2) return [];
  var ordered = items.slice(0);
  ordered.sort(function (leftItem, rightItem) {
    return rightItem.geometricBounds[1] - leftItem.geometricBounds[1];
  });
  var moves = [];
  var previousBottom = ordered[0].geometricBounds[3];
  var index;
  for (index = 1; index < ordered.length; index++) {
    var boundsValue = ordered[index].geometricBounds;
    var desiredTop = previousBottom - gapValue;
    var deltaY = desiredTop - boundsValue[1];
    ordered[index].translate(0, deltaY);
    previousBottom = ordered[index].geometricBounds[3];
    moves.push(deltaY);
  }
  return moves;
}
