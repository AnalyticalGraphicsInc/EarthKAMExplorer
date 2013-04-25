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

    function getWindowPosition(scene, direction) {
        direction = direction.normalize();

        var camera = scene.getCamera();
        var frustum = camera.frustum;

        var near = frustum.near;
        var t = -near / direction.z;
        var p0 = direction.multiplyByScalar(t);

        var mvp = frustum.getProjectionMatrix();
        var viewport = new Cesium.BoundingRectangle();
        viewport.width = scene.getCanvas().clientWidth;
        viewport.height = scene.getCanvas().clientHeight;
        var vpt = Cesium.Matrix4.computeViewportTransformation(viewport, 0.0, 1.0);

        return Cesium.Transforms.pointToWindowCoordinates(mvp, vpt, p0);
    }

    var reticle;

    function updateReticle(scene, windowPosition, show) {
        var canvas = scene.getCanvas();
        var canvasWidth = canvas.clientWidth;
        var canvasHeight = canvas.clientHeight;

        //windowPosition = (typeof windowPosition !== 'undefined') ? windowPosition : new Cesium.Cartesian2();
        windowPosition = (typeof windowPosition !== 'undefined') ? windowPosition : new Cesium.Cartesian2(canvasWidth / 2, canvasHeight / 2);
        show = Cesium.defaultValue(show, 0.0);

        if (typeof reticle === 'undefined') {
            var source =
                'czm_material czm_getMaterial(czm_materialInput materialInput) {' +
                '   czm_material material = czm_getDefaultMaterial(materialInput);' +
                '   vec2 st = materialInput.st * 2.0 - 1.0;' +
                '   float len = length(st);' +
                '   float circle = 1.0 - smoothstep(0.75, 0.79, len) * (1.0 - smoothstep(0.81, 0.85, len));' +
                '   float vertLine = 1.0 - (1.0 - smoothstep(0.01, 0.04, abs(st.s))) * (1.0 - smoothstep(0.96, 1.0, abs(st.t)));' +
                '   float horizLine = 1.0 - (1.0 - smoothstep(0.01, 0.04, abs(st.t))) * (1.0 - smoothstep(0.96, 1.0, abs(st.s)));' +
                '   float val = 1.0 - circle * horizLine * vertLine;' +
                '   material.diffuse = color.rgb;' +
                '   material.alpha = color.a * val * show;' +
                '   return material;' +
                '}';
            var material = new Cesium.Material({
                context : scene.getContext(),
                fabric : {
                    uniforms : {
                        windowCoord : new Cesium.Cartesian2(),
                        resolution : new Cesium.Cartesian2(),
                        show : 1.0,
                        color : new Cesium.Color(0.2, 1.0, 0.2, 1.0)
                    },
                    source : source
                }
            });
            reticle = new Cesium.ViewportQuad(new Cesium.BoundingRectangle(), material);

            scene.getPrimitives().add(reticle);
        }

        var reticleSize = 150.0;

        reticle.rectangle.x = windowPosition.x - (reticleSize * 0.5);
        reticle.rectangle.y = windowPosition.y - (reticleSize * 0.5);
        reticle.rectangle.width = reticleSize;
        reticle.rectangle.height = reticleSize;

        reticle.material.uniforms.windowCoord = windowPosition;
        reticle.material.uniforms.show = show;
    }

    var origin = new Cesium.Cartesian3(0.0, 300.0, 0.0);

    function onFrameChanged(scene, frame) {
        var windowPosition;
        var showReticle = 0.0;

        if (frame.valid && frame.hands.length > 0) {
          var handPosition = frame.hands[0].palmPosition;
          var position = new Cesium.Cartesian3(handPosition[0], handPosition[1], handPosition[2]);
          var translation = origin.subtract(position);
          var moving = translation.magnitude() > 15.0;

          var fingers = frame.fingers;
          if (fingers.length === 1) {
              var dirArray = fingers[0].direction;
              var direction = new Cesium.Cartesian3(dirArray[0], dirArray[1], dirArray[2]);
              if (direction.z < 0) {
                  windowPosition = getWindowPosition(scene, direction);
                  showReticle = 1.0;
              }
          } else if (moving) {
              rotate(scene, -translation.x, translation.y);
              zoom(scene, translation.z);
          }
        }

        updateReticle(scene, windowPosition, showReticle);
    }

    return onFrameChanged;
});