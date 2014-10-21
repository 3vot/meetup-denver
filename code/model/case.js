var _3Model = require("clay-model")
var Ajax = require("clay-model-vfr");

Case = _3Model.setup("Case", ["Name","Subject","ContactId"]);
Case.ajax = Ajax;

module.exports= Case