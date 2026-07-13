// @module text
function replaceTextPreservingStyles(frame, searchValue, replacementValue) {
  if (!searchValue) throw new Error("replaceTextPreservingStyles: empty search value");
  var text = frame.contents;
  var matches = [];
  var offset = 0;
  while (offset <= text.length - searchValue.length) {
    var found = text.indexOf(searchValue, offset);
    if (found < 0) break;
    matches.push(found);
    offset = found + searchValue.length;
  }
  var index;
  for (index = matches.length - 1; index >= 0; index--) {
    var startValue = matches[index];
    var range = frame.characters.itemByRange(startValue, startValue + searchValue.length - 1);
    range.contents = replacementValue;
  }
  return matches.length;
}

function textOverflows(frame) {
  if (frame.kind !== TextType.AREATEXT) return false;
  var visible = 0;
  var index;
  for (index = 0; index < frame.lines.length; index++) visible += frame.lines[index].characters.length;
  var breaks = 0;
  var text = frame.contents;
  for (index = 0; index < text.length; index++) {
    var code = text.charCodeAt(index);
    if (code === 10 || code === 13 || code === 3) breaks++;
  }
  return visible < frame.textRange.characters.length - breaks;
}

function setTextFont(frame, postScriptName) {
  frame.textRange.characterAttributes.textFont = app.textFonts.getByName(postScriptName);
}

function restoreTextScalePreserveSize(frame, anchorValue) {
  var original = frame.geometricBounds;
  var originalLeft = original[0];
  var originalCenter = (original[0] + original[2]) / 2;
  var sizeValue = frame.textRange.characterAttributes.size;
  frame.textRange.characterAttributes.horizontalScale = 100;
  frame.textRange.characterAttributes.verticalScale = 100;
  frame.textRange.characterAttributes.size = sizeValue;
  if (anchorValue === "center") centerX(frame, originalCenter); else setLeft(frame, originalLeft);
  return sizeValue;
}
