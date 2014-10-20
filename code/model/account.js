var _3Model = require("clay-model")
var Ajax = require("clay-model-vfr");

Account = _3Model.setup("Account", ["Name","Type"]);
Account.ajax = Ajax;

Account.getTypes = function(){
	var types = [];
	var accounts = Account.all();
	for (var i = accounts.length - 1; i >= 0; i--) {
		var account = accounts[i]
		if( account.Type && types.indexOf( account.Type ) == -1 ) types.push( account.Type );
	};

	return types;
}

module.exports= Account