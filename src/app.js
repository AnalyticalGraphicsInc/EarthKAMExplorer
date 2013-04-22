/*global define*/
define(function(require) {
    "use strict";
    /*global Cesium*/

    var viewHome = require('./viewHome');
    var computeRotation = require('./computeRotation');
    var createFlyToExtentAnimation = require('./createFlyToExtentAnimation');
    var createImageryProviderViewModels = require('./createImageryProviderViewModels');
    var createGrid = require('./datagrid');

    var missionDataPromise = Cesium.loadJson(require.toUrl('../Assets/missions.json'));

    var missionIndexPromise = missionDataPromise.then(function(data) {
        var index = {};
        for ( var i = 0, len = data.length; i < len; ++i) {
            var datum = data[i];

            datum.Time = Cesium.JulianDate.fromIso8601(datum.Time);

            index[datum.ID] = datum;
        }
        return index;
    });

    return function() {
        var gridDataPromise = missionDataPromise.then(function(data) {
            var gridData = new Array(data.length);
            for ( var i = 0, len = data.length; i < len; ++i) {
                var datum = data[i];
                gridData[i] = [datum.ID, datum.Time.toIso8601(), datum.Mission, datum.School];
            }
            createGrid(gridData);
            return gridData;
        });

        var widget = new Cesium.CesiumWidget('cesiumContainer');
        var centralBody = widget.centralBody;

        var terrainProvider = new Cesium.CesiumTerrainProvider({
            url : 'http://cesium.agi.com/smallterrain'
        });

        centralBody.terrainProvider = terrainProvider;

        var ellipsoid = centralBody.getEllipsoid();

        centralBody.logoOffset = new Cesium.Cartesian2(370, 26);

        var clock = widget.clock;

        var clockViewModel = new Cesium.ClockViewModel(clock);

        var animationViewModel = new Cesium.AnimationViewModel(clockViewModel);

        var animationWidget = new Cesium.Animation('animationContainer', animationViewModel);

        var timelineWidget = new Cesium.Timeline('timelineContainer', clock);

        function onTimelineScrub(e) {
            clock.currentTime = e.timeJulian;
            clock.shouldAnimate = false;
        }
        timelineWidget.addEventListener('settime', onTimelineScrub, false);

        var fullscreenWidget = new Cesium.FullscreenWidget('fullscreenContainer', document.body);

        var scene = widget.scene;
        var transitioner = new Cesium.SceneTransitioner(scene);

        // Hack to replace default texture
        Cesium.when(Cesium.loadImage('../Assets/loading.png'), function(image) {
            scene.getContext()._defaultTexture = scene.getContext().createTexture2D({
                source : image
            });
        });

        var sceneModePickerWidget = new Cesium.SceneModePicker('sceneModePickerContainer', transitioner);

        var camera3D = scene.getCamera().clone();
        var canvas = widget.canvas;
        var viewHomeButton = document.getElementById('viewHomeButton');
        viewHomeButton.addEventListener('click', function() {
            cancelViewFromTo();
            viewHome(scene, transitioner, canvas, ellipsoid, camera3D);
        });

        var imageryLayers = centralBody.getImageryLayers();
        var imageryProviderViewModels = createImageryProviderViewModels();
        var baseLayerPicker = new Cesium.BaseLayerPicker('baseLayerPickerContainer', imageryLayers, imageryProviderViewModels);
        baseLayerPicker.viewModel.selectedItem(imageryProviderViewModels[0]);

        var photoObjectCollection = new Cesium.DynamicObjectCollection();
        var photoVisualizers = new Cesium.VisualizerCollection([new Cesium.DynamicPolygonBatchVisualizer(scene)], photoObjectCollection);

        var selectedPhotoPolygon = new Cesium.Polygon();
        selectedPhotoPolygon.material = new Cesium.Material.fromType(scene.getContext(), 'Image');

        var issObjectCollection = new Cesium.DynamicObjectCollection();
        var issVisualizers;

        var currentMissionName;
        function loadCzml(missionName) {
            if (currentMissionName === missionName) {
                return;
            }

            var photoUrl = require.toUrl('../Assets/CZML/' + missionName + '.czml');
            var issUrl = require.toUrl('../Assets/CZML/' + missionName + '_iss.czml');

            photoObjectCollection.clear();
            scene.getPrimitives().remove(selectedPhotoPolygon);
            issObjectCollection.clear();

            if (typeof issVisualizers !== 'undefined') {
                issVisualizers = issVisualizers.destroy();
            }

            Cesium.when.all([Cesium.loadJson(photoUrl), Cesium.loadJson(issUrl)]).then(function(czmlArray) {
                var photoCzml = czmlArray[0];
                var issCzml = czmlArray[1];

                Cesium.processCzml(photoCzml, photoObjectCollection, photoUrl);
                photoVisualizers.update(Cesium.Iso8601.MINIMUM_VALUE);

                selectedPhotoPolygon = new Cesium.Polygon();
                selectedPhotoPolygon.material = new Cesium.Material.fromType(scene.getContext(), 'Image');
                scene.getPrimitives().add(selectedPhotoPolygon);

                Cesium.processCzml(issCzml, issObjectCollection, issUrl);
                issVisualizers = new Cesium.VisualizerCollection(Cesium.CzmlDefaults.createVisualizers(scene), issObjectCollection);

                var document = issObjectCollection.getObject('document');
                if (typeof document !== 'undefined' && typeof document.clock !== 'undefined') {
                    clock.startTime = document.clock.startTime;
                    clock.stopTime = document.clock.stopTime;
                    clock.clockRange = document.clock.clockRange;
                    clock.clockStep = document.clock.clockStep;
                    clock.currentTime = document.clock.currentTime;

                    timelineWidget.zoomTo(clock.startTime, clock.stopTime);
                    clockViewModel.synchronize();
                }
            });
        }

        clock.onTick.addEventListener(function(clock) {
            if (typeof viewFromTo !== 'undefined') {
                viewFromTo.update(clock.currentTime);
            }
            if (typeof issVisualizers !== 'undefined') {
                issVisualizers.update(clock.currentTime);
            }
        });

        var proxy = new Cesium.DefaultProxy('/proxy/');

        function cancelViewFromTo() {
            viewFromTo = undefined;
            scene.getCamera().transform = Cesium.Matrix4.IDENTITY.clone();
        }

        function selectImage(id, extent) {
            cancelViewFromTo();
            var photoPolygon = photoObjectCollection.getObject(id);
            var positions;
            if (typeof extent === 'undefined') {
                positions = photoPolygon.vertexPositions.getValueCartographic(clock.currentTime);
                extent = createExtent(positions);
            }

            scene.getAnimations().add(createFlyToExtentAnimation(scene.getFrameState(), extent, ellipsoid));

            positions = photoPolygon.vertexPositions.getValueCartesian(clock.currentTime);
            selectedPhotoPolygon.setPositions(positions, 0.0, computeRotation(positions, ellipsoid));
            selectedPhotoPolygon.show = true;

            missionIndexPromise.then(function(missionData) {
                var missionDatum = missionData[id];
                var imageUrl = missionDatum.ImageUrl;
                imageUrl = Number(imageUrl) + 3;
                imageUrl = 'http://images.earthkam.ucsd.edu/main.php?g2_view=core.DownloadItem&g2_itemId=' + imageUrl;
                imageUrl = proxy.getURL(imageUrl);
                selectedPhotoPolygon.material.uniforms.image = imageUrl;

                clockViewModel.currentTime(missionDatum.Time);

                document.getElementById('metadata').className = 'visible';
                document.getElementById('metadataPhotoID').innerText = id;
                document.getElementById('metadataSchool').innerText = missionDatum.School;

                var gregorianDate = missionDatum.Time.toGregorianDate();
                document.getElementById('metadataTime').innerText = Cesium.sprintf('%04d/%02d/%02d %02d:%02d:%02d', gregorianDate.year, gregorianDate.month, gregorianDate.day, gregorianDate.hour, gregorianDate.minute, gregorianDate.second);

                document.getElementById('metadataOrbit').innerText = missionDatum.OrbitNumber;
                document.getElementById('metadataLens').innerText = missionDatum.LensSize;
                document.getElementById('metadataFrameWidth').innerText = missionDatum.FrameWidth;
                document.getElementById('metadataFrameHeight').innerText = missionDatum.FrameHeight;
            });
        }

        function createExtent(positions) {
            var minLon = -Math.PI;
            var maxLon = Math.PI;
            var minLat = -Cesium.Math.PI_OVER_TWO;
            var maxLat = Cesium.Math.PI_OVER_TWO;
            for ( var i = 0; i < positions.length; i++) {
                var position = positions[i];
                minLon = Math.max(minLon, position.longitude);
                maxLon = Math.min(maxLon, position.longitude);
                minLat = Math.max(minLat, position.latitude);
                maxLat = Math.min(maxLat, position.latitude);
            }

            return new Cesium.Extent(minLon, minLat, maxLon, maxLat);
        }

		var viewFromTo;
        var handler = new Cesium.ScreenSpaceEventHandler(scene.getCanvas());
        handler.setInputAction(function(movement) {
            var pickedObject = scene.pick(movement.position);
            if (typeof pickedObject !== 'undefined') {
                var dynamicObject = pickedObject.dynamicObject;
                if (typeof dynamicObject !== 'undefined') {
                    if (dynamicObject.id === '/Application/STK/Scenario/SpaceAppsChallenge/Satellite/Iss_25544' && typeof viewFromTo === 'undefined') {
                        viewFromTo = new Cesium.DynamicObjectView(dynamicObject, scene, widget.ellipsoid);
                    }
                }

			var index = pickedObject.index;
                if (typeof index !== 'undefined') {
                    var polyObjects = photoObjectCollection.getObjects();
                    for ( var i = 0, length = polyObjects.length; i < length; i++) {
                        if (polyObjects[i]._polygonVisualizerIndex === index) {
                            selectImage(polyObjects[i].id);
                        }
                    }
                }
            }
        }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

        var missionSelect = document.getElementById("missionSelect");
        missionSelect.addEventListener('change', function() {
            var selected = missionSelect.item(missionSelect.selectedIndex);
            loadCzml(selected.value);
        });

        var missions2CzmlNamePromise = missionDataPromise.then(function(data) {
            var firstTime = true;
            var index = {};
            for ( var i = 0, len = data.length; i < len; ++i) {
                var datum = data[i];
                if (typeof index[datum.Mission] === 'undefined') {
                    var value = datum.CZML.slice(0, datum.CZML.length - 5);
                    var option = document.createElement("option");
                    option.text = datum.Mission;
                    option.value = value;
                    missionSelect.add(option, null);
                    index[datum.Mission] = value;
                    if (firstTime) {
                        firstTime = false;
                        loadCzml(value);
                    }
                }
            }
            return index;
        });
    };
});