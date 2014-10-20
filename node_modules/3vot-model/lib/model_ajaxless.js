(function() {
  var Events, Model, Module, createObject, isArray, isBlank, makeArray,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    __slice = [].slice;

  Events = require("./events");

  Module = require("./module");

  Model = (function(_super) {
    __extends(Model, _super);

    Model.extend(Events);

    Model.records = [];

    Model.irecords = {};

    Model.attributes = [];

    Model.host = "";

    Model.headers = [];

    Model.configure = function() {
      var attributes, name;
      name = arguments[0], attributes = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
      this.className = name;
      this.deleteAll();
      if (attributes.length) {
        this.attributes = attributes;
      }
      this.attributes && (this.attributes = makeArray(this.attributes));
      this.attributes || (this.attributes = []);
      this.unbind();
      return this;
    };

    Model.toString = function() {
      return "" + this.className + "(" + (this.attributes.join(", ")) + ")";
    };

    Model.find = function(id) {
      var record;
      record = this.exists(id);
      if (!record) {
        throw new Error("\"" + this.className + "\" model could not find a record for the ID \"" + id + "\"");
      }
      return record;
    };

    Model.exists = function(id) {
      var _ref;
      return (_ref = this.irecords[id]) != null ? _ref.clone() : void 0;
    };

    Model.addRecord = function(record) {
      if (record.id && this.irecords[record.id]) {
        this.irecords[record.id].remove();
      }
      record.id || (record.id = record.cid);
      this.records.push(record);
      this.irecords[record.id] = record;
      return this.irecords[record.cid] = record;
    };

    Model.refresh = function(values, options) {
      var record, records, result, _i, _len;
      if (options == null) {
        options = {};
      }
      if (options.clear) {
        this.deleteAll();
      }
      records = this.fromJSON(values);
      if (!isArray(records)) {
        records = [records];
      }
      for (_i = 0, _len = records.length; _i < _len; _i++) {
        record = records[_i];
        this.addRecord(record);
      }
      this.sort();
      result = this.cloneArray(records);
      this.trigger('refresh', result, options);
      return result;
    };

    Model.select = function(callback) {
      var record, _i, _len, _ref, _results;
      _ref = this.records;
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        record = _ref[_i];
        if (callback(record)) {
          _results.push(record.clone());
        }
      }
      return _results;
    };

    Model.findByAttribute = function(name, value) {
      var record, _i, _len, _ref;
      _ref = this.records;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        record = _ref[_i];
        if (record[name] === value) {
          return record.clone();
        }
      }
      return null;
    };

    Model.findAllByAttribute = function(name, value) {
      return this.select(function(item) {
        return item[name] === value;
      });
    };

    Model.each = function(callback) {
      var record, _i, _len, _ref, _results;
      _ref = this.records;
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        record = _ref[_i];
        _results.push(callback(record.clone()));
      }
      return _results;
    };

    Model.all = function() {
      return this.cloneArray(this.records);
    };

    Model.first = function() {
      var _ref;
      return (_ref = this.records[0]) != null ? _ref.clone() : void 0;
    };

    Model.last = function() {
      var _ref;
      return (_ref = this.records[this.records.length - 1]) != null ? _ref.clone() : void 0;
    };

    Model.count = function() {
      return this.records.length;
    };

    Model.deleteAll = function() {
      this.records = [];
      return this.irecords = {};
    };

    Model.destroyAll = function(options) {
      var record, _i, _len, _ref, _results;
      _ref = this.records;
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        record = _ref[_i];
        _results.push(record.destroy(options));
      }
      return _results;
    };

    Model.update = function(id, atts, options) {
      return this.find(id).updateAttributes(atts, options);
    };

    Model.create = function(atts, options) {
      var record;
      record = new this(atts);
      return record.save(options);
    };

    Model.destroy = function(id, options) {
      return this.find(id).destroy(options);
    };

    Model.change = function(callbackOrParams) {
      if (typeof callbackOrParams === 'function') {
        return this.bind('change', callbackOrParams);
      } else {
        return this.trigger.apply(this, ['change'].concat(__slice.call(arguments)));
      }
    };

    Model.fetch = function(callbackOrParams) {
      if (typeof callbackOrParams === 'function') {
        return this.bind('fetch', callbackOrParams);
      } else {
        return this.trigger.apply(this, ['fetch'].concat(__slice.call(arguments)));
      }
    };

    Model.toJSON = function() {
      return this.records;
    };

    Model.fromJSON = function(objects) {
      var value, _i, _len, _results;
      if (!objects) {
        return;
      }
      if (typeof objects === 'string') {
        objects.replace(/\Id/g, 'id');
        objects = JSON.parse(objects);
      }
      if (isArray(objects)) {
        _results = [];
        for (_i = 0, _len = objects.length; _i < _len; _i++) {
          value = objects[_i];
          if (value.Id) {
            value.id = value.Id;
          }
          _results.push(new this(value));
        }
        return _results;
      } else {
        if (objects.Id) {
          objects.id = objects.Id;
        }
        return new this(objects);
      }
    };

    Model.fromForm = function() {
      var _ref;
      return (_ref = new this).fromForm.apply(_ref, arguments);
    };

    Model.sort = function() {
      if (this.comparator) {
        this.records.sort(this.comparator);
      }
      return this;
    };

    Model.cloneArray = function(array) {
      var value, _i, _len, _results;
      _results = [];
      for (_i = 0, _len = array.length; _i < _len; _i++) {
        value = array[_i];
        _results.push(value.clone());
      }
      return _results;
    };

    Model.idCounter = 0;

    Model.uid = function(prefix) {
      var uid;
      if (prefix == null) {
        prefix = '';
      }
      uid = prefix + this.idCounter++;
      if (this.exists(uid)) {
        uid = this.uid(prefix);
      }
      return uid;
    };

    function Model(atts) {
      Model.__super__.constructor.apply(this, arguments);
      if (atts) {
        this.load(atts);
      }
      this.cid = (atts != null ? atts.cid : void 0) || this.constructor.uid('c-');
    }

    Model.prototype.isNew = function() {
      return !this.exists();
    };

    Model.prototype.isValid = function() {
      return !this.validate();
    };

    Model.prototype.validate = function() {};

    Model.prototype.load = function(atts) {
      var key, value;
      if (atts.id) {
        this.id = atts.id;
      }
      for (key in atts) {
        value = atts[key];
        if (atts.hasOwnProperty(key) && typeof this[key] === 'function') {
          this[key](value);
        } else {
          this[key] = value;
        }
      }
      return this;
    };

    Model.prototype.get = function(attr) {
      return this[attr];
    };

    Model.prototype.set = function(attr, value) {
      return this[attr] = value;
    };

    Model.prototype.attributes = function() {
      var key, result, _i, _len, _ref;
      result = {};
      _ref = this.constructor.attributes;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        key = _ref[_i];
        if (key in this) {
          if (typeof this[key] === 'function') {
            result[key] = this[key]();
          } else {
            result[key] = this[key];
          }
        }
      }
      if (this.id) {
        result.id = this.id;
      }
      return result;
    };

    Model.prototype.eql = function(rec) {
      return !!(rec && rec.constructor === this.constructor && (rec.cid === this.cid) || (rec.id && rec.id === this.id));
    };

    Model.prototype.save = function(options) {
      var error, record;
      if (options == null) {
        options = {};
      }
      if (options.validate !== false) {
        error = this.validate();
        if (error) {
          this.trigger('error', error);
          return false;
        }
      }
      this.trigger('beforeSave', options);
      record = this.isNew() ? this.create(options) : this.update(options);
      this.stripCloneAttrs();
      this.trigger('save', options);
      return record;
    };

    Model.prototype.stripCloneAttrs = function() {
      var key, value;
      if (this.hasOwnProperty('cid')) {
        return;
      }
      for (key in this) {
        if (!__hasProp.call(this, key)) continue;
        value = this[key];
        if (this.constructor.attributes.indexOf(key) > -1) {
          delete this[key];
        }
      }
      return this;
    };

    Model.prototype.updateAttribute = function(name, value, options) {
      var atts;
      atts = {};
      atts[name] = value;
      return this.updateAttributes(atts, options);
    };

    Model.prototype.updateAttributes = function(atts, options) {
      this.load(atts);
      return this.save(options);
    };

    Model.prototype.changeID = function(id) {
      var records;
      if (id === this.id) {
        return;
      }
      records = this.constructor.irecords;
      records[id] = records[this.id];
      delete records[this.id];
      this.id = id;
      return this.save();
    };

    Model.prototype.remove = function() {
      var i, record, records, _i, _len;
      records = this.constructor.records.slice(0);
      for (i = _i = 0, _len = records.length; _i < _len; i = ++_i) {
        record = records[i];
        if (!(this.eql(record))) {
          continue;
        }
        records.splice(i, 1);
        break;
      }
      this.constructor.records = records;
      delete this.constructor.irecords[this.id];
      return delete this.constructor.irecords[this.cid];
    };

    Model.prototype.destroy = function(options) {
      if (options == null) {
        options = {};
      }
      this.trigger('beforeDestroy', options);
      this.remove();
      this.destroyed = true;
      this.trigger('destroy', options);
      this.trigger('change', 'destroy', options);
      if (this.listeningTo) {
        this.stopListening();
      }
      this.unbind();
      return this;
    };

    Model.prototype.dup = function(newRecord) {
      var atts;
      if (newRecord == null) {
        newRecord = true;
      }
      atts = this.attributes();
      if (newRecord) {
        delete atts.id;
      } else {
        atts.cid = this.cid;
      }
      return new this.constructor(atts);
    };

    Model.prototype.clone = function() {
      return createObject(this);
    };

    Model.prototype.reload = function() {
      var original;
      if (this.isNew()) {
        return this;
      }
      original = this.constructor.find(this.id);
      this.load(original.attributes());
      return original;
    };

    Model.prototype.refresh = function(data) {
      var root;
      root = this.constructor.irecords[this.id];
      root.load(data);
      this.trigger('refresh');
      return this;
    };

    Model.prototype.toJSON = function() {
      return this.attributes();
    };

    Model.prototype.toString = function() {
      return "<" + this.constructor.className + " (" + (JSON.stringify(this)) + ")>";
    };

    Model.prototype.fromForm = function(form) {
      var result;
      result = {};

      /*      
      for checkbox in $(form).find('[type=checkbox]:not([value])')
        result[checkbox.name] = $(checkbox).prop('checked')
      
      for checkbox in $(form).find('[type=checkbox][name$="[]"]')
        name = checkbox.name.replace(/\[\]$/, '')
        result[name] or= []
        result[name].push checkbox.value if $(checkbox).prop('checked')
      
      for key in $(form).serializeArray()
        result[key.name] or= key.value
       */
      return this.load(result);
    };

    Model.prototype.exists = function() {
      return this.constructor.exists(this.id);
    };

    Model.prototype.update = function(options) {
      var clone, records;
      this.trigger('beforeUpdate', options);
      records = this.constructor.irecords;
      records[this.id].load(this.attributes());
      this.constructor.sort();
      clone = records[this.id].clone();
      clone.trigger('update', options);
      clone.trigger('change', 'update', options);
      return clone;
    };

    Model.prototype.create = function(options) {
      var clone, record;
      this.trigger('beforeCreate', options);
      this.id || (this.id = this.cid);
      record = this.dup(false);
      this.constructor.addRecord(record);
      this.constructor.sort();
      clone = record.clone();
      clone.trigger('create', options);
      clone.trigger('change', 'create', options);
      return clone;
    };

    Model.prototype.bind = function(events, callback) {
      var binder, singleEvent, _fn, _i, _len, _ref;
      this.constructor.bind(events, binder = (function(_this) {
        return function(record) {
          if (record && _this.eql(record)) {
            return callback.apply(_this, arguments);
          }
        };
      })(this));
      _ref = events.split(' ');
      _fn = (function(_this) {
        return function(singleEvent) {
          var unbinder;
          return _this.constructor.bind("unbind", unbinder = function(record, event, cb) {
            if (record && _this.eql(record)) {
              if (event && event !== singleEvent) {
                return;
              }
              if (cb && cb !== callback) {
                return;
              }
              _this.constructor.unbind(singleEvent, binder);
              return _this.constructor.unbind("unbind", unbinder);
            }
          });
        };
      })(this);
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        singleEvent = _ref[_i];
        _fn(singleEvent);
      }
      return this;
    };

    Model.prototype.one = function(events, callback) {
      var handler;
      return this.bind(events, handler = (function(_this) {
        return function() {
          _this.unbind(events, handler);
          return callback.apply(_this, arguments);
        };
      })(this));
    };

    Model.prototype.trigger = function() {
      var args, _ref;
      args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
      args.splice(1, 0, this);
      return (_ref = this.constructor).trigger.apply(_ref, args);
    };

    Model.prototype.listenTo = function() {
      return Events.listenTo.apply(this, arguments);
    };

    Model.prototype.listenToOnce = function() {
      return Events.listenToOnce.apply(this, arguments);
    };

    Model.prototype.stopListening = function() {
      return Events.stopListening.apply(this, arguments);
    };

    Model.prototype.unbind = function(events, callback) {
      var event, _i, _len, _ref, _results;
      if (arguments.length === 0) {
        return this.trigger('unbind');
      } else if (events) {
        _ref = events.split(' ');
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          event = _ref[_i];
          _results.push(this.trigger('unbind', event, callback));
        }
        return _results;
      }
    };

    return Model;

  })(Module);

  Model.prototype.on = Model.prototype.bind;

  Model.prototype.off = Model.prototype.unbind;

  createObject = Object.create || function(o) {
    var Func;
    Func = function() {};
    Func.prototype = o;
    return new Func();
  };

  isArray = function(value) {
    return Object.prototype.toString.call(value) === '[object Array]';
  };

  isBlank = function(value) {
    var key;
    if (!value) {
      return true;
    }
    for (key in value) {
      return false;
    }
    return true;
  };

  makeArray = function(args) {
    return Array.prototype.slice.call(args, 0);
  };

  Model.isBlank = isBlank;

  Model.sub = function(instances, statics) {
    var Result;
    Result = (function(_super) {
      __extends(Result, _super);

      function Result() {
        return Result.__super__.constructor.apply(this, arguments);
      }

      return Result;

    })(this);
    if (instances) {
      Result.include(instances);
    }
    if (statics) {
      Result.extend(statics);
    }
    if (typeof Result.unbind === "function") {
      Result.unbind();
    }
    return Result;
  };

  Model.setup = function(name, attributes) {
    var Instance;
    if (attributes == null) {
      attributes = [];
    }
    Instance = (function(_super) {
      __extends(Instance, _super);

      function Instance() {
        return Instance.__super__.constructor.apply(this, arguments);
      }

      return Instance;

    })(this);
    Instance.configure.apply(Instance, [name].concat(__slice.call(attributes)));
    return Instance;
  };

  Model.host = "";

  if (typeof module !== "undefined" && module !== null) {
    module.exports = Model;
  }

}).call(this);
