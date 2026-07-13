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
