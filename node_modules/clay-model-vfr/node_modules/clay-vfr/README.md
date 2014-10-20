#Visualforce Remoting for use in any Javascript Project
Inspiration and Code from [https://github.com/noeticpenguin/ngForce](ng-force)

## Install
npm install clay-vfr

### Dependencies
Uses KEW, which is a lightweight implementation of Q, Javascript Promises.

Written NODEJS Style. Designed to be used by Clay, but it's real dependency is a Common JS Compiler for the browser like Browserify

### Use
var Vfr = require("clay-vfr");

Vfr.send( METHOD, OPTIONS, NULLOK )

*METHOD*: is the name of Visualforce Controller and Method like ThreevotApi.handleRest or YOUR_CONTROLLER.YOUR_METHOD. For Packages use NAMESPACE.YOUR_CONTROLLER.YOUR_METHOD

OPTIONS: Visualforce Remoting Methods, like escape. Check Visualforce Remoting Doc in the Version of the Visualforce Page.

NULLOK: Tells the system if it's ok for the response to be NULL, if not it will respond with an error

RETURNS: Vfr.send will return a function that can be called with params. This function returns a promise.

### Example
var Vfr = require("clay-vfr");
var send = Vfr.send( "Math_Controller.addNumbers");

send(1,5)
.then( function(result){ result == 6 } )
.fail( function(error){
  //Error will be in Salesforce Rest API Error [ { errorCode: "", message: "" } ]
})
