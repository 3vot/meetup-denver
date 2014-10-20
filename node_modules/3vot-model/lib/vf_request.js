(function() {
  var AjaxRequest, AjaxUtils, Model;

  AjaxUtils = require("./ajax_utils");

  Model = require('./model');

  if (typeof threevot === 'undefined') {
    window.threevot = {};
    threevot.ThreeVotApiController = ThreeVotApiController;
  }

  AjaxRequest = (function() {
    function AjaxRequest() {}

    AjaxRequest.promise = {
      end: function() {}
    };

    AjaxRequest.enabled = true;

    AjaxRequest.disable = function(callback) {
      var e;
      if (this.enabled) {
        this.enabled = false;
        try {
          return callback();
        } catch (_error) {
          e = _error;
          throw e;
        } finally {
          this.enabled = true;
        }
      } else {
        return callback();
      }
    };

    AjaxRequest.queueRequest = {
      get: function(params, options) {
        return AjaxRequest.executeRestRequest("get", params, options);
      },
      post: function(params, options) {
        return AjaxRequest.executeRestRequest("post", params, options);
      },
      put: function(params, options) {
        return AjaxRequest.executeRestRequest("put", params, options);
      },
      del: function(params, options) {
        return AjaxRequest.executeRestRequest("del", params, options);
      }
    };

    AjaxRequest.executeRestRequest = function(type, params, options, model) {
      var fields, request, vfCall, _ref;
      if (this.enabled === false) {
        return this.promise;
      }
      options.url = options.url.replace(Model.host + "/", "/");
      if ((_ref = params.data) != null) {
        delete _ref.id;
      }
      vfCall = 'threevot.ThreeVotApiController.handleRest';
      fields = "{}";
      if (type === "put" || type === "post") {
        fields = JSON.stringify(params.data || "{}");
      }
      return request = {
        end: function(callback) {
          return Visualforce.remoting.Manager.invokeAction(vfCall, type, options.url, fields, function(result, event) {
            if (event.status) {
              if (type === "put" && result === null || (type === "del" && result === null)) {
                result = '{}';
              } else if (type !== "del" && type !== "put" && result === null) {
                return callback("Null return from action method");
              }
              result = JSON.parse(result);
              if (Array.isArray(result) && result.length > 0 && result[0].message && result[0].errorCode) {
                return callback(result[0].message);
              }
              if (result && result.message && result.errorCode) {
                return callback(result[0].message);
              }
              if (result) {
                delete result.errors;
              }
              if (result) {
                delete result.success;
              }
              return callback(null, {
                body: result
              });
            } else if (event.type === 'exception') {
              return callback(event.message);
            } else {
              return callback(event.message);
            }
          }, {
            escape: false
          });
        }
      };
    };

    return AjaxRequest;

  })();

  module.exports = AjaxRequest;

}).call(this);
