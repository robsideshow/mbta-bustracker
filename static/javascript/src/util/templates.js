define(["jquery", "handlebars", "underscore"],
       function($, H, _) {
           var loaded = {},
               htmlPromises = {},
               idCounter = 0,
               templates = {
                   templateOptions: {},

                   getTemplate: function(name, options) {
                       var promise = $.Deferred(),
                           fn = loaded[name];

                       if (!fn) {
                           promise.resolve(fn);
                           var elt = document.getElementById(name + "-template");

                           if (elt) {
                               fn = H.compile(elt.innerHTML, options);
                               loaded[name] = fn;
                           }
                       }

                       if (fn) {
                           promise.resolve(fn);
                       } else {
                           $.get("/static/template/" + name + ".mustache")
                               .done(function(html) {
                                   fn = H.compile(html, options);
                                   loaded[name] = fn;
                                   promise.resolve(fn);
                               })
                               .fail(function(err) {
                                   promise.resolve(null);
                               });
                       }

                       return promise;
                   },

                   render: function(name, data, execOptions) {
                       var options = templates.templateOptions[name];
                       return templates.getTemplate(name, options)
                           .then(function(fn) {
                               if (fn) {
                                   try {
                                       return fn(data, execOptions);
                                   } catch(err) {
                                       return $.Deferred().reject(err);
                                   }
                               } else {
                                   return $.Deferred().reject("No such template");
                               }
                           });
                   },

                   /**
                    * @param {jQuery} $el A jQuery-wrapped element
                    * @param {string|jQuery.Deferred} value
                    */
                   html: function($el, value) {
                       // If there is an existing HTML promise associated with
                       // the element, cancel it.
                       var id = $el.uniqueId(),
                           oldPromise = htmlPromises[id];
                       if (oldPromise) {
                           oldPromise.reject();
                           delete htmlPromises[id];
                       }

                       if (typeof value == "string") {
                           $el.html(value);
                       } else if (value.done) {
                           value.done(function(html) {
                               $el.html(html);
                           })
                               .always(function() {
                                   delete htmlPromises[id];
                               });
                           htmlPromises[id] = value;
                       }

                       return value;
                   }
               };

           $.fn.uniqueId = function() {
               var $el = this.eq(0),
                   id = $el.attr("id");

               if (!id) {
                   id = "_tmpl_" + (++idCounter);
                   $el.attr("id", id);
               }

               return id;
           };

           $.fn.htmlPromise = function(value) {
               templates.html(this, value);

               return this;
           };

           return templates;
       });
