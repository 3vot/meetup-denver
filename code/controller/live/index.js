var domify = require("domify");

var Account = require("../../model/account");
var Case = require("../../model/case");
var Contact = require("../../model/contact");
var Type = require("../../model/type");

var Layout = require("./layout");

var ListController = require("../list");
var FilterController = require("../filter");


var CardController = require("../cards");


function Live(name){
	var _this = this;
	if(!name) name = "";
	this.el = domify( Layout(name) );

	var accountContainer = this.el.querySelector(".account_list");
	this.accountListController = new CardController( accountContainer , "account", Account, ["Type","Industry","Description","AccountSource", "AnnualRevenue"]  );


	Account.bind("refresh",function(){


		var typeContainer = _this.el.querySelector(".type_list");
		this.typeListController = new FilterController( typeContainer , 'Types',Account, "Type"  );

		var industryContainer = _this.el.querySelector(".industry_list");
		this.industryListController = new FilterController( industryContainer ,"Industries", Account, "Industry"  );


		var contactContainer = _this.el.querySelector(".contact_list");
	//	this.contactListController = new ListController( contactContainer , "contact", Contact, [""] );

	})

	var caseContainer = this.el.querySelector(".case_list");
//	this.caseListController = new ListController( caseContainer , "case", Case, ["Subject"], "", "Subject" );

	Account.bind("FILTER",function(){

		var accounts = Account.select( filterFunction );

		function filterFunction(account){
						
		console.log(Account.filters);

			if(Account.filters.length == 0) return true;

			var result = false;
			var filters = Account.filters;
			for (var i = filters.length - 1; i >= 0; i--) {
				var filter = filters[i];
				if(account[filter.type] == filter.value) result = true;
			
			};
			return result;
		}
		_this.accountListController.render(accounts);

	})


	Account.bind("SELECTED",function(account){
		_this.onAccountSelected(account);
	})

	Contact.bind("SELECTED", function(contact){
		_this.onContactSelected(contact);
	})

	Type.bind("SELECTED",function(target){
		_this.onTypeSelected(target);
	});


Live.prototype.onAccountSelected = function(e){
	/*
	for (var i = this.type_elements.length - 1; i >= 0; i--) {
			var type = this.type_elements[i];
			type.classList.remove("alert-success");
			type.classList.add("alert-warning");
		};
	*/
	Case.destroyAll({ignoreAjax: true});
	Contact.destroyAll({ignoreAjax: true});

	Case.query("select subject, id, ContactId from case where accountid = '" + Account.selected.id + "'")
	.fail( function(e){ console.log(e.stack) } )

	Contact.query("select name, id from contact  where accountid = '" + Account.selected.id + "'")

}

Live.prototype.onContactSelected = function(contact){
	var cases = Case.findAllByAttribute("ContactId",Contact.selected.id);
	console.log(cases)
	this.caseListController.render(cases);
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

Live.prototype.onTypeSelected = function(e){
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