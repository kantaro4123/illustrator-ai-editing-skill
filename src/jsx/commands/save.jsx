var saveParams = parseJsonFile(PARAMS_PATH);
var saveDocument = assertTargetDocument(requireTargetDocument());
var saveDestination = normalizedFsPath(saveParams.destinationPath);
if (saveDestination !== normalizedFsPath(TARGET_PATH)) {
  throw new Error("DOCUMENT_MISMATCH save destination: " + saveDestination);
}
var saveOptions = new IllustratorSaveOptions();
saveOptions.pdfCompatible = true;
saveOptions.compressed = true;
saveDocument.saveAs(new File(saveDestination), saveOptions);
writeResultFile(RESULT_PATH, {
  ok: true,
  saved: true,
  path: documentFsPath(saveDocument),
  name: decodedDocumentName(saveDocument)
});
