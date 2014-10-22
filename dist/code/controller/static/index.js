var domify = require("domify");

var Layout = require("./layout");

function Static(view, name){
	if(!name) name = "";
	this.el = domify( Layout(name) );
	
	
	this.el.querySelector(".view-body").innerHTML = view();
}

module.exports = Static;