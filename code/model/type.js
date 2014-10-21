var _3Model = require("clay-model")

Type = _3Model.setup("Type", ["Name","Accounts","Color"]);

Type.buildFromAccounts = function(accounts){
	var types = [];
	var colors = ["blue","red","yellow","green"]

	for (var i = accounts.length - 1; i >= 0; i--) {
		var account = accounts[i]
		if( Type.findByAttribute("Name", account.Type) == null ){
			
			Type.create( {Name: account.Type, Color: colors.pop() } )
		}
	};

	Type.trigger("refresh");
}

module.exports= Type;