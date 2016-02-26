/* Global UI Behavior should come here */

define(["jquery"], function(){
    $("#map-view").click(function(){
        $(this).parent().addClass("active");
        $("#graph-view").parent().removeClass("active");
        $("#map").fadeIn("fast");
        $("#graph").fadeOut("fast");
        console.log("map-view is clicked!");
    });

    $("#graph-view").click(function(){
        $(this).parent().addClass("active");
        $("#map-view").parent().removeClass("active");
        $("#map").fadeOut("fast");
        $("#graph").fadeIn("fast");
    });
});