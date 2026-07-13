// @module snapshot
function copyBounds(boundsValue) {
  return [boundsValue[0], boundsValue[1], boundsValue[2], boundsValue[3]];
}

function snapshotItem(item) {
  var output = {
    typename: item.typename,
    geometricBounds: copyBounds(item.geometricBounds)
  };
  try { output.uuid = item.uuid; } catch (uuidError) {}
  try { output.name = item.name; } catch (nameError) {}
  try { output.note = item.note; } catch (noteError) {}
  try { output.contents = item.contents; } catch (contentsError) {}
  return output;
}
