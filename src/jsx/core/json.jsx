// @module json
function readUtf8File(pathValue) {
  var file = new File(pathValue);
  if (!file.exists) throw new Error("Missing file: " + pathValue);
  file.encoding = "UTF-8";
  if (!file.open("r")) throw new Error("Cannot open file: " + pathValue);
  var text = file.read();
  file.close();
  if (text.length > 0 && text.charCodeAt(0) === 0xFEFF) text = text.substring(1);
  return text;
}

function parseJsonFile(pathValue) {
  var text = readUtf8File(pathValue);
  if (typeof JSON !== "undefined" && JSON.parse) return JSON.parse(text);
  return eval("(" + text + ")");
}

function jsonEscape(value) {
  return String(value)
    .replace(/\\/g, "\\\\")
    .replace(/\"/g, "\\\"")
    .replace(/\r/g, "\\r")
    .replace(/\n/g, "\\n")
    .replace(/\t/g, "\\t");
}

function stringifyJson(value) {
  if (typeof JSON !== "undefined" && JSON.stringify) return JSON.stringify(value);
  if (value === null) return "null";
  var kind = typeof value;
  if (kind === "string") return "\"" + jsonEscape(value) + "\"";
  if (kind === "number" || kind === "boolean") return String(value);
  if (kind === "undefined" || kind === "function") return undefined;
  var output = [];
  var index;
  if (value instanceof Array) {
    for (index = 0; index < value.length; index++) {
      var entry = stringifyJson(value[index]);
      output.push(entry === undefined ? "null" : entry);
    }
    return "[" + output.join(",") + "]";
  }
  for (var key in value) {
    if (!value.hasOwnProperty(key)) continue;
    var encoded = stringifyJson(value[key]);
    if (encoded !== undefined) output.push("\"" + jsonEscape(key) + "\":" + encoded);
  }
  return "{" + output.join(",") + "}";
}
