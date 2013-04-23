/*global define*/
define(['require'], function(require) {
    "use strict";
    /*global Cesium*/

    var firstValidFrame;
    //var pickGesture = false;

    function map(value, inputMin, inputMax, outputMin, outputMax){
        var outVal = ((value - inputMin) / (inputMax - inputMin) * (outputMax - outputMin) + outputMin);
        if(outVal >  outputMax){
            outVal = outputMax;
        }
        if(outVal <  outputMin){
            outVal = outputMin;
        }
        return outVal;
    }

    function onFrameChanged(scene, frame) {
        var camera = scene.getCamera();

        if (frame.valid && frame.hands.length > 0) {
          if (typeof firstValidFrame === 'undefined') {
              firstValidFrame = frame;
          }
          var translation = firstValidFrame.translation(frame);

          //assign rotation coordinates
          var rotateX = translation[0];
          var rotateY = -map(translation[1], -300, 300, 1, 179);
          var zoom = translation[2];

          var cameraRadius = camera.position.magnitude() - zoom * 100.0;

          //adjust 3D spherical coordinates of the camera
          camera.position.x = cameraRadius * Math.sin(rotateY * Math.PI/180) * Math.cos(rotateX * Math.PI/180);
          camera.position.y = cameraRadius * Math.sin(rotateY * Math.PI/180) * Math.sin(rotateX * Math.PI/180);
          camera.position.z = cameraRadius * Math.cos(rotateY * Math.PI/180);

          /*
          var gestures = frame.gestures;
          var length = frame.gestures.length;
          if (length > 0) {
              for (var i = 0; i < length; ++i) {
                  if (gestures[i].type === 'keyTap') {
                      pickGesture = true;
                  }
              }
          }
          */
        }

        var p = camera.position.negate().normalize();
        var up = Cesium.Cartesian3.cross(p, Cesium.Cartesian3.UNIT_Z).cross(p);
        camera.controller.lookAt(camera.position, Cesium.Cartesian3.ZERO, up);
    }

    return onFrameChanged;
});