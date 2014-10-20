(function() {
  var Action, Ajax, AjaxUtils, Collection, Extend, Include, Query, SalesforceRest, Singleton, View, ajax_request, _3Model,
    __slice = [].slice;

  _3Model = require('3vot-model');

  AjaxUtils = require("./ajax_utils");

  Collection = require("./ajax_collection");

  Singleton = require("./ajax_singleton");

  Action = require("./ajax_action");

  Query = require("./ajax_query");

  SalesforceRest = require("./ajax_salesforcerest");

  View = require("./ajax_view");

  ajax_request = require("./ajax_request");

  Include = {
    ajax: function() {
      return new Singleton(this);
    },
    url: function() {
      var args;
      args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
      args.unshift(encodeURIComponent(this.id));
      return AjaxUtils.generateURL.apply(AjaxUtils, [this].concat(__slice.call(args)));
    }
  };

  Extend = {
    ajax: function() {
      return new Collection(this);
    },
    view: function() {
      return new View(this);
    },
    salesforceRest: function() {
      return new SalesforceRest(this);
    },
    action: function() {
      return new Action(this);
    },
    queryManager: function() {
      return new Query(this);
    },
    url: function() {
      var args;
      args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
      return AjaxUtils.generateURL.apply(AjaxUtils, [this].concat(__slice.call(args)));
    }
  };

  Ajax = {
    extended: function() {
      this.fetch(this.ajaxFetch);
      this.change(this.ajaxChange);
      this.query = this.ajaxQuery;
      this.rest = this.callSalesforceRest;
      this.extend(Extend);
      return this.include(Include);
    },
    ajaxFetch: function() {
      var _ref;
      return (_ref = this.ajax()).fetch.apply(_ref, arguments);
    },
    callAction: function() {
      var _ref;
      return (_ref = this.action()).call.apply(_ref, arguments);
    },
    callSalesforceRest: function() {
      var _ref;
      return (_ref = this.salesforceRest()).call.apply(_ref, arguments);
    },
    callView: function() {
      var _ref;
      return (_ref = this.view()).call.apply(_ref, arguments);
    },
    ajaxQuery: function() {
      var _ref;
      return (_ref = this.queryManager()).manualQuery.apply(_ref, arguments);
    },
    destroy: function() {
      var _ref;
      return (_ref = this.action()).destroy.apply(_ref, arguments);
    },
    ajaxChange: function(record, type, options) {
      if (options == null) {
        options = {};
      }
      if (options.ajax === false || record.constructor.autoAjax === false) {
        return;
      }
      return record.ajax()[type](options.ajax || {}, options);
    }
  };

  Ajax.request = ajax_request;

  module.exports = Ajax;

}).call(this);
