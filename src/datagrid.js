/*global define*/
define(['TableTools'], function(TableTools) {
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
            "sDom": '<"H"Tfr>t<"F"ip>',
            "oTableTools": {
                "sRowSelect": "single",
                "aButtons": [{
                    "sExtends": "text",
                    "sButtonText": '<img src="/jQuery/css/down.png"/>',
                    "sButtonClass" : "minus",
                    "fnClick": function(nButton){
                        $('#grid_search').toggleClass('minimized');

                        if (nButton.classList[3] === 'minus') {
                            nButton.innerHTML = '<span><img src="/jQuery/css/up.png"/></span>';
                            $('#example_filter').css('display', 'none');
                        } else {
                            nButton.innerHTML = '<span><img src="/jQuery/css/down.png"/></span>';
                            $('#example_filter').css('display', 'block');
                        }
                        $('#ToolTables_example_0').toggleClass('plus').toggleClass('minus');
                        $('#ToolTables_example_0').parent().parent().toggleClass('ui-corner-bl').toggleClass('ui-corner-br');
                    }
                }]
            },
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