/*global define*/
define(['require'], function(require) {
    "use strict";
    /*global Cesium*/

    var width = 600.0 * 100.0;
    var height = 600.0 * 100.0;

    var ellipsoid = Cesium.Ellipsoid.WGS84;
    var radius = ellipsoid.getMaximumRadius();
    var rotateFactor = 1.0 / radius;
    var rotateRateRangeAdjustment = radius;
    var maximumRotateRate = 1.77;
    var minimumRotateRate = 1.0 / 5000.0;
    var maximumMovementRatio = 0.1;

    function rotate(scene, x, y) {
        var camera = scene.getCamera();
        var controller = camera.controller;

        var rho = camera.position.magnitude();
        var rotateRate = rotateFactor * (rho - rotateRateRangeAdjustment);

        if (rotateRate > maximumRotateRate) {
            rotateRate = maximumRotateRate;
        }

        if (rotateRate < minimumRotateRate) {
            rotateRate = minimumRotateRate;
        }

        var phiWindowRatio = x / width;
        var thetaWindowRatio = y / height;
        phiWindowRatio = Math.min(phiWindowRatio, maximumMovementRatio);
        thetaWindowRatio = Math.min(thetaWindowRatio, maximumMovementRatio);

        var deltaPhi = rotateRate * phiWindowRatio * Math.PI * 2.0;
        var deltaTheta = rotateRate * thetaWindowRatio * Math.PI;

        controller.rotateRight(deltaPhi);
        controller.rotateUp(deltaTheta);
    }

    var depth = 600.0 * 100.0;

    var zoomFactor = 5.0;
    var minimumZoomRate = 20.0;
    var maximumZoomRate = Cesium.FAR;
    var minimumZoomDistance = 20.0;
    var maximumZoomDistance = Number.POSITIVE_INFINITY;

    function zoom(scene, z) {
        var camera = scene.getCamera();
        var controller = camera.controller;

        var height = ellipsoid.cartesianToCartographic(camera.position).height;

        // distanceMeasure should be the height above the ellipsoid.
        // The zoomRate slows as it approaches the surface and stops minimumZoomDistance above it.
        var minHeight = minimumZoomDistance;
        var maxHeight = maximumZoomDistance;

        var minDistance = height - minHeight;
        var zoomRate = zoomFactor * minDistance;
        zoomRate = Cesium.Math.clamp(zoomRate, minimumZoomRate, maximumZoomRate);

        var rangeWindowRatio = z / depth;
        rangeWindowRatio = Math.min(rangeWindowRatio, maximumMovementRatio);
        var distance = zoomRate * rangeWindowRatio;

        if (distance > 0.0 && Math.abs(height - minHeight) < 1.0) {
            return;
        }

        if (distance < 0.0 && Math.abs(height - maxHeight) < 1.0) {
            return;
        }

        if (height - distance < minHeight) {
            distance = height - minHeight - 1.0;
        } else if (height - distance > maxHeight) {
            distance = height - maxHeight;
        }

        controller.zoomIn(distance);
    }

    var firstFrame;

    function onFrameChanged(scene, frame) {
        if (frame.valid && frame.hands.length > 0) {
          if (typeof firstFrame === 'undefined') {
              firstFrame = frame;
          }

          var fingers = frame.fingers;
          if (fingers.length === 0) {
              firstFrame = frame;
          } else {
              var translation = firstFrame.translation(frame);
              rotate(scene, -translation[0], translation[1]);
              zoom(scene, translation[2]);
          }
        }
    }

    return onFrameChanged;
});