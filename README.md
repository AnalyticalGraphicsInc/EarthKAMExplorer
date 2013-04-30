[![](https://raw.github.com/AnalyticalGraphicsInc/EarthKAMExplorer/master/doc/EarthKAMBanner.png)](http://cesiumspaceapp.cloudapp.net/)

Use [Chrome](http://www.google.com/chrome/) or [Firefox](http://www.mozilla.org/en-US/firefox/new/) to run:

[![](https://raw.github.com/AnalyticalGraphicsInc/EarthKAMExplorer/master/doc/run.png)](http://cesiumspaceapp.cloudapp.net/)

EarthKAM Explorer provides web-based 3D exploration of satellite images taken by middle school students through the [ISS EarthKAM](https://earthkam.ucsd.edu/) program.

![](https://raw.github.com/AnalyticalGraphicsInc/EarthKAMExplorer/master/doc/iss1.jpg)

Select a mission to see the ISS orbit during that mission and polygons showing where all the images were taken.  Select a polygon to fly to it and see the image, ISS location at that time, and related data.  Also, follow the ISS in orbit, filter by school, and post to twitter.

![](https://raw.github.com/AnalyticalGraphicsInc/EarthKAMExplorer/master/doc/iss2.jpg)

EarthKAM Explorer is written in JavaScript using [Cesium](http://cesium.agi.com/), an open-source WebGL virtual globe and map, so it runs in a browser **without a plugin**.  It supports the [Leap Motion](https://www.leapmotion.com/) controller for **hand-gesture** input as shown below (use this [url](http://cesiumspaceapp.cloudapp.net/?leap=true)).

![](https://raw.github.com/AnalyticalGraphicsInc/EarthKAMExplorer/master/doc/leapmotion.jpg)

EarthKAM Explorer was created in a weekend by developers from [Analytical Graphics, Inc](http://www.agi.com/): [@bagnell](https://github.com/bagnell), [@hpinkos](https://github.com/hpinkos), [@mramato](https://twitter.com/matt_amato), [@pjcozzi](https://twitter.com/pjcozzi), and [@shunter](https://github.com/shunter).

![](https://raw.github.com/AnalyticalGraphicsInc/EarthKAMExplorer/master/doc/team.jpg)

![](https://raw.github.com/AnalyticalGraphicsInc/EarthKAMExplorer/master/doc/team2.jpg)

**Videos**

* [Video for Global Judging](http://www.youtube.com/watch?v=L378jOZM8LA)
* Our [presentation in Philadelphia](http://www.youtube.com/watch?v=zICMX6xlOD0)
* [Using the Leap Motion controller with EarthKAM Explorer](http://www.ustream.tv/recorded/31733463)
* [Work-in-progress on Saturday night](http://www.ustream.tv/recorded/31733621)

Check out the code on [GitHub](https://github.com/AnalyticalGraphicsInc/EarthKAMExplorer)

Building EarthKAM Explorer
--------------------------
* Clone this repo.
* Install [NodeJS](http://nodejs.org/)
* From the `server` folder, run:
   * `npm install`.
   * `node server.js`.
* Browse to [http://localhost:8080](http://localhost:8080)

Resources
---------
* [Earth from Space challenge details](http://spaceappschallenge.org/challenge/earth-from-space/) on the Space Apps site.
* [EarthKAM Explorer project page](http://spaceappschallenge.org/project/earthkam-explorer/) on the Space Apps site.
* [ISS EarthKAM Gallery](http://images.earthkam.ucsd.edu/main.php)
* [ISS EarthKAM csv downloads](https://earthkam.ucsd.edu/ek-images/data)
* [Cesium Documentation](http://cesium.agi.com/Cesium/Build/Documentation/)
