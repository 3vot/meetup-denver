(function() {
  var AjaxUtils, Query, ajax_request, _3Model,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

  ajax_request = require("./ajax_request");

  AjaxUtils = require("./ajax_utils");

  _3Model = require("3vot-model");

  Query = (function() {
    function Query(model) {
      this.model = model;
      this.failResponse = __bind(this.failResponse, this);
      this.recordsResponse = __bind(this.recordsResponse, this);
      if (typeof Visualforce !== "undefined") {
        ajax_request = require("./vf_request");
      }
    }

    Query.prototype.manualQuery = function(query, options) {
      if (options == null) {
        options = {};
      }
      options.url = _3Model.Model.host + "/query?query=" + query;
      ajax_request.queueRequest.get({}, options, this.model).end((function(_this) {
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
    };

    Query.prototype.recordsResponse = function(data, options) {
      var _ref;
      this.model.trigger('ajaxSuccess', data);
      return (_ref = options.done) != null ? _ref.apply(this.model, [data]) : void 0;
    };

    Query.prototype.failResponse = function(error, options) {
      var _ref;
      this.model.trigger('ajaxError', error);
      return (_ref = options.fail) != null ? _ref.apply(this.model, [error]) : void 0;
    };

    return Query;

  })();

  module.exports = Query;

  ({
    getQuery: (function(_this) {
      return function(options) {
        if (options == null) {
          options = {
            "": true
          };
        }
        if (!RSpine.isArray(options)) {
          options = [options];
        }
        return _this.queryString() + _this.getQueryCondition(options);
      };
    })(this),
    getQueryCondition: function(conditions) {
      var filter, filterKey, key, orderFilterString, queryFilterString, querySinceLastUpdate, querySinceLastUpdated, stringFilters, thisFilter, _i, _j, _len, _len1, _ref;
      if (Object.keys(this.filters).length === 0) {
        return "";
      }
      stringFilters = [];
      queryFilterString = "";
      orderFilterString = "";
      querySinceLastUpdated = this.querySinceLastUpdate;
      for (_i = 0, _len = conditions.length; _i < _len; _i++) {
        filter = conditions[_i];
        if (!filter.junction) {
          filter.junction = "and";
        }
        if (stringFilters.length === 0) {
          filter.junction = "where";
        }
        filterKey = "";
        _ref = Object.keys(filter);
        for (_j = 0, _len1 = _ref.length; _j < _len1; _j++) {
          key = _ref[_j];
          if (key !== "junction") {
            filterKey = key;
          }
        }
        if (key === "sinceLastUpdate") {
          querySinceLastUpdate = true;
        }
        if (key === "avoidLastUpdate") {
          querySinceLastUpdate = false;
        }
        if (filterKey !== "orderBy" && filterKey !== "sinceLastUpdate" && key !== "avoidLastUpdate") {
          thisFilter = this.filters[filterKey];
          thisFilter = thisFilter.replace("?", filter[filterKey]);
          stringFilters.push(thisFilter);
          queryFilterString += " " + filter.junction + " " + thisFilter;
        } else if (filterKey === "orderBy") {
          orderFilterString = " ORDER " + filter[filterKey];
        }
      }
      if (querySinceLastUpdated) {
        queryFilterString = " and LastModifiedDate >= " + this.lastUpdate;
      }
      return queryFilterString + orderFilterString;
    },
    queryString: (function(_this) {
      return function() {
        var attribute, query, _i, _len, _ref, _ref1;
        query = "select ";
        _ref = _this.attributes;
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          attribute = _ref[_i];
          if (((_ref1 = _this.avoidQueryList) != null ? _ref1.indexOf(attribute) : void 0) === -1) {
            query += attribute + ",";
          }
        }
        query += "Id  ";
        query += "from " + _this.className;
        query += " ";
        return query;
      };
    })(this)
  });

}).call(this);
