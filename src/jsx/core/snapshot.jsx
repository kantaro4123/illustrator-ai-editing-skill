// @module snapshot
function copyBounds(boundsValue) {
  return [boundsValue[0], boundsValue[1], boundsValue[2], boundsValue[3]];
}

function snapshotItem(item) {
  var output = {
    typename: item.typename,
    geometricBounds: copyBounds(item.geometricBounds)
  };
  try { output.visibleBounds = copyBounds(item.visibleBounds); } catch (visibleBoundsError) {}
  try { output.uuid = item.uuid; } catch (uuidError) {}
  try { output.name = item.name; } catch (nameError) {}
  try { output.note = item.note; } catch (noteError) {}
  try { output.opacity = item.opacity; } catch (opacityError) {}
  try { output.contents = item.contents; } catch (contentsError) {}
  if (item.typename === "TextFrame") {
    try {
      var attributes = item.textRange.characterAttributes;
      output.fontSize = attributes.size;
      output.tracking = attributes.tracking;
      output.leading = attributes.leading;
      output.horizontalScale = attributes.horizontalScale;
      output.verticalScale = attributes.verticalScale;
      try { output.font = attributes.textFont.name; } catch (fontError) {}
    } catch (textStyleError) {}
  }
  return output;
}

function snapshotValuesEqual(a, b) {
  if (a === b) return true;
  if (a instanceof Array && b instanceof Array) {
    if (a.length !== b.length) return false;
    var index;
    for (index = 0; index < a.length; index++) {
      if (typeof a[index] === "number" && typeof b[index] === "number") {
        if (Math.abs(a[index] - b[index]) > 0.001) return false;
      } else if (a[index] !== b[index]) return false;
    }
    return true;
  }
  if (typeof a === "number" && typeof b === "number") return Math.abs(a - b) <= 0.001;
  return false;
}

function diffSnapshots(beforeValue, afterValue) {
  var keys = {};
  var key;
  for (key in beforeValue) if (beforeValue.hasOwnProperty(key)) keys[key] = true;
  for (key in afterValue) if (afterValue.hasOwnProperty(key)) keys[key] = true;
  var changed = [];
  var unchanged = [];
  for (key in keys) {
    if (!keys.hasOwnProperty(key)) continue;
    if (snapshotValuesEqual(beforeValue[key], afterValue[key])) unchanged.push(key);
    else changed.push(key);
  }
  return { changed: changed, unchanged: unchanged };
}
