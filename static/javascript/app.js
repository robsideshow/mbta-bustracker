/* Global UI Behavior should come here */

define(["jquery"], function($){
    $(document).ready(function(){
        $("#graph").hide();

        var hideCtrl = true;
        $(".routeCtrl").on("click",function(){

            if (!hideCtrl) {
                hideCtrl = true;
                $(this).html('<i class="material-icons">vertical_align_bottom</i> Show Route Control');
                $(".routeToggleControl").slideUp();
            }else{
                hideCtrl = false;
                $(this).html('<i class="material-icons">vertical_align_top</i> Hide Route Control');
                $(".routeToggleControl").slideDown();
            }
        });
    })
    $("#map-view").click(function(){
        $(this).addClass("active");
        $("#graph-view").removeClass("active");
        $("#map").fadeIn("fast");
        $("#graph").fadeOut("fast");
    });

    $("#graph-view").click(function(){
        $(this).addClass("active");
        $("#map-view").removeClass("active");
        $("#map").fadeOut("fast");
        $("#graph").fadeIn("fast");
    });


});
