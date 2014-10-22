var domify = require("domify");
var Layout = require("./layout");


function List(container, label, object, type){
	var _this = this;

	this.container = container;
	this.object = object;
	this.type= type;
	var items = this.object.filter(type);
	this.el = domify( Layout({label:label, items: items} ));
	this.container.appendChild(this.el);

	this.container.onclick = function(e){ _this.itemClick(e) }

};

List.prototype.itemClick = function(e){
	var target = e.currentTarget;

	if( !target.classList.contains("filter-item") ) target = target.parentNode
console.log(e)
	if( !target.classList.contains("filter-item") ) return false

		
	var els = this.el.querySelectorAll(".filter-item")
	for (var i = els.length - 1; i >= 0; i--) {
		els[i].classList.remove("active")
	};
	

	e.target.classList.add("active");


}


module.exports = List;