/*global define*/
define(function(require) {
    "use strict";
    /*global Cesium,Leap,$*/

    var getQueryParameters = require('./getQueryParameters');
    var Grid = require('./datagrid');
    var onFrameChanged = require('./onFrameChanged');

    var missionsPromise = Cesium.loadJson(require.toUrl('../Assets/missions.json'));

    $('#splash').click(function() {
        $('#splash').addClass('hidden');
    });

    return function() {
        var queryParams = getQueryParameters();
        var widget = new Cesium.Viewer('cesiumContainer');
        var globe = widget.scene.globe;

        var terrainProvider = new Cesium.CesiumTerrainProvider({
            url : 'http://cesium.agi.com/smallterrain'
        });

        globe.terrainProvider = terrainProvider;

        var ellipsoid = globe.ellipsoid;

        globe.logoOffset = new Cesium.Cartesian2(370, 26);

        var clock = widget.clock;

        function onTimelineScrub(e) {
            clock.currentTime = e.timeJulian;
            clock.shouldAnimate = false;
        }
        widget.timeline.addEventListener('settime', onTimelineScrub, false);

        var scene = widget.scene;

        // Hack to replace default texture
        Cesium.when(Cesium.loadImage('Assets/loading.png'), function(image) {
            //scene.getContext()._defaultTexture = scene.getContext().createTexture2D({
               // source : image
//            });
        });

//        viewHomeButton.addEventListener('click', function() {
//            cancelViewFromTo();
//        });

        var photoObjectCollection = new Cesium.DynamicObjectCollection();
        //var photoVisualizers = [new Cesium.DynamicPolygonBatchVisualizer(scene, photoObjectCollection)];

        //var selectedPhotoPolygon = new Cesium.Polygon();
        //selectedPhotoPolygon.material = new Cesium.Material.fromType(scene.getContext(), 'Image');

        var missionIndexPromise;
        var currentMissionName;
        function loadMission(missionName) {
            if (currentMissionName === missionName) {
                return;
            }

            var photoUrl = require.toUrl('../Assets/CZML/' + missionName + '.czml');
            var issUrl = require.toUrl('../Assets/CZML/' + missionName + '_iss.czml');

            photoObjectCollection.removeAll();
            //scene.primitives.remove(selectedPhotoPolygon);

            Cesium.when.all([Cesium.loadJson(photoUrl), Cesium.loadJson(issUrl)]).then(function(czmlArray) {
                var photoCzml = czmlArray[0];
                var issCzml = czmlArray[1];

                //Cesium.process(photoCzml, photoObjectCollection, photoUrl);
                //photoVisualizers.update(Cesium.Iso8601.MINIMUM_VALUE);

                //selectedPhotoPolygon = new Cesium.Polygon();
                //selectedPhotoPolygon.material = new Cesium.Material.fromType(scene.getContext(), 'Image');
                //scene.primitives.add(selectedPhotoPolygon);

                var issDataSource = new Cesium.CzmlDataSource();
                issDataSource.process(issCzml, issUrl);
                widget.dataSources.add(issDataSource);
            });

            Grid.Maximize(); //Must maximize to prevent grid from re-drawing weirdly.
            var jsonUrl = require.toUrl('../Assets/JSON/' + missionName + '.json');
            var jsonPromise = Cesium.loadJson(jsonUrl);

            missionIndexPromise = jsonPromise.then(function(data) {
                var times = data.Time;
                var index = {};
                var gridData = new Array(times.length);
                for ( var i = 0, len = times.length; i < len; ++i) {
                    var time = Cesium.JulianDate.fromIso8601(times[i]);

                    var gregorianDate = Cesium.JulianDate.toGregorianDate(time);
                    var timeString = Cesium.sprintf('%04d/%02d/%02d %02d:%02d:%02d', gregorianDate.year, gregorianDate.month, gregorianDate.day, gregorianDate.hour, gregorianDate.minute, gregorianDate.second);

                    var id = data.ID[i];
                    var school = data.School[i];
                    gridData[i] = [id, timeString, school];

                    index[data.ID[i]] = {
                        ID : id,
                        Time : time,
                        TimeString : timeString,
                        School : school,
                        ImageUrl : data.ImageUrl[i],
                        LensSize : data.LensSize[i],
                        OrbitNumber : data.OrbitNumber[i],
                        FrameWidth : data.FrameWidth[i],
                        FrameHeight : data.FrameHeight[i],
                        Page : data.Page[i]
                    };
                }
                Grid.LoadData(gridData);
                return index;
            });
        }

        var viewFromTo;
        clock.onTick.addEventListener(function(clock) {
            if (typeof viewFromTo !== 'undefined') {
                viewFromTo.update(clock.currentTime);
            }
        });

        var proxy = new Cesium.DefaultProxy('/proxy/');

        function cancelViewFromTo() {
            if (typeof viewFromTo !== 'undefined') {
                viewFromTo = undefined;
                var camera = scene.camera;
                var mode = scene.mode;
                if (mode === Cesium.SceneMode.SCENE2D || mode === Cesium.SceneMode.COLUMBUS_VIEW) {
                    camera.transform = new Cesium.Matrix4(0.0, 0.0, 1.0, 0.0,
                            1.0, 0.0, 0.0, 0.0,
                            0.0, 1.0, 0.0, 0.0,
                            0.0, 0.0, 0.0, 1.0);
                } else if (mode === Cesium.SceneMode.SCENE3D) {
                    Cesium.Cartesian3.add(camera.position, Cesium.Matrix4.getTranslation(camera.transform), camera.position);
                    var rotation = Cesium.Matrix4.getRotation(camera.transform);
                    rotation.multiplyByVector(camera.direction, camera.direction);
                    rotation.multiplyByVector(camera.up, camera.up);
                    rotation.multiplyByVector(camera.right, camera.right);
                    camera.transform = Cesium.Matrix4.IDENTITY.clone();
                }

                var screenSpaceCameraController = scene.screenSpaceCameraController;
                screenSpaceCameraController.setEllipsoid(ellipsoid);
                screenSpaceCameraController.enableTilt = true;
                screenSpaceCameraController.enableTranslate = true;
                screenSpaceCameraController.columbusViewMode = Cesium.CameraColumbusViewMode.FREE;
            }
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
                document.getElementById('metadataPhotoID').textContent = id;
                document.getElementById('metadataPhotoID').href = 'http://images.earthkam.ucsd.edu/main.php?g2_itemId=' + missionDatum.Page;
                document.getElementById('metadataSchool').textContent = missionDatum.School;
                document.getElementById('metadataTime').textContent = missionDatum.TimeString;
                document.getElementById('metadataOrbit').textContent = missionDatum.OrbitNumber;
                document.getElementById('metadataLens').textContent = missionDatum.LensSize;
                document.getElementById('metadataFrameWidth').textContent = missionDatum.FrameWidth;
                document.getElementById('metadataFrameHeight').textContent = missionDatum.FrameHeight;
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

            positions = photoPolygon.vertexPositions.getValueCartesian(clock.currentTime);
            //selectedPhotoPolygon.setPositions(positions, 0.0, computeRotation(positions, ellipsoid));
            //selectedPhotoPolygon.show = true;

            missionIndexPromise.then(function(missionData) {
                var missionDatum = missionData[id];
                var imageUrl = missionDatum.ImageUrl;
                imageUrl = Number(imageUrl) + 3;
                imageUrl = 'http://images.earthkam.ucsd.edu/main.php?g2_view=core.DownloadItem&g2_itemId=' + imageUrl;
                imageUrl = proxy.getURL(imageUrl);
                //selectedPhotoPolygon.material.uniforms.image = imageUrl;

                //scene.getAnimations().add(createFlyToExtentAnimation(scene.getFrameState(), extent, ellipsoid));

                var time = clock.currentTime;
                scene.getAnimations().add({
                    duration : 3000.0,
                    easingFunction : Cesium.Tween.Easing.Sinusoidal.InOut,
                    startValue : {
                        time : 0.0
                    },
                    stopValue : {
                        time : 1.0
                    },
                    onUpdate : function(value) {
                        var newTime = time.addSeconds(value.time * time.getSecondsDifference(missionDatum.Time));
                        clock.currentTime = Cesium.JulianDate.clone(newTime);
                    }
                });
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
                    var polyObjects = photoObjectCollection.dynamicObjects;
                    for ( var i = 0, length = polyObjects.length; i < length; i++) {
                        if (polyObjects[i]._polygonVisualizerIndex === index) {
                            selectImage(polyObjects[i].id);
                            Grid.ClearSelection();
                        }
                    }
                }
            }
        }

        var handler = new Cesium.ScreenSpaceEventHandler(scene.canvas);
        handler.setInputAction(function(movement) {
            pick(movement.position);
        }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

        handler.setInputAction(function(movement) {
            mouseOverID = undefined;
            var pickedObject = scene.pick(movement.endPosition);
            if (typeof pickedObject !== 'undefined') {
                var index = pickedObject.index;
                if (typeof index !== 'undefined') {
                    var polyObjects = photoObjectCollection.dynamicObjects;
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
            loadMission(selected.value);
        });
        missionsPromise.then(function(missionsData) {
            for ( var i = 0, len = missionsData.length; i < len; ++i) {
                var option = document.createElement("option");
                option.text = missionsData[i].name;
                option.value = missionsData[i].file;
                missionSelect.add(option, null);

                if (i === 0) {
                    loadMission(option.value);
                }
            }
        });

        Grid.Init(selectImage);

        var controller = new Leap.Controller({enableGestures: true});
        controller.on('frame', function(frame) {
            //onFrameChanged(scene, frame, pick);
        });

        if (queryParams.leap === 'true') {
            controller.connect();
        }
    };
});