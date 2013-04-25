/*global define*/
define(function(require) {
    "use strict";
    /*global Cesium,Leap*/

    var viewHome = require('./viewHome');
    var computeRotation = require('./computeRotation');
    var createFlyToExtentAnimation = require('./createFlyToExtentAnimation');
    var createImageryProviderViewModels = require('./createImageryProviderViewModels');
    var getQueryParameters = require('./getQueryParameters');
    var Grid = require('./datagrid');
    var onFrameChanged = require('./onFrameChanged');

    var missionDataPromise = Cesium.loadJson(require.toUrl('../Assets/missions.json'));

    var missionIndexPromise = missionDataPromise.then(function(data) {
        var index = {};
        var times = data.Time;
        for ( var i = 0, len = times.length; i < len; ++i) {
            times[i] = Cesium.JulianDate.fromIso8601(times[i]);

            index[data.ID[i]] = {
                ID : data.ID[i],
                Time : data.Time[i],
                Mission : data.Mission[i],
                School : data.School[i],
                ImageUrl : data.ImageUrl[i],
                LensSize : data.LensSize[i],
                OrbitNumber : data.OrbitNumber[i],
                FrameWidth : data.FrameWidth[i],
                FrameHeight : data.FrameHeight[i],
                Page : data.Page[i],
                CZML : data.CZML[i]
            };
        }
        return index;
    });

    return function() {
        Grid.Init(selectImage);

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

        function loadMissionToGrid(mission) {
            Grid.Maximize(); //Must maximize to prevent grid from re-drawing weirdly.
            var jsonUrl = require.toUrl('../Assets/JSON/' + mission + '.json');
            Cesium.loadJson(jsonUrl).then(function(data) {
                var gridData = new Array(data.length);
                for ( var i = 0, len = data.length; i < len; ++i) {
                    var datum = data[i];
                    var value = datum.Time;
                    var y = value.slice(0, 4) + '-' + value.slice(4, 6) + '-' + value.slice(6, 8) + ' ' + value.slice(9,11) + ':' + value.slice(11,13);
                    gridData[i] = [datum.ID, y, datum.Mission, datum.School];
                }
                Grid.LoadData(gridData);
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

        var selectedID;
        var mouseOverID;

        function updateMetadata() {
            var id = Cesium.defaultValue(mouseOverID, selectedID);
            if (typeof id === 'undefined') {
                document.getElementById('metadata').className = '';
                return;
            }

            missionIndexPromise.then(function(missionData) {
                var missionDatum = missionData[id];

                document.getElementById('metadata').className = 'visible';
                document.getElementById('metadataPhotoID').innerText = id;
                document.getElementById('metadataPhotoID').href = 'http://images.earthkam.ucsd.edu/main.php?g2_itemId=' + missionDatum.Page;
                document.getElementById('metadataSchool').innerText = missionDatum.School;

                var gregorianDate = missionDatum.Time.toGregorianDate();
                document.getElementById('metadataTime').innerText = Cesium.sprintf('%04d/%02d/%02d %02d:%02d:%02d', gregorianDate.year, gregorianDate.month, gregorianDate.day, gregorianDate.hour, gregorianDate.minute, gregorianDate.second);

                document.getElementById('metadataOrbit').innerText = missionDatum.OrbitNumber;
                document.getElementById('metadataLens').innerText = missionDatum.LensSize;
                document.getElementById('metadataFrameWidth').innerText = missionDatum.FrameWidth;
                document.getElementById('metadataFrameHeight').innerText = missionDatum.FrameHeight;
            });
        }

        function selectImage(id, extent) {
            selectedID = id;
            updateMetadata();

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
        function pick(coordinates) {
            var pickedObject = scene.pick(coordinates);
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
                            Grid.ClearSelection();
                        }
                    }
                }
            }
        }

        var handler = new Cesium.ScreenSpaceEventHandler(scene.getCanvas());
        handler.setInputAction(function(movement) {
            pick(movement.position);
        }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

        handler.setInputAction(function(movement) {
            mouseOverID = undefined;
            var pickedObject = scene.pick(movement.endPosition);
            if (typeof pickedObject !== 'undefined') {
                var index = pickedObject.index;
                if (typeof index !== 'undefined') {
                    var polyObjects = photoObjectCollection.getObjects();
                    for ( var i = 0, length = polyObjects.length; i < length; i++) {
                        if (polyObjects[i]._polygonVisualizerIndex === index) {
                            mouseOverID = polyObjects[i].id;
                        }
                    }
                }
            }
            updateMetadata();
        }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

        var missionSelect = document.getElementById("missionSelect");
        missionSelect.addEventListener('change', function() {
            var selected = missionSelect.item(missionSelect.selectedIndex);
            loadCzml(selected.value);
            loadMissionToGrid(selected.value);
        });


        var missions2CzmlNamePromise = missionDataPromise.then(function(data) {
            var firstTime = true;
            var index = {};
            for ( var i = 0, len = data.Mission.length; i < len; ++i) {
                if (typeof index[data.Mission[i]] === 'undefined') {
                    var value = data.CZML[i].slice(0, data.CZML[i].length - 5);
                    var option = document.createElement("option");
                    option.text = data.Mission[i];
                    option.value = value;
                    missionSelect.add(option, null);
                    index[data.Mission[i]] = value;
                    if (firstTime) {
                        firstTime = false;
                        loadCzml(value);
                        loadMissionToGrid(value);
                    }
                }
            }
            return index;
        });

        var controller = new Leap.Controller({enableGestures: true});
        controller.on('frame', function(frame) {
            onFrameChanged(scene, frame);
        });

        if (getQueryParameters().leap === 'true') {
            controller.connect();
        }
    };
});