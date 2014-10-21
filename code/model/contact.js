var _3Model = require("clay-model")
var Ajax = require("clay-model-vfr");

Contact = _3Model.setup("Case", ["Name"]);
Contact.ajax = Ajax;

module.exports= Contact;