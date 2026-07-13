#target illustrator
(function () {
  var PRIMARY_PATH = __PRIMARY_PATH__;
  var DECOY_PATH = __DECOY_PATH__;
  var RESULT_PATH = __RESULT_PATH__;
  var PRIMARY_SVG_PATH = __PRIMARY_SVG_PATH__;
  var previousInteractionLevel = app.userInteractionLevel;
  app.userInteractionLevel = UserInteractionLevel.DONTDISPLAYALERTS;

  function trace(stageValue) {
    var traceFile = new File(RESULT_PATH + ".stage");
    traceFile.encoding = "UTF-8";
    traceFile.open("w");
    traceFile.write(stageValue);
    traceFile.close();
  }

  function jsonString(value) {
    return '"' + String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\r/g, "\\r").replace(/\n/g, "\\n") + '"';
  }

  function saveDocument(documentValue, pathValue) {
    var options = new IllustratorSaveOptions();
    options.pdfCompatible = true;
    options.compressed = true;
    documentValue.saveAs(new File(pathValue), options);
  }

  function createPrimary() {
    trace("primary:open-svg");
    var documentValue = app.open(new File(PRIMARY_SVG_PATH));
    trace("primary:artboards");
    documentValue.artboards[0].name = "Primary";
    documentValue.artboards.add([620, 842, 1215, 0]).name = "Secondary";
    var editable = documentValue.layers[0];
    editable.name = "Editable";

    trace("primary:name-text");
    var aspectFrames = [];
    var frameIndex;
    for (frameIndex = 0; frameIndex < documentValue.textFrames.length; frameIndex++) {
      var importedFrame = documentValue.textFrames[frameIndex];
      var importedContents = String(importedFrame.contents);
      if (importedContents.indexOf("受付時間") === 0) importedFrame.name = "JP_POINT";
      else if (importedContents.indexOf("日本語") === 0) importedFrame.name = "JP_AREA";
      else if (importedContents === "田田田" && importedFrame.left > 250) importedFrame.name = "OUTLINE_SOURCE";
      else if (importedContents === "田田田") aspectFrames.push(importedFrame);
    }
    aspectFrames.sort(function (firstFrame, secondFrame) { return secondFrame.top - firstFrame.top; });
    if (aspectFrames.length !== 3) throw new Error("Expected three imported aspect frames");
    aspectFrames[0].name = "ASPECT_NORMAL";
    aspectFrames[1].name = "ASPECT_H82";
    aspectFrames[2].name = "ASPECT_V833";
    var japanese = documentValue.textFrames.getByName("JP_POINT");
    japanese.textRange.characterAttributes.tracking = 0;
    var horizontal = documentValue.textFrames.getByName("ASPECT_H82");
    horizontal.textRange.characterAttributes.horizontalScale = 82;
    var vertical = documentValue.textFrames.getByName("ASPECT_V833");
    vertical.textRange.characterAttributes.verticalScale = 83.3;

    trace("primary:outline");
    var outlineSource = documentValue.textFrames.getByName("OUTLINE_SOURCE");
    var outlined = outlineSource.createOutline();
    outlined.name = "OUTLINE_H833";
    outlined.resize(83.3, 100, true, true, true, true, 100, Transformation.CENTER);

    trace("primary:locked-layer");
    var locked = documentValue.layers.add();
    locked.name = "Locked Reference";
    var lockedRule = locked.pathItems.rectangle(560, 340, 120, 20);
    lockedRule.name = "LOCKED_RULE";
    locked.locked = true;
    trace("primary:save");
    saveDocument(documentValue, PRIMARY_PATH);
    trace("primary:saved");
    return documentValue;
  }

  function createDecoy() {
    trace("decoy:add-document");
    var documentValue = app.documents.add(DocumentColorSpace.CMYK, 595, 842);
    documentValue.layers[0].name = "Decoy";
    var decoyRule = documentValue.layers[0].pathItems.rectangle(760, 60, 200, 20);
    decoyRule.name = "DECOY_RULE";
    trace("decoy:save");
    saveDocument(documentValue, DECOY_PATH);
    trace("decoy:saved");
    return documentValue;
  }

  try {
    createPrimary();
    var decoy = createDecoy();
    app.activeDocument = decoy;
    var result = new File(RESULT_PATH);
    result.encoding = "UTF-8";
    result.open("w");
    result.write('{"ok":true}');
    result.close();
    app.userInteractionLevel = previousInteractionLevel;
  } catch (errorValue) {
    var errorFile = new File(RESULT_PATH);
    errorFile.encoding = "UTF-8";
    errorFile.open("w");
    errorFile.write('{"ok":false,"message":' + jsonString(errorValue.toString()) + '}');
    errorFile.close();
    try { app.userInteractionLevel = previousInteractionLevel; } catch (ignoredRestore) {}
  }
}());
