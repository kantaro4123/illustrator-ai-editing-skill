// @module japanese-text
function applyJapaneseJustification(frame) {
  var paragraph = frame.textRange.paragraphAttributes;
  paragraph.justification = Justification.FULLJUSTIFYLASTLINELEFT;
  paragraph.kinsoku = "Hard";
  paragraph.kinsokuOrder = KinsokuOrderEnum.PUSHIN;
  paragraph.kurikaeshiMojiShori = true;
}

function normalizeTilde(frame) {
  var characters = frame.textRange.characters;
  var count = 0;
  var index;
  for (index = 0; index < characters.length; index++) {
    var code = characters[index].contents.charCodeAt(0);
    if (code === 0x301C || code === 0x7E) {
      characters[index].contents = String.fromCharCode(0xFF5E);
      count++;
    }
  }
  return count;
}

function applyNoBreakRuns(frame) {
  function isKatakana(code) { return (code >= 0x30A1 && code <= 0x30FA) || code === 0x30FC; }
  function isDigit(code) { return (code >= 0x30 && code <= 0x39) || (code >= 0xFF10 && code <= 0xFF19); }
  var text = frame.contents;
  var characters = frame.textRange.characters;
  var runs = 0;
  var index = 0;
  while (index < text.length) {
    var code = text.charCodeAt(index);
    var kind = isKatakana(code) ? "katakana" : (isDigit(code) ? "digit" : "");
    if (!kind) { index++; continue; }
    var startValue = index;
    while (index < text.length) {
      var nextCode = text.charCodeAt(index);
      if ((kind === "katakana" && isKatakana(nextCode)) || (kind === "digit" && isDigit(nextCode))) index++;
      else break;
    }
    if (index - startValue >= 2) {
      var characterIndex;
      for (characterIndex = startValue; characterIndex < index; characterIndex++) {
        characters[characterIndex].characterAttributes.noBreak = true;
      }
      runs++;
    }
  }
  return runs;
}

function centerHyphens(frame) {
  var characters = frame.textRange.characters;
  var count = 0;
  var index;
  for (index = 0; index < characters.length; index++) {
    if (characters[index].contents.charCodeAt(0) === 0x2D) {
      characters[index].characterAttributes.baselineShift = characters[index].characterAttributes.size * 0.12;
      count++;
    }
  }
  return count;
}

function fitReceptionInParens(labelFrame, timeFrame, parenFrame, trackingValue) {
  var text = timeFrame.contents;
  var terminalIndex = text.lastIndexOf("30");
  if (terminalIndex < 0) throw new Error("fitReceptionInParens: time has no terminal 30");
  timeFrame.textRange.characters[terminalIndex].characterAttributes.tracking = trackingValue == null ? 100 : trackingValue;
  var parenInk = inkBounds(parenFrame);
  var timeInk = inkBounds(timeFrame);
  timeFrame.translate(((parenInk[0] + parenInk[2]) - (timeInk[0] + timeInk[2])) / 2, 0);
  var labelInk = inkBounds(labelFrame);
  labelFrame.translate(0, (parenInk[1] - 0.5) - labelInk[1]);
  return { label: inkBounds(labelFrame), time: inkBounds(timeFrame), paren: parenInk };
}
