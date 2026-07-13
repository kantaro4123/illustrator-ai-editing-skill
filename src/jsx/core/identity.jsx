// @module identity
function findPageItemByUuid(documentValue, uuidValue) {
  if (!uuidValue) return null;
  try {
    if (documentValue.getPageItemFromUuid) {
      var direct = documentValue.getPageItemFromUuid(uuidValue);
      if (direct) return direct;
    }
  } catch (uuidError) {}
  var index;
  for (index = 0; index < documentValue.pageItems.length; index++) {
    var item = documentValue.pageItems[index];
    try { if (item.uuid === uuidValue) return item; } catch (nativeUuidError) {}
    try { if (item.note === uuidValue) return item; } catch (noteError) {}
  }
  return null;
}

function findPageItemsBySignature(documentValue, signature) {
  var matches = [];
  var index;
  for (index = 0; index < documentValue.pageItems.length; index++) {
    var item = documentValue.pageItems[index];
    if (signature.typename && item.typename !== signature.typename) continue;
    if (signature.name) {
      try { if (item.name !== signature.name) continue; } catch (nameError) { continue; }
    }
    if (signature.note) {
      try { if (item.note !== signature.note) continue; } catch (noteError) { continue; }
    }
    matches.push(item);
  }
  return matches;
}
