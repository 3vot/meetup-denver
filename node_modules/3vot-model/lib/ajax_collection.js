(function() {
  var AjaxUtils, Collection, ajax_request,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

  ajax_request = require("./ajax_request");

  AjaxUtils = require("./ajax_utils");

  Collection = (function() {
    function Collection(model) {
      this.model = model;
      this.failResponse = __bind(this.failResponse, this);
      this.recordsResponse = __bind(this.recordsResponse, this);
      if (typeof Visualforce !== "undefined") {
        ajax_request = require("./vf_request");
      }
    }

    Collection.prototype.find = function(id, params, options) {
      var record;
      if (options == null) {
        options = {};
      }
      record = new this.model({
        id: id
      });
      options.url = options.url || AjaxUtils.getURL(record);
      options.model = this.model;
      params.query = params.query || this.model.attributes.join(",");
      return ajax_request.queueRequest.get(params, options);
    };

    Collection.prototype.all = function(params, options) {
      if (options == null) {
        options = {};
      }
      if (!options.url) {
        options.url = this.model.url();
      }
      return ajax_request.queueRequest.get(params, options);
    };

    Collection.prototype.fetch = function(params, options) {
      var id, _this;
      if (params == null) {
        params = {};
      }
      if (options == null) {
        options = {};
      }
      if (id = params.id) {
        delete params.id;
        _this = this;
        this.find(id, params, options).end(function(err, res) {
          if (err) {
            return _this.failResponse(err, options);
          } else if (res.status >= 400) {
            return _this.failResponse(res.text, options);
          }
          _this.model.refresh(res.body, options);
          return _this.recordsResponse(res, options);
        });
        return true;
      } else {
        this.all(params, options).end((function(_this) {
          return function(err, res) {
            if (err) {
              return _this.failResponse(err, options);
            } else if (res.status >= 400) {
              return _this.failResponse(res.text, options);
            }
            _this.model.refresh(res.body, options);
            return _this.recordsResponse(res, options);
          };
        })(this));
        return true;
      }
    };

    Collection.prototype.recordsResponse = function(data, options) {
      var _ref;
      this.model.trigger('ajaxSuccess', data);
      return (_ref = options.done) != null ? _ref.apply(this.model, [data]) : void 0;
    };

    Collection.prototype.failResponse = function(error, options) {
      var _ref;
      this.model.trigger('ajaxError', error);
      return (_ref = options.fail) != null ? _ref.apply(this.model, [error]) : void 0;
    };

    return Collection;

  })();

  module.exports = Collection;

}).call(this);
