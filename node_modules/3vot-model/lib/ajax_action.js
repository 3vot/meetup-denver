(function() {
  var Action, ajax_request,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

  ajax_request = require("./ajax_request");

  Action = (function() {
    function Action(model) {
      this.model = model;
      this.failResponse = __bind(this.failResponse, this);
      this.recordsResponse = __bind(this.recordsResponse, this);
    }

    Action.prototype.destroy = function(values, options) {
      var params;
      if (values == null) {
        values = {};
      }
      if (options == null) {
        options = {};
      }
      options.url = this.model.url();
      params = {
        query: values
      };
      ajax_request.queueRequest.del(params, options).end((function(_this) {
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

    Action.prototype.call = function(name, values, options) {
      var params;
      if (values == null) {
        values = {};
      }
      if (options == null) {
        options = {};
      }
      options.url = this.model.url() + "/actions/" + name;
      params = {
        data: values
      };
      ajax_request.queueRequest.post(params, options).end((function(_this) {
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

    Action.prototype.recordsResponse = function(data, options) {
      var _ref;
      this.model.trigger('ajaxSuccess', data);
      this.model.trigger('actionSuccess', data);
      return (_ref = options.done) != null ? _ref.apply(this.model, [data]) : void 0;
    };

    Action.prototype.failResponse = function(error, options) {
      var _ref;
      this.model.trigger('ajaxError', error);
      this.model.trigger('actionError', error);
      return (_ref = options.fail) != null ? _ref.apply(this.model, [error]) : void 0;
    };

    return Action;

  })();

  module.exports = Action;

}).call(this);
