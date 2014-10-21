var Layout = require("./layout")
var domify = require("domify")
var EventEmitter = require('events').EventEmitter;
var Menu = new EventEmitter();
	
Menu.appendTo = function(containerSelector){

	Menu.el = domify( Layout() );
	document.querySelector(containerSelector).appendChild(Menu.el);
	
	var buttons = Menu.el.querySelectorAll(".menu-btn");
	for (var i = buttons.length - 1; i >= 0; i--) buttons[i].onclick = onButtonClick
}


Menu.hide = function(){
	Menu.el.parentNode.classList.add("compact")
}	

function onButtonClick(e){
	var target = e.currentTarget;
	while( !target.classList.contains("menu-btn")  ) target= target.parentNode;
	var type = target.dataset.type
	if(type == "nav") return Menu.emit( target.dataset.event );
}



module.exports = Menu