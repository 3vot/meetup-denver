var Visualforce = {
  remoting:{
    Manager:{
      invokeAction: invokeAction
    }
  }
}

Visualforce.nextReponse = function(method, params, callback){
  return callback("{}");
}

//method, params, function, options
function invokeAction(){
  var args = Array.prototype.slice.call(arguments);
  var method = args[0];
  var params = [];
  var callback;
  var options;
  for (var i = 1; i < args.length; i++) {
    if(typeof args[i] == "function"){ callback = args[i]; }
    if(!callback) params.push( args[i] );
    else options = args[i];
  };
  
  setTimeout( function(){
    Visualforce.nextReponse(method, params, callback, options);
  }, 50 );



}


module.exports= Visualforce;