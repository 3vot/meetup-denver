
var test = require('tape');
var Visualforce = require("./mock/visualforce");
var VisualforceRemoting = require("../");

VisualforceRemoting.Visualforce = Visualforce;


test("should respond ok with no params", function(t){
	t.plan(1);

  Visualforce.nextReponse = function(method, params, callback){
    return callback("{}");
  }

  var send = VisualforceRemoting("controller.method");
  send()
  .then( function(result){ t.deepEqual(result, {} );  } )
  .fail( function(err) { t.equal( null, err ) } )

});


test("should respond ok with params", function(t){
  t.plan(3);

  Visualforce.nextReponse = function(method, params, callback){
    t.equal(params[0],"test")
    t.equal(params[1],5)
    return callback("{}");
  }

  var send = VisualforceRemoting("controller.method");
  send("test", 5)
  .then( function(result){ t.deepEqual(result, {} );  } )
  .fail( function(err) { t.equal( null, err ) } )

});

test("should respond ok with params and options", function(t){
  t.plan(3);

  Visualforce.nextReponse = function(method, params, callback, options){
    t.equal(options.escape,false)
    t.equal(params[1],5)
    return callback("{}");
  }

  var send = VisualforceRemoting("controller.method", { escape: false });
  send("test", 5)
  .then( function(result){ t.deepEqual(result, {} );  } )
  .fail( function(err) { t.equal( null, err ) } )

});


test("should respond null, ok to be null", function(t){
  t.plan(1);

  Visualforce.nextReponse = function(method, params, callback){
    return callback();
  }

  var send = VisualforceRemoting("controller.method",{}, true);
  send("test", 5)
  .then( function(result){ t.equal(result, undefined );  } )
  .fail( function(err) { t.equal( null, err ) } )
});

test("should respond null, not ok to be null", function(t){
  t.plan(1);

  Visualforce.nextReponse = function(method, params, callback){
    return callback();
  }

  var send = VisualforceRemoting("controller.method");
  send("test", 5)
  .fail( function(err) { t.notEqual( null, err ) } )
});

test("should respond error", function(t){
  t.plan(1);

  Visualforce.nextReponse = function(method, params, callback){
    return callback([{errorCode: "ANY_ERROR", message: "Just and error"}]);
  }

  var send = VisualforceRemoting("controller.method");
  send("test", 5)
  .fail( function(err) { t.equal( "ANY_ERROR" , err[0].errorCode ) } )


});
