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
	var target = e.target;
	if( !target.classList.contains("filter-item") ) target = target.parentNode
	if( !target.classList.contains("filter-item") ) return false
	
	if(target.classList.contains("active")){
		e.target.classList.remove("active");
		this.removeFilter( e.target.dataset.type );
	}
	else{
		e.target.classList.add("active");
		this.addFilter( e.target.dataset.type );
	}

	this.object.trigger("FILTER")
}

List.prototype.addFilter = function(value){
	if(!this.object.filters) this.object.filters = [];
	this.object.filters.push( { type: this.type, value: value  } )
}

List.prototype.removeFilter = function(value){
	var filters = this.object.filters;
	for (var i = filters.length - 1; i >= 0; i--) {
		var filter = filters[i];
		if(filter.type == this.type && filter.value == value) this.object.filters.splice(i, 1);
	};
}


module.exports = List;