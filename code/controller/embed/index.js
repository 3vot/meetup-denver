var domify = require("domify");



var Layout = require("./layout");


function Embed(name){
	var _this = this;
	if(!name) name = "";
	this.el = domify( Layout(name) );

}



module.exports =  Embed;