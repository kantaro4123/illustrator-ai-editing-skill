// @module result
function writeResultFile(pathValue, value) {
  var file = new File(pathValue);
  file.encoding = "UTF-8";
  file.lineFeed = "Unix";
  if (!file.open("w")) throw new Error("Cannot write result: " + pathValue);
  file.write(stringifyJson(value));
  file.close();
}

function writeErrorResult(pathValue, errorValue) {
  var lineValue = null;
  try { lineValue = errorValue.line; } catch (ignoredLine) {}
  writeResultFile(pathValue, {
    error: true,
    message: String(errorValue && errorValue.message ? errorValue.message : errorValue),
    line: lineValue
  });
}
