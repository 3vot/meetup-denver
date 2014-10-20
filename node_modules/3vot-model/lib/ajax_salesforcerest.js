(function() {
  var SalesforceRest, ajax_request,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

  ajax_request = require("./ajax_request");

  SalesforceRest = (function() {
    function SalesforceRest(model) {
      this.model = model;
      this.failResponse = __bind(this.failResponse, this);
      this.recordsResponse = __bind(this.recordsResponse, this);
    }

    SalesforceRest.prototype.call = function(url, params, options) {
      if (options == null) {
        options = {};
      }
      options.url = url;
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

    SalesforceRest.prototype.recordsResponse = function(data, options) {
      var _ref;
      this.model.trigger('ajaxSuccess', data);
      this.model.trigger('restSuccess', data);
      return (_ref = options.done) != null ? _ref.apply(this.model, [data]) : void 0;
    };

    SalesforceRest.prototype.failResponse = function(error, options) {
      var _ref;
      this.model.trigger('ajaxError', error);
      this.model.trigger('restError', error);
      return (_ref = options.fail) != null ? _ref.apply(this.model, [error]) : void 0;
    };

    return SalesforceRest;

  })();

  module.exports = SalesforceRest;

}).call(this);
