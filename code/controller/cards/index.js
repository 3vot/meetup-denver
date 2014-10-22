var domify = require("domify");
var Layout = require("./layout");
var CardItem = require("./card");

function List(container, name, object, fields, viewType, label){
	var _this = this;
	var standardFields = ["id", "name"];
	var object_name = object.className
	this.ViewType = CardItem;
	this.label = label;

	if(fields) standardFields = standardFields.concat( fields );
	if(!name) name = "selected";

	this.object = object;
	this.name = name;
	this.container = container;
	this.el = domify( Layout() );
	this.container.appendChild(this.el);

	this.el.onclick = function(e){ _this.itemClick(e) }

	object.bind("refresh", function(){ _this.render() } )

	if(object.ajax){
		object.query("select " + standardFields.join(", ") + " from " + object_name  )
		.fail( function(err){ console.log(err.stack) } ) 
	}
}

List.prototype.render = function(items){
	this.el.innerHTML = "";
	items = items || this.object.all();
	for (var i = items.length - 1; i >= 0; i--) {
		var item = items[i];
		if(this.label) item.label = this.label;
		this.el.innerHTML += this.ViewType(item);
	};
}

List.prototype.itemClick = function(e){
	var els = this.el.querySelectorAll(".list_item")
	for (var i = els.length - 1; i >= 0; i--) {
		els[i].classList.remove("active")
	};
	
	e.target.classList.add("active");

	var id = e.target.dataset.id
	var item = this.object.find(id);
	this.object.selected = item;
	this.object.trigger("SELECTED", item);
}


module.exports = List;