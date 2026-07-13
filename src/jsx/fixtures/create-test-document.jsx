#target illustrator
(function () {
  var PRIMARY_PATH = __PRIMARY_PATH__;
  var DECOY_PATH = __DECOY_PATH__;
  var RESULT_PATH = __RESULT_PATH__;

  function trace(stageValue) {
    var traceFile = new File(RESULT_PATH + ".stage");
    traceFile.encoding = "UTF-8";
    traceFile.open("w");
    traceFile.write(stageValue);
    traceFile.close();
  }

  function addPointText(documentValue, layer, nameValue, contentsValue, leftValue, topValue, sizeValue) {
    var frame = layer.textFrames.add();
    frame.name = nameValue;
    frame.contents = contentsValue;
    frame.left = leftValue;
    frame.top = topValue;
    frame.textRange.characterAttributes.size = sizeValue;
    return frame;
  }

  function saveDocument(documentValue, pathValue) {
    var options = new IllustratorSaveOptions();
    options.pdfCompatible = true;
    options.compressed = true;
    documentValue.saveAs(new File(pathValue), options);
  }

  function createPrimary() {
    trace("primary:add-document");
    var documentValue = app.documents.add(DocumentColorSpace.RGB, 595, 842);
    trace("primary:artboards");
    documentValue.artboards[0].name = "Primary";
    documentValue.artboards.add([620, 842, 1215, 0]).name = "Secondary";
    var editable = documentValue.layers[0];
    editable.name = "Editable";

    trace("primary:point-text");
    var japanese = addPointText(documentValue, editable, "JP_POINT", "受付時間（月〜土曜 14：00〜21：30）", 60, 760, 18);
    japanese.textRange.characterAttributes.tracking = 0;
    addPointText(documentValue, editable, "ASPECT_NORMAL", "田田田", 60, 700, 20);
    var horizontal = addPointText(documentValue, editable, "ASPECT_H82", "田田田", 60, 650, 20);
    horizontal.textRange.characterAttributes.horizontalScale = 82;
    var vertical = addPointText(documentValue, editable, "ASPECT_V833", "田田田", 60, 600, 20);
    vertical.textRange.characterAttributes.verticalScale = 83.3;

    trace("primary:area-text");
    var areaPath = editable.pathItems.rectangle(540, 60, 210, 80);
    var areaText = documentValue.textFrames.areaText(areaPath);
    areaText.name = "JP_AREA";
    areaText.contents = "学習塾の合格体験記です。日本語の禁則処理と改行を検証します。";
    areaText.textRange.characterAttributes.size = 14;

    trace("primary:outline");
    var outlineSource = addPointText(documentValue, editable, "OUTLINE_SOURCE", "田田田", 340, 700, 20);
    var outlined = outlineSource.createOutline();
    outlined.name = "OUTLINE_H833";
    outlined.resize(83.3, 100, true, true, true, true, 100, Transformation.CENTER);

    trace("primary:locked-layer");
    var locked = documentValue.layers.add();
    locked.name = "Locked Reference";
    addPointText(documentValue, locked, "LOCKED_TEXT", "変更禁止", 340, 600, 16);
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
    addPointText(documentValue, documentValue.layers[0], "DECOY_TEXT", "類似名の別文書", 60, 760, 18);
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
  } catch (errorValue) {
    var errorFile = new File(RESULT_PATH);
    errorFile.encoding = "UTF-8";
    errorFile.open("w");
    errorFile.write('{"ok":false,"message":' + errorValue.toString().toSource() + '}');
    errorFile.close();
  }
}());
