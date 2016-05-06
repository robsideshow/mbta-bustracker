define([],
       function() {
           var log;
           if (!window.console)
               return function() {};
           else
               return function(args) { console.log(args); };
       });
