(function() {
  var Events, Model, Module, _3Model;

  Events = require("./events");

  Model = require("./model_ajaxless");

  Module = require("./module");

  _3Model = this._3Model = {};

  _3Model.Events = Events;

  _3Model.Module = Module;

  _3Model.Model = Model;

  _3Model.isBlank = Model.isBlank;

  Module.extend.call(_3Model, Events);

  _3Model.Class = Module;

  module.exports = _3Model;

}).call(this);
