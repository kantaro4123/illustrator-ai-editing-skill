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
  var replacement = (replacementValue === undefined || replacementValue === null)
    ? "" : String(replacementValue);
  var index;
  for (index = matches.length - 1; index >= 0; index--) {
    var startValue = matches[index];
    // Illustrator has no characters.itemByRange -- that is an InDesign API, and
    // calling it throws. Write the whole replacement into the first character so
    // it inherits that character's style, then delete the leftover originals from
    // the back so earlier indices stay valid.
    var kept = 0;
    if (replacement.length > 0) {
      frame.textRange.characters[startValue].contents = replacement;
      kept = replacement.length;
    }
    var removeCount = searchValue.length - (replacement.length > 0 ? 1 : 0);
    var removeIndex;
    for (removeIndex = removeCount - 1; removeIndex >= 0; removeIndex--) {
      frame.textRange.characters[startValue + kept + removeIndex].remove();
    }
  }
  return matches.length;
}

// A run that spans two style runs collapses onto the first run's style. When the
// halves must keep different styles -- a small label beside large digits -- replace
// each run separately, or reapply both runs by index after the edit.

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
