var Q = require("kew");


  /*
   * Kevin o'Hara released premote, a nice lib for wrapping
   * visualforce remoting calls in a promise interface. this
   * function .send() is largely a gentle refactoring of his
   * work, found in "premote" here:
   *    https://github.com/kevinohara80/premote

  /*
   * Code Implementation and idea borrowed from Kevin Poorman
   * https://github.com/noeticpenguin/ngForce
   */
  /**
   * Returns a function that, when called, invokes the js
   * remoting method specified in this call.
   * @param  {String}   remoteAction class.methodName string representing the Apex className and Method to invoke
   * @param  {Object}   options      Object containing at least the timeout and escaping options. Passed to Remoting call
   * @param  {Boolean}  nullok       Can this method return null and it be OK?
   * @param  {Object}   visualforce  Used for Testing
   * @return {Function}              Function engaged with the NG execution loop, making Visualforce remoting calls.
   */
VisualforceRemoting = function(remoteAction, options, nullok) {
  //Injection for Testing
  if(VisualforceRemoting.Visualforce) Visualforce = VisualforceRemoting.Visualforce;
  
  if (typeof Visualforce != 'object') {
    throw new Error('Visualforce is not available globally!');
  }

  if(!options || options === {} ) options = VisualforceRemoting.standardOptions;

  var namespace, controller, method;
  var Manager = Visualforce.remoting.Manager;
  var remoteActionParts = remoteAction.split('.');
  var instance = this;
  
  return callToSend;

  function callToSend(){
    var deferred = Q.defer();
    var args;
    if (arguments.length) {
      args = Array.prototype.slice.apply(arguments);
    } else {
      args = [];
    }
    args.splice(0, 0, remoteAction);
    args.push(function(result, event) {
      VisualforceRemoting.handleResultWithPromise(result, event, nullok, deferred);
    });
    if (options) {
      args.push(options);
    }
    Manager.invokeAction.apply(Manager, args);

    return deferred.promise;
  }
}

VisualforceRemoting.handleResultWithPromise = function(result, event, nullok, deferred) {
  if (result) {
    if (typeof result !== 'object') {
      result = JSON.parse(result);
    }
    if (Array.isArray(result) && result.length > 0 && result[0].message && result[0].errorCode) {
      deferred.reject(result);
    } else {
      deferred.resolve(result);
    }
  } else if (typeof nullok !== 'undefined' && nullok) {
    deferred.resolve();
  } else {
    deferred.reject({
      message: 'Null returned by RemoteAction not called with nullOk flag',
      errorCode: 'NULL_RETURN'
    });
  }
}

VisualforceRemoting.standardOptions= {
    escape: false,
    timeout: 10000
}

module.exports = VisualforceRemoting;
