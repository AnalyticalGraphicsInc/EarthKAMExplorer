(function() {
    "use strict";
    /*global console,require,__dirname*/

    var path = require('path');
    var express = require('express');

    var mime = express.mime;
    mime.define({
        'application/json' : ['czml']
    });

    var url = require('url');
    var request = require('request');

    var dir = path.join(__dirname, '..');

    var app = express();
    app.use(express.compress());
    app.use(express.static(dir));

    app.get('/proxy', function(req, res) {
        var remoteUrl = Object.keys(req.query)[0];
        if (url.parse(remoteUrl).hostname !== 'images.earthkam.ucsd.edu') {
            res.end();
        }

        request.get(remoteUrl).pipe(res);
    });

    app.listen(8080);
})();
