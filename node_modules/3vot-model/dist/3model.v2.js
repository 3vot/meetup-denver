require=(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({"o2RPxu":[function(require,module,exports){
(function() {
  var $, Collection, Events,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __slice = [].slice;

  $ = jQuery;

  Events = require('events');

  Collection = (function() {
    var k, v;

    for (k in Events) {
      v = Events[k];
      Collection.prototype[k] = v;
    }

    Collection.build = function(options) {
      return new this(options);
    };

    Collection.prototype.defaults = {
      preload: true
    };

    function Collection(options) {
      this.options = options != null ? options : {};
      this.asyncFindRequest = __bind(this.asyncFindRequest, this);
      this.asyncAllRequest = __bind(this.asyncAllRequest, this);
      this.baseSyncFind = __bind(this.baseSyncFind, this);
      this.syncFind = __bind(this.syncFind, this);
      this.asyncFind = __bind(this.asyncFind, this);
      this.asyncFindBy = __bind(this.asyncFindBy, this);
      this.syncFindBy = __bind(this.syncFindBy, this);
      this.asyncAll = __bind(this.asyncAll, this);
      this.isBase = __bind(this.isBase, this);
      this.shouldPreload = __bind(this.shouldPreload, this);
      this.recordEvent = __bind(this.recordEvent, this);
      this.change = __bind(this.change, this);
      this.unobserve = __bind(this.unobserve, this);
      this.observe = __bind(this.observe, this);
      this.replace = __bind(this.replace, this);
      this.reset = __bind(this.reset, this);
      this.remove = __bind(this.remove, this);
      this.add = __bind(this.add, this);
      this.count = __bind(this.count, this);
      this.empty = __bind(this.empty, this);
      this.exists = __bind(this.exists, this);
      this.resort = __bind(this.resort, this);
      this.sort = __bind(this.sort, this);
      this.each = __bind(this.each, this);
      this.fetch = __bind(this.fetch, this);
      this.all = __bind(this.all, this);
      this.refresh = __bind(this.refresh, this);
      this.findBy = __bind(this.findBy, this);
      this.find = __bind(this.find, this);
      if (!this.options.model) {
        throw new Error('Model required');
      }
      this.options = $.extend({}, this.defaults, this.options);
      this.ids = {};
      this.cids = {};
      this.records = this.options.records || [];
      this.model = this.options.model;
      if (this.options.comparator) {
        this.comparator = this.options.comparator;
      }
      this.promise = $.Deferred().resolve(this.records);
      this.records.observe = this.observe;
      this.records.unobserve = this.unobserve;
      this.records.promise = this.promise;
      if ('all' in this.options) {
        this.asyncAllRequest = this.options.all;
      }
      if ('find' in this.options) {
        this.asyncFindRequest = this.options.find;
      }
      this.on('record.remove', this.remove);
      this.on('record.observe observe', this.change);
    }

    Collection.prototype.find = function(id, options) {
      var record;
      if (options == null) {
        options = {};
      }
      if (!id) {
        throw new Error('id required');
      }
      if (typeof id.getID === 'function') {
        id = id.getID();
      }
      record = this.syncFind(id);
      record || (record = this.baseSyncFind(id));
      if (record && !options.remote) {
        return record;
      } else {
        return this.asyncFind(id, options);
      }
    };

    Collection.prototype.findBy = function(callback, request) {
      if (typeof callback !== 'function') {
        throw new Error('callback function required');
      }
      return this.syncFindBy(callback) || this.asyncFindBy(request);
    };

    Collection.prototype.refresh = function(options) {
      if (options == null) {
        options = {};
      }
      options = $.extend({}, options, {
        complete: (function(_this) {
          return function() {
            return _this.reset();
          };
        })(this)
      });
      return this.fetch(options);
    };

    Collection.prototype.all = function(callback, options) {
      var result;
      if (options == null) {
        options = {};
      }
      if (typeof callback === 'object') {
        options = callback;
        callback = null;
      }
      if (this.shouldPreload() || options.remote) {
        result = this.asyncAll(options);
      } else {
        result = this.records;
      }
      if (callback) {
        this.promise.done(callback);
      }
      return result;
    };

    Collection.prototype.fetch = function(options) {
      if (options == null) {
        options = {};
      }
      return this.asyncAll(options).request;
    };

    Collection.prototype.each = function(callback) {
      return this.all().promise.done((function(_this) {
        return function(records) {
          var rec, _i, _len, _results;
          _results = [];
          for (_i = 0, _len = records.length; _i < _len; _i++) {
            rec = records[_i];
            _results.push(callback(rec));
          }
          return _results;
        };
      })(this));
    };

    Collection.prototype.sort = function(callback) {
      if (callback == null) {
        callback = this.comparator;
      }
      if (callback) {
        this.records.sort(callback);
        this.trigger('sort');
      }
      return this;
    };

    Collection.prototype.resort = function(callback) {
      this.sort(callback);
      this.trigger('resort');
      return this;
    };

    Collection.prototype.exists = function(record) {
      var cid, id;
      if (typeof record === 'object') {
        id = record.getID();
        cid = record.getCID();
      } else {
        id = cid = record;
      }
      return id in this.ids || cid in this.cids;
    };

    Collection.prototype.empty = function() {
      return this.records.length === 0;
    };

    Collection.prototype.count = function() {
      return this.records.length;
    };

    Collection.prototype.add = function(records) {
      var changes, i, original, record, _base, _i, _len, _name, _ref;
      if (!records) {
        return;
      }
      if (typeof records.done === 'function') {
        records.done(this.add);
        return records;
      }
      if ($.isArray(records.items)) {
        records = records.items;
      }
      if (!$.isArray(records)) {
        records = [records];
      }
      records = new this.model(records);
      changes = [];
      for (i = _i = 0, _len = records.length; _i < _len; i = ++_i) {
        record = records[i];
        original = (_ref = this.model.collection) != null ? _ref.syncFind(record.getID()) : void 0;
        if (original) {
          original.set(record);
          (_base = this.cids)[_name = record.getCID()] || (_base[_name] = original);
          record = records[i] = original;
        }
        if (this.exists(record)) {
          continue;
        }
        this.records.push(record);
        this.cids[record.getCID()] = record;
        if (record.getID()) {
          this.ids[record.getID()] = record;
        }
        record.on('all', this.recordEvent);
        this.trigger('add', record);
        changes.push({
          name: record.getCID(),
          type: 'new',
          object: this,
          value: record
        });
      }
      this.sort();
      if (!this.isBase()) {
        this.model.add(records);
      }
      this.trigger('observe', changes);
      return records;
    };

    Collection.prototype.remove = function(records) {
      var changes, index, record, _i, _len, _ref;
      changes = [];
      if (!$.isArray(records)) {
        records = [records];
      }
      _ref = records.slice(0);
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        record = _ref[_i];
        record.off('all', this.recordEvent);
        delete this.cids[record.getCID()];
        if (record.getID()) {
          delete this.ids[record.getID()];
        }
        index = this.records.indexOf(record);
        this.records.splice(index, 1);
        changes.push({
          name: record.getCID(),
          type: 'remove',
          object: this,
          value: record
        });
      }
      this.trigger('observe', changes);
      return true;
    };

    Collection.prototype.reset = function() {
      this.remove(this.records);
      this.ids = {};
      this.cids = {};
      this.trigger('reset');
      return this.trigger('observe', []);
    };

    Collection.prototype.replace = function(records) {
      this.reset();
      return this.add(records);
    };

    Collection.prototype.observe = function(callback) {
      return this.on('observe', callback);
    };

    Collection.prototype.unobserve = function(callback) {
      return this.off('observe', callback);
    };

    Collection.prototype.change = function(cb) {
      if (typeof cb === 'function') {
        return this.on('change', cb);
      } else {
        return this.trigger.apply(this, ['change'].concat(__slice.call(arguments)));
      }
    };

    Collection.prototype.toJSON = function() {
      return this.records;
    };

    Collection.prototype.recordEvent = function(event, args, record) {
      return this.trigger("record." + event, record, args);
    };

    Collection.prototype.shouldPreload = function() {
      return this.options.preload && this.empty() && !this.request;
    };

    Collection.prototype.isBase = function() {
      return this.model.collection === this;
    };

    Collection.prototype.asyncAll = function(options) {
      if (options == null) {
        options = {};
      }
      if (!(this.asyncAllRequest && this.model.uri())) {
        return;
      }
      this.request = this.asyncAllRequest.call(this.model, this.model, options.request);
      this.records.request = this.request;
      this.records.promise = this.promise = $.Deferred();
      this.request.done((function(_this) {
        return function(result) {
          if (typeof options.complete === "function") {
            options.complete(result);
          }
          _this.add(result);
          return _this.promise.resolve(_this.records);
        };
      })(this));
      return this.records;
    };

    Collection.prototype.syncFindBy = function(callback) {
      return this.records.filter(callback)[0];
    };

    Collection.prototype.asyncFindBy = function(asyncRequest) {
      var record, request;
      if (!(asyncRequest && this.model.uri())) {
        return;
      }
      record = new this.model;
      request = asyncRequest.call(this.model, record);
      record.request = request;
      record.promise = $.Deferred();
      request.done((function(_this) {
        return function(response) {
          record.set(response);
          record.promise.resolve(record);
          return _this.add(record);
        };
      })(this));
      return record;
    };

    Collection.prototype.asyncFind = function(id, options) {
      var record, request;
      if (options == null) {
        options = {};
      }
      if (!(this.asyncFindRequest && this.model.uri())) {
        return;
      }
      record = new this.model({
        id: id
      });
      request = this.asyncFindRequest.call(this.model, record, options.request);
      record.request = request;
      record.promise = $.Deferred();
      request.done((function(_this) {
        return function(response) {
          record.set(response);
          record.promise.resolve(record);
          return _this.add(record);
        };
      })(this));
      return record;
    };

    Collection.prototype.syncFind = function(id) {
      return this.ids[id] || this.cids[id];
    };

    Collection.prototype.baseSyncFind = function(id) {
      var record, _ref;
      if (!this.isBase()) {
        record = (_ref = this.model.collection) != null ? _ref.syncFind(id) : void 0;
        if (record && !this.exists(record)) {
          this.add(record);
        }
        return record;
      }
    };

    Collection.prototype.asyncAllRequest = function(model, options) {
      var defaults;
      if (options == null) {
        options = {};
      }
      defaults = {
        url: model.uri(),
        dataType: 'json',
        type: 'GET'
      };
      return $.ajax($.extend({}, defaults, options));
    };

    Collection.prototype.asyncFindRequest = function(record, options) {
      var defaults;
      if (options == null) {
        options = {};
      }
      defaults = {
        url: record.uri(),
        dataType: 'json',
        type: 'GET'
      };
      return $.ajax($.extend({}, defaults, options));
    };

    return Collection;

  })();

  module.exports = Collection;

}).call(this);

},{"events":3}],"3vot-model":[function(require,module,exports){
module.exports=require('o2RPxu');
},{}],3:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

function EventEmitter() {
  this._events = this._events || {};
  this._maxListeners = this._maxListeners || undefined;
}
module.exports = EventEmitter;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
EventEmitter.defaultMaxListeners = 10;

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function(n) {
  if (!isNumber(n) || n < 0 || isNaN(n))
    throw TypeError('n must be a positive number');
  this._maxListeners = n;
  return this;
};

EventEmitter.prototype.emit = function(type) {
  var er, handler, len, args, i, listeners;

  if (!this._events)
    this._events = {};

  // If there is no 'error' event listener then throw.
  if (type === 'error') {
    if (!this._events.error ||
        (isObject(this._events.error) && !this._events.error.length)) {
      er = arguments[1];
      if (er instanceof Error) {
        throw er; // Unhandled 'error' event
      } else {
        throw TypeError('Uncaught, unspecified "error" event.');
      }
      return false;
    }
  }

  handler = this._events[type];

  if (isUndefined(handler))
    return false;

  if (isFunction(handler)) {
    switch (arguments.length) {
      // fast cases
      case 1:
        handler.call(this);
        break;
      case 2:
        handler.call(this, arguments[1]);
        break;
      case 3:
        handler.call(this, arguments[1], arguments[2]);
        break;
      // slower
      default:
        len = arguments.length;
        args = new Array(len - 1);
        for (i = 1; i < len; i++)
          args[i - 1] = arguments[i];
        handler.apply(this, args);
    }
  } else if (isObject(handler)) {
    len = arguments.length;
    args = new Array(len - 1);
    for (i = 1; i < len; i++)
      args[i - 1] = arguments[i];

    listeners = handler.slice();
    len = listeners.length;
    for (i = 0; i < len; i++)
      listeners[i].apply(this, args);
  }

  return true;
};

EventEmitter.prototype.addListener = function(type, listener) {
  var m;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events)
    this._events = {};

  // To avoid recursion in the case that type === "newListener"! Before
  // adding it to the listeners, first emit "newListener".
  if (this._events.newListener)
    this.emit('newListener', type,
              isFunction(listener.listener) ?
              listener.listener : listener);

  if (!this._events[type])
    // Optimize the case of one listener. Don't need the extra array object.
    this._events[type] = listener;
  else if (isObject(this._events[type]))
    // If we've already got an array, just append.
    this._events[type].push(listener);
  else
    // Adding the second element, need to change to array.
    this._events[type] = [this._events[type], listener];

  // Check for listener leak
  if (isObject(this._events[type]) && !this._events[type].warned) {
    var m;
    if (!isUndefined(this._maxListeners)) {
      m = this._maxListeners;
    } else {
      m = EventEmitter.defaultMaxListeners;
    }

    if (m && m > 0 && this._events[type].length > m) {
      this._events[type].warned = true;
      console.error('(node) warning: possible EventEmitter memory ' +
                    'leak detected. %d listeners added. ' +
                    'Use emitter.setMaxListeners() to increase limit.',
                    this._events[type].length);
      console.trace();
    }
  }

  return this;
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.once = function(type, listener) {
  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  var fired = false;

  function g() {
    this.removeListener(type, g);

    if (!fired) {
      fired = true;
      listener.apply(this, arguments);
    }
  }

  g.listener = listener;
  this.on(type, g);

  return this;
};

// emits a 'removeListener' event iff the listener was removed
EventEmitter.prototype.removeListener = function(type, listener) {
  var list, position, length, i;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events || !this._events[type])
    return this;

  list = this._events[type];
  length = list.length;
  position = -1;

  if (list === listener ||
      (isFunction(list.listener) && list.listener === listener)) {
    delete this._events[type];
    if (this._events.removeListener)
      this.emit('removeListener', type, listener);

  } else if (isObject(list)) {
    for (i = length; i-- > 0;) {
      if (list[i] === listener ||
          (list[i].listener && list[i].listener === listener)) {
        position = i;
        break;
      }
    }

    if (position < 0)
      return this;

    if (list.length === 1) {
      list.length = 0;
      delete this._events[type];
    } else {
      list.splice(position, 1);
    }

    if (this._events.removeListener)
      this.emit('removeListener', type, listener);
  }

  return this;
};

EventEmitter.prototype.removeAllListeners = function(type) {
  var key, listeners;

  if (!this._events)
    return this;

  // not listening for removeListener, no need to emit
  if (!this._events.removeListener) {
    if (arguments.length === 0)
      this._events = {};
    else if (this._events[type])
      delete this._events[type];
    return this;
  }

  // emit removeListener for all listeners on all events
  if (arguments.length === 0) {
    for (key in this._events) {
      if (key === 'removeListener') continue;
      this.removeAllListeners(key);
    }
    this.removeAllListeners('removeListener');
    this._events = {};
    return this;
  }

  listeners = this._events[type];

  if (isFunction(listeners)) {
    this.removeListener(type, listeners);
  } else {
    // LIFO order
    while (listeners.length)
      this.removeListener(type, listeners[listeners.length - 1]);
  }
  delete this._events[type];

  return this;
};

EventEmitter.prototype.listeners = function(type) {
  var ret;
  if (!this._events || !this._events[type])
    ret = [];
  else if (isFunction(this._events[type]))
    ret = [this._events[type]];
  else
    ret = this._events[type].slice();
  return ret;
};

EventEmitter.listenerCount = function(emitter, type) {
  var ret;
  if (!emitter._events || !emitter._events[type])
    ret = 0;
  else if (isFunction(emitter._events[type]))
    ret = 1;
  else
    ret = emitter._events[type].length;
  return ret;
};

function isFunction(arg) {
  return typeof arg === 'function';
}

function isNumber(arg) {
  return typeof arg === 'number';
}

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}

function isUndefined(arg) {
  return arg === void 0;
}

},{}]},{},["o2RPxu"])