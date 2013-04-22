/*global define*/
define(['../jQuery/jQuery', '../jQuery/jquery.dataTables'], function(jQuery,dataTable) {
    "use strict";
    
    var createGrid = function(ISS_Data) {
        $('#grid_search').html( '<table cellpadding="0" cellspacing="0" border="0" class="display" id="example"></table>' );
        $('#example').dataTable( {
            "aaData": ISS_Data,
            "bJQueryUI": true,
            "bLengthChange": false,
            "bScrollInfinite": true,
            "bScrollCollapse": true,
            "sScrollY": "200px",
            "bInfo": false,
            "aoColumns": [
                { "sTitle": "ID", "bVisible": false},
                { "sTitle": "Time" },
                { "sTitle": "Mission" },
                { "sTitle": "School" }
            ],
            "aaSorting": [[ 1, "desc" ]]
        } );	
    }

    return createGrid;
});



        
        