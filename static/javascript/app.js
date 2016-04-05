/* Global UI Behavior should come here */

define(["jquery"], function($){
    $(document).ready(function(){
        $("graph-view").hide("fast");

        var hideCtrl = false;
        $(".routeCtrl").on("click",function(){
            console.log(hideCtrl);

            if (!hideCtrl) {
                hideCtrl = true;
                $(this).html('<i class="material-icons">vertical_align_bottom</i> Pullout Route Control');
                console.log(hideCtrl);

                $(".routeToggleControl").slideup();
            }else{
                hideCtrl = false;
                $(this).html('<i class="material-icons">vertical_align_top</i> Hide Route Control');
                console.log(hideCtrl);

                $(".routeToggleControl").slidedown();
            }
        });
    })
    $("#map-view").click(function(){
        $(this).parent().addClass("active");
        $("#graph-view").parent().removeClass("active");
        $("#map").fadeIn("fast");
        $("#graph").fadeOut("fast");
    });

    $("#graph-view").click(function(){
        $(this).parent().addClass("active");
        $("#map-view").parent().removeClass("active");
        $("#map").fadeOut("fast");
        $("#graph").fadeIn("fast");
    });


});