(function() {
  var View, ajax_request,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

  ajax_request = require("./ajax_request");

  View = (function() {
    function View(model) {
      this.model = model;
      this.failResponse = __bind(this.failResponse, this);
      this.recordsResponse = __bind(this.recordsResponse, this);
    }

    View.prototype.call = function(name, values, options) {
      var params;
      if (options == null) {
        options = {};
      }
      options.url = this.model.url() + "/views/" + name;
      params = {
        query: values
      };
      ajax_request.queueRequest.get(params, options).end((function(_this) {
        return function(err, res) {
          if (err) {
            return _this.failResponse(err, options);
          } else if (res.status >= 400) {
            return _this.failResponse(res.text, options);
          }
          return _this.recordsResponse(res.body, options);
        };
      })(this));
      return true;
    };

    View.prototype.recordsResponse = function(data, options) {
      var _ref;
      this.model.trigger('ajaxSuccess', data);
      this.model.trigger('viewSuccess', data);
      return (_ref = options.done) != null ? _ref.apply(this.model, [data]) : void 0;
    };

    View.prototype.failResponse = function(error, options) {
      var _ref;
      this.model.trigger('ajaxError', error);
      this.model.trigger('viewError', error);
      return (_ref = options.fail) != null ? _ref.apply(this.model, [error]) : void 0;
    };

    return View;

  })();

  module.exports = View;

}).call(this);
