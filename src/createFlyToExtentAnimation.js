/*global define*/
define(['require'], function(require) {
    "use strict";
    /*global Cesium*/

    var viewExtent3DCartographic = new Cesium.Cartographic();
    var viewExtent3DNorthEast = new Cesium.Cartesian3();
    var viewExtent3DSouthWest = new Cesium.Cartesian3();
    var viewExtent3DNorthWest = new Cesium.Cartesian3();
    var viewExtent3DSouthEast = new Cesium.Cartesian3();
    var viewExtent3DCenter = new Cesium.Cartesian3();
    function viewExtent3D(camera, extent, ellipsoid) {
        var north = extent.north;
        var south = extent.south;
        var east = extent.east;
        var west = extent.west;

        // If we go across the International Date Line
        if (west > east) {
            east += Cesium.Math.TWO_PI;
        }

        var cart = viewExtent3DCartographic;
        cart.longitude = east;
        cart.latitude = north;
        var northEast = ellipsoid.cartographicToCartesian(cart, viewExtent3DNorthEast);
        cart.latitude = south;
        var southEast = ellipsoid.cartographicToCartesian(cart, viewExtent3DSouthEast);
        cart.longitude = west;
        var southWest = ellipsoid.cartographicToCartesian(cart, viewExtent3DSouthWest);
        cart.latitude = north;
        var northWest = ellipsoid.cartographicToCartesian(cart, viewExtent3DNorthWest);

        var center = Cesium.Cartesian3.subtract(northEast, southWest, viewExtent3DCenter);
        Cesium.Cartesian3.multiplyByScalar(center, 0.5, center);
        Cesium.Cartesian3.add(southWest, center, center);

        Cesium.Cartesian3.subtract(northWest, center, northWest);
        Cesium.Cartesian3.subtract(southEast, center, southEast);
        Cesium.Cartesian3.subtract(northEast, center, northEast);
        Cesium.Cartesian3.subtract(southWest, center, southWest);

        var direction = ellipsoid.geodeticSurfaceNormal(center);
        Cesium.Cartesian3.negate(direction, direction);
        Cesium.Cartesian3.normalize(direction, direction);
        var right = Cesium.Cartesian3.cross(direction, Cesium.Cartesian3.UNIT_Z);
        Cesium.Cartesian3.normalize(right, right);
        var up = Cesium.Cartesian3.cross(right, direction);

        var height = Math.max(Math.abs(up.dot(northWest)), Math.abs(up.dot(southEast)), Math.abs(up.dot(northEast)), Math.abs(up.dot(southWest)));
        var width = Math.max(Math.abs(right.dot(northWest)), Math.abs(right.dot(southEast)), Math.abs(right.dot(northEast)), Math.abs(right.dot(southWest)));

        var tanPhi = Math.tan(camera.frustum.fovy * 0.5);
        var tanTheta = camera.frustum.aspectRatio * tanPhi;
        var d = Math.max(width / tanTheta, height / tanPhi);

        var scalar = center.magnitude() + d;
        Cesium.Cartesian3.normalize(center, center);
        return ellipsoid.cartesianToCartographic(Cesium.Cartesian3.multiplyByScalar(center, scalar));
    }

    var viewExtentCVCartographic = new Cesium.Cartographic();
    var viewExtentCVNorthEast = Cesium.Cartesian4.UNIT_W.clone();
    var viewExtentCVSouthWest = Cesium.Cartesian4.UNIT_W.clone();
    var viewExtentCVTransform = new Cesium.Matrix4();
    function viewExtentColumbusView(camera, extent, projection) {
        var north = extent.north;
        var south = extent.south;
        var east = extent.east;
        var west = extent.west;

        var transform = Cesium.Matrix4.clone(camera.transform, viewExtentCVTransform);
        transform.setColumn(3, Cesium.Cartesian4.UNIT_W);
        var invTransform = camera.getInverseTransform();

        var cart = viewExtentCVCartographic;
        cart.longitude = east;
        cart.latitude = north;
        var position = projection.project(cart);
        var northEast = Cesium.Cartesian3.clone(position, viewExtentCVNorthEast);
        Cesium.Matrix4.multiplyByVector(transform, northEast, northEast);
        Cesium.Matrix4.multiplyByVector(invTransform, northEast, northEast);

        cart.longitude = west;
        cart.latitude = south;
        position = projection.project(cart);
        var southWest = Cesium.Cartesian3.clone(position, viewExtentCVSouthWest);
        Cesium.Matrix4.multiplyByVector(transform, southWest, southWest);
        Cesium.Matrix4.multiplyByVector(invTransform, southWest, southWest);

        var tanPhi = Math.tan(camera.frustum.fovy * 0.5);
        var tanTheta = camera.frustum.aspectRatio * tanPhi;

        position = new Cesium.Cartesian3();
        position.x = (northEast.x - southWest.x) * 0.5 + southWest.x;
        position.y = (northEast.y - southWest.y) * 0.5 + southWest.y;
        position.z = Math.abs(Math.max((northEast.x - southWest.x) / tanTheta, (northEast.y - southWest.y) / tanPhi) * 0.5);

        return projection.unproject(position);
    }

    var viewExtent2DCartographic = new Cesium.Cartographic();
    function viewExtent2D(camera, extent, projection) {
        var north = extent.north;
        var south = extent.south;
        var east = extent.east;
        var west = extent.west;

        var cart = viewExtent2DCartographic;
        cart.longitude = east;
        cart.latitude = north;
        var northEast = projection.project(cart);
        cart.longitude = west;
        cart.latitude = south;
        var southWest = projection.project(cart);

        var width = Math.abs(northEast.x - southWest.x) * 0.5;
        var height = Math.abs(northEast.y - southWest.y) * 0.5;

        var right, top;
        var ratio = camera.frustum.right / camera.frustum.top;
        var heightRatio = height * ratio;
        if (width > heightRatio) {
            right = width;
            top = right / ratio;
        } else {
            top = height;
            right = heightRatio;
        }

        height = Math.max(2.0 * right, 2.0 * top);

        var position = new Cesium.Cartesian3();
        position.x = (northEast.x - southWest.x) * 0.5 + southWest.x;
        position.y = (northEast.y - southWest.y) * 0.5 + southWest.y;

        cart = projection.unproject(position);
        cart.height = height;

        return cart;
    }

    function createFlyToExtentAnimation(frameState, extent, ellipsoid) {
        var camera = frameState.camera;
        var mode = frameState.mode;
        var projection = frameState.scene2D.projection;

        ellipsoid = (typeof ellipsoid === 'undefined') ? Cesium.Ellipsoid.WGS84 : ellipsoid;

        var cartographic;
        if (mode === Cesium.SceneMode.SCENE3D) {
            cartographic = viewExtent3D(camera, extent, ellipsoid);
        } else if (mode === Cesium.SceneMode.COLUMBUS_VIEW) {
            cartographic = viewExtentColumbusView(camera, extent, projection);
        } else if (mode === Cesium.SceneMode.SCENE2D) {
            cartographic = viewExtent2D(camera, extent, projection);
        }

        var animation = Cesium.CameraFlightPath.createAnimationCartographic(frameState, {
            destination : cartographic
        });
        return animation;
    }

    return createFlyToExtentAnimation;
});