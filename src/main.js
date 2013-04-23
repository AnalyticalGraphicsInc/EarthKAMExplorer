/*global requirejs,require*/

requirejs.config({
    paths : {
        Widgets : '../Cesium/Widgets',
        jquery: '../jQuery/jquery',
        dataTables: '../jQuery/jquery.dataTables.min',
        TableTools: '../jQuery/TableTools.min'
    },
    shim: {
        TableTools: {
            deps: ['jquery', 'dataTables']
        }
    }
});

require(['./app', 'domReady!'], function(app) {
    "use strict";
    app();
});