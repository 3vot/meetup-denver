var MenuController = require("./code/controller/menu")
MenuController.appendTo("._3vot");
MenuController.hide();


var LayoutManager = require("./code/managers/layout");
LayoutManager.register(".slide-container");



var Account = require("./code/model/Account");
var Type = require("./code/model/Type");
Account.bind("refresh", function(){
	Type.buildFromAccounts(Account.all());
})