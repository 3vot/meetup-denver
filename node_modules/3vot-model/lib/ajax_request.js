(function() {
  var AjaxRequest, AjaxUtils, superagent, _3Model;

  superagent = require("superagent");

  AjaxUtils = require("./ajax_utils");

  _3Model = require("3vot-model");

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
        return AjaxRequest.executeRequest("get", params, options);
      },
      post: function(params, options) {
        return AjaxRequest.executeRequest("post", params, options);
      },
      put: function(params, options) {
        return AjaxRequest.executeRequest("put", params, options);
      },
      del: function(params, options) {
        return AjaxRequest.executeRequest("del", params, options);
      }
    };

    AjaxRequest.executeRequest = function(type, params, options) {
      var header, request, _i, _len, _ref;
      if (this.enabled === false) {
        return this.promise;
      }
      request = superagent[type](options.url).set('X-Requested-With', 'XMLHttpRequest');
      _ref = _3Model.Model.headers;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        header = _ref[_i];
        if (!header.name || !header.value) {
          throw "header should be an object with name and value";
        }
        request = request.set(header.name, header.value);
      }
      if (typeof request.withCredentials === "function") {
        request.withCredentials();
      }
      if (type === "put" || type === "post") {
        request = request.type('json');
      }
      if (options.error) {
        request.on("error", options.error);
      }
      if (params.query) {
        request = request.query(params.query);
      }
      if (params.data) {
        if (typeof params.data !== 'string') {
          params.data = JSON.stringify(params.data);
        }
        request = request.send(params.data);
      }
      return request;
    };

    return AjaxRequest;

  })();

  module.exports = AjaxRequest;

}).call(this);
