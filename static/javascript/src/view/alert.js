define(["backbone", "templates", "config"],
       function(B, $t, config) {
           var AlertView = B.View.extend({
               initialize: function() {
                   B.View.prototype.initialize.apply(this, arguments);

                   this.listenTo(this.model, "change", this.render);
                   this.restartHideTimer();
               },

               className: "badge",

               /*
                * Called after the popup is removed from the map:
                */
               remove: function() {
                   this.stopListening(this.model);
               },

               hide: function() {
                   this.$el.addClass("hidden");
               },

               show: function() {
                   this.$el.removeClass("hidden");
               },

               onChange: function() {
                   this.restartHideTimer();
                   this.render();
               },

               restartHideTimer: function() {
                   var self = this;
                   clearTimeout(this._timeout);

                   this._timeout = setTimeout(function() {
                       self.hide();
                   }, 5000);
               },

               render: function() {
                   var $el = this.$el;
                   $t.render("alert", this.model.attributes)
                       .done(function(html) {
                           $el.html(html);
                       });

                   return this;
               }
           });

           return AlertView;
       });
