describe("Ajax", function(){
  var User;
  var jqXHR;

  beforeEach(function(){
    //_3Model.Ajax.clearQueue();

    User = _3Model.Model.setup("User", ["first", "last"]);
    User.extend(_3Ajax);
    User.extend(_3Ajax.Auto);

  });


  it("should make a singleton with Visualforce a view", function(){

    callbacks= {
      done: function(){ },
      fail: function(){ console.log(arguments); }
    }
  
    console.log(Visualforce)
    User.refresh([{first: "John", last: "Williams", id: "IDD"}]);
    User.first().first = "John2";
    User.first().last= "Williams2";
    User.first().update( { done: function(){} }  )

  });
  
});
