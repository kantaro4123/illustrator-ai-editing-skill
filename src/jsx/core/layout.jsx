// @module layout
function boundsIntersect(firstBounds, secondBounds) {
  return firstBounds[0] < secondBounds[2]
    && firstBounds[2] > secondBounds[0]
    && firstBounds[3] < secondBounds[1]
    && firstBounds[1] > secondBounds[3];
}

function findCollisions(items) {
  var collisions = [];
  var firstIndex;
  var secondIndex;
  for (firstIndex = 0; firstIndex < items.length; firstIndex++) {
    for (secondIndex = firstIndex + 1; secondIndex < items.length; secondIndex++) {
      if (boundsIntersect(items[firstIndex].visibleBounds, items[secondIndex].visibleBounds)) {
        collisions.push([firstIndex, secondIndex]);
      }
    }
  }
  return collisions;
}

function moveSectionRigid(sectionItems, deltaX, deltaY) {
  return translateRigid(sectionItems, deltaX, deltaY);
}

function artboardBottomMargin(documentValue, item) {
  var artboardBounds = documentValue.artboards[documentValue.artboards.getActiveArtboardIndex()].artboardRect;
  return item.visibleBounds[3] - artboardBounds[3];
}
