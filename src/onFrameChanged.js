/*global define*/
define(['require'], function(require) {
    "use strict";
    /*global Cesium*/


    var width = 600.0 * 100.0;
    var height = 600.0 * 100.0;

    var radius = Cesium.Ellipsoid.WGS84.getMaximumRadius();
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

    var firstFrame;

    function onFrameChanged(scene, frame) {
        if (frame.valid && frame.hands.length > 0) {
          if (typeof firstFrame === 'undefined') {
              firstFrame = frame;
          }

          var translation = firstFrame.translation(frame);
          rotate(scene, translation[0], translation[1]);
        }
    }

    return onFrameChanged;
});