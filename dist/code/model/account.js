var _3Model = require("clay-model")
var Ajax = require("clay-model-vfr");

Account = _3Model.setup("Account", ["Name","Type","AccountSource","AnnualRevenue","BillingState","Industry"]);
Account.ajax = Ajax;

Account.filter ={}

Account.filter = function(attribute){
	var types = [];
	var accounts = Account.all();
	for (var i = accounts.length - 1; i >= 0; i--) {
		var account = accounts[i]
		if( account[attribute] && types.indexOf( account[attribute] ) == -1 ) types.push( account[attribute] );
	};

	return types;
}




module.exports= Account