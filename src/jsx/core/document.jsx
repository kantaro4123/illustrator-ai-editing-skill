// @module document
function normalizedFsPath(pathValue) {
  return String(new File(pathValue).fsName);
}

function decodedDocumentName(documentValue) {
  try { return decodeURI(documentValue.name); } catch (decodeError) { return String(documentValue.name); }
}

function documentFsPath(documentValue) {
  try { return String(documentValue.fullName.fsName); } catch (pathError) { return ""; }
}

function assertTargetDocument(documentValue) {
  var expectedPath = normalizedFsPath(TARGET_PATH);
  var actualPath = documentFsPath(documentValue);
  var actualName = decodedDocumentName(documentValue);
  if (actualPath !== expectedPath) {
    throw new Error("DOCUMENT_MISMATCH path: expected '" + expectedPath + "', got '" + actualPath + "'");
  }
  if (actualName !== TARGET_NAME) {
    throw new Error("DOCUMENT_MISMATCH name: expected '" + TARGET_NAME + "', got '" + actualName + "'");
  }
  return documentValue;
}

function requireTargetDocument() {
  var expectedPath = normalizedFsPath(TARGET_PATH);
  var index;
  for (index = 0; index < app.documents.length; index++) {
    var candidate = app.documents[index];
    if (documentFsPath(candidate) === expectedPath) {
      app.activeDocument = candidate;
      return assertTargetDocument(candidate);
    }
  }
  var targetFile = new File(TARGET_PATH);
  if (!targetFile.exists) throw new Error("Missing target document: " + TARGET_PATH);
  var opened = app.open(targetFile);
  app.activeDocument = opened;
  return assertTargetDocument(opened);
}
