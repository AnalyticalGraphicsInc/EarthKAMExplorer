/*global define*/
define(['TableTools'], function(TableTools) {
    "use strict";
    /*global $*/
    var Grid = {};
    Grid.Init = function(selectImage) {
        $('#example').dataTable({
            "bJQueryUI" : true,
            "bLengthChange" : false,
            "bScrollInfinite" : true,
            "bScrollCollapse" : true,
            "sScrollY" : "200px",
            "bInfo" : false,
            "sDom" : '<"H"Tfr>t<"F">',
            "oTableTools" : {
                "sRowSelect" : "single",
                "fnRowSelected" : function(nodes) {
                    var rowData = TableTools.fnGetInstance('example').fnGetSelected();
                    var cellValue = $('#example').dataTable().fnGetData(rowData[0], 0);
                    selectImage(cellValue);
                },
                "aButtons" : [{
                    "sExtends" : "text",
                    "sButtonText" : '<img src="/jQuery/css/down.png"/>',
                    "sButtonClass" : "minus",
                    "fnClick" : function() {
                        Grid.ToggleMinimize();
                    }
                }]
            },
            "aoColumns" : [{
                "sTitle" : "ID",
                "bVisible" : false
            }, {
                "sTitle" : "Time"
            }, {
                "sTitle" : "School"
            }],
            "aaSorting" : [[1, "desc"]]
        });
    };

    Grid.Maximize = function() {
        if ($('#ToolTables_example_0').hasClass('plus')) {
            Grid.ToggleMinimize();
        }
    };

    Grid.ToggleMinimize = function() {
        var $button = $('#ToolTables_example_0');
        $('#grid_search').toggleClass('minimized');

        if ($button.hasClass('minus')) {
            $button[0].innerHTML = '<span><img src="/jQuery/css/up.png"/></span>';
            $('#example_filter').css('display', 'none');
        } else {
            $button[0].innerHTML = '<span><img src="/jQuery/css/down.png"/></span>';
            $('#example_filter').css('display', 'block');
        }
        $button.toggleClass('plus').toggleClass('minus');
        $button.parent().parent().toggleClass('ui-corner-bl').toggleClass('ui-corner-br');
    };

    Grid.LoadData = function(Data) {
        var oTable = $('#example').dataTable();
        oTable.fnClearTable();
        oTable.fnAddData(Data);
    };

    Grid.ClearSelection = function() {
        TableTools.fnGetInstance('example').fnSelectNone();
    };

    return Grid;
});