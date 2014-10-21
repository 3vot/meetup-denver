var domify = require("domify");

var Account = require("../../model/account");
var Case = require("../../model/case");
var Contact = require("../../model/contact");

var Layout = require("./layout");
var ListItem = require("./item");
var ListType = require("./type");

function Live(name){
	var _this = this;
	if(!name) name = "";
	this.el = domify( Layout(name) );

	this.type_list = this.el.querySelector(".type_list");
	this.type_list.onclick = function(e){ 
		if(!Account.selected) _this.typeClick(e) 
		else _this.typeSelected(e) 
	}

	this.list = this.el.querySelector(".account_list");
	this.list.onclick = function(e){ _this.itemClick(e) }


	Account.query("select Type,name, id from account order by Type desc")
	.fail( function(){ console.log(arguments[0].stack) } ) 
	.then(function(){  
		_this.renderAccounts(); 
		_this.renderTypes(); 
		_this.type_elements=	_this.type_list.querySelectorAll(".type_list .alert")
	})
	
	Account.bind("SELECTED",function(account){
		//_this.onAccountSelected(account);
	})

	Account.bind("ACCOUNT_TYPE_SELECTED",function(target){
		_this.onAccountTypeSelected(target);
	});

Live.prototype.renderAccounts = function(accounts){
	this.list.innerHTML = "";
	accounts = accounts || Account.all();

	for (var i = accounts.length - 1; i >= 0; i--) {
		var account = accounts[i];
		this.list.innerHTML += ListItem(account);
	};
	
}

Live.prototype.renderTypes = function(){
	var _this = this;

	this.type_list.innerHTML = "";

	var types = Account.getTypes();
	for (var i = types.length - 1; i >= 0; i--) {
		var type = types[i];
		this.type_list.innerHTML += ListType(type);
	};

}

Live.prototype.itemClick = function(e){
	var els = this.list.querySelectorAll(".account_list li")
	for (var i = els.length - 1; i >= 0; i--) {
		els[i].classList.remove("active")
	};
	
	e.target.classList.add("active");

	var id = e.target.dataset.id
	var account = Account.find(id);
	Account.trigger("SELECTED", account);
	Account.selected = account;

	//THIS SHOULD GO SOMEWHERE ELSE
	for (var i = this.type_elements.length - 1; i >= 0; i--) {
			var type = this.type_elements[i];
			type.classList.remove("alert-success");
			type.classList.add("alert-warning");
		};

	Case.query("select subject, id from case where accountid = '" + Account.selected.id + "'")
	.then( function(){ console.log(Case.all()) } )

	Contact.query("select name, id from contact  where accountid = '" + Account.selected.id + "'")
	.then( function(){ console.log(Contact.all()) } )

}

Live.prototype.typeClick = function(e){
	if( e.target.classList.contains("alert-success")) var toggle= true

	for (var i = this.type_elements.length - 1; i >= 0; i--) {
		this.type_elements[i].classList.remove("alert-success")
	};

	if( toggle){
		Account.currentType =null
		return this.renderAccounts();
	}

	e.target.dataset.viewing = true;
	e.target.classList.add("alert-success");	
	var type = e.target.dataset.type
	Account.currentType = type;
	var accounts = Account.select(function(account){
		if(account.Type == type) return true;
		return false
	})

	this.renderAccounts(accounts);

}

Live.prototype.typeSelected = function(e){
	e.target.classList.remove("alert-success");
	setTimeout(function(){ e.target.classList.remove("alert-success" );})
	Account.trigger("ACCOUNT_TYPE_SELECTED", e.target);	

}

Live.prototype.onAccountTypeSelected = function(target){
		setTimeout(function(){ 
			target.style.display= "block"; 
			after();
		},122)

		var els = _this.list.querySelector(".account_list li.active")
		if( Account.selected.Type !=  els.dataset.type) els.parentNode.removeChild( els );
		else els.classList.remove("active")
		
		Account.selected = null;
		
		function after(){
			for (var i = _this.type_elements.length - 1; i >= 0; i--) {
				var type = _this.type_elements[i];
				type.classList.remove("alert-warning")
				if(type.dataset.type == Account.currentType) type.classList.add("alert-success")
			};
		}

		var type = target.dataset.type;
		
		Account.selected.Type = type;
		Account.selected.save()

		target.style.display= "none";
	}
}

module.exports = Live;