// @module aspect-ratio
function medianNumber(values) {
  if (!values || values.length === 0) throw new Error("medianNumber: empty values");
  var ordered = values.slice(0);
  ordered.sort(function (leftValue, rightValue) { return leftValue - rightValue; });
  var middle = Math.floor(ordered.length / 2);
  return ordered.length % 2 ? ordered[middle] : (ordered[middle - 1] + ordered[middle]) / 2;
}

function outlinedGlyphRatios(group, minimumHeight) {
  var ratios = [];
  var cutoff = minimumHeight == null ? 5 : minimumHeight;
  var index;
  for (index = 0; index < group.pageItems.length; index++) {
    var boundsValue = group.pageItems[index].geometricBounds;
    var widthValue = boundsValue[2] - boundsValue[0];
    var heightValue = boundsValue[1] - boundsValue[3];
    if (heightValue >= cutoff && widthValue > 0) ratios.push(widthValue / heightValue);
  }
  return ratios;
}

function restoreLiveTextAspect(frame, confirmedAxis, expectedPointSize, anchorValue) {
  if (confirmedAxis !== "horizontal" && confirmedAxis !== "vertical") {
    throw new Error("restoreLiveTextAspect: confirmedAxis must be horizontal or vertical");
  }
  if (!(expectedPointSize > 0)) throw new Error("restoreLiveTextAspect: expectedPointSize is required");
  var original = frame.geometricBounds;
  var originalLeft = original[0];
  var originalCenterX = (original[0] + original[2]) / 2;
  var originalBottom = original[3];
  frame.textRange.characterAttributes.horizontalScale = 100;
  frame.textRange.characterAttributes.verticalScale = 100;
  frame.textRange.characterAttributes.size = expectedPointSize;
  var changed = frame.geometricBounds;
  var deltaX = anchorValue === "center" ? originalCenterX - (changed[0] + changed[2]) / 2 : originalLeft - changed[0];
  var deltaY = anchorValue === "bottom" ? originalBottom - changed[3] : 0;
  frame.translate(deltaX, deltaY);
  return snapshotItem(frame);
}

function restoreOutlinedAspect(item, compressedPercent, confirmedAxis, anchorValue) {
  if (confirmedAxis !== "horizontal" && confirmedAxis !== "vertical") {
    throw new Error("restoreOutlinedAspect: confirmedAxis must be horizontal or vertical");
  }
  if (!(compressedPercent > 0 && compressedPercent < 100)) {
    throw new Error("restoreOutlinedAspect: compressedPercent must be between 0 and 100");
  }
  var original = item.geometricBounds;
  var originalLeft = original[0];
  var originalCenterX = (original[0] + original[2]) / 2;
  var originalBottom = original[3];
  var scaleX = confirmedAxis === "horizontal" ? 10000 / compressedPercent : 100;
  var scaleY = confirmedAxis === "vertical" ? 10000 / compressedPercent : 100;
  item.resize(scaleX, scaleY, true, true, true, true, 100, Transformation.CENTER);
  var changed = item.geometricBounds;
  var deltaX = anchorValue === "center" ? originalCenterX - (changed[0] + changed[2]) / 2 : originalLeft - changed[0];
  var deltaY = anchorValue === "bottom" ? originalBottom - changed[3] : 0;
  item.translate(deltaX, deltaY);
  return snapshotItem(item);
}
