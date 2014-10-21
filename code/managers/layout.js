var Size = require("element-size")
var MenuController = require("../controller/menu")
var StaticController = require("../controller/static");

var EmbedController = require("../controller/embed")


var leftBorder, rightBorder, bottomBorder, container, topBorder, currentController, viewportWidth, viewportHeight;

var staticControllerViews = {
  home: require("../staticViews/home"),
  dreamforce: require("../staticViews/dreamforce"),
  speed: require("../staticViews/speed"),
  slow: require("../staticViews/slow"),
  clay: require("../staticViews/clay"),
}

var LayoutManager = {}

var currentControllerIndex = 0;
var controllers = {};
var controllersKeys = []
var views = [];

LayoutManager.register = function(containerSelector){

	container = document.querySelector(containerSelector);
	window.container = container;
  container.onclick = function(e){
    if(e.target.dataset.event == "next"){
      var nextController = controllers[ controllersKeys[++currentControllerIndex] ]
      LayoutManager.bringIntoView( nextController );
      document.querySelector("body").scrollTop = 0;
    
    }
    else if(e.target.dataset.event == "back"){
      var nextController = controllers[ controllersKeys[--currentControllerIndex] ]
      LayoutManager.bringIntoView( nextController );
      document.querySelector("body").scrollTop = 0;
    }
  }

  //Register Positions and Sized for Animations
	var position = Position(container); 
	leftBorder = 0;
	rightBorder = position.width;
	bottomBorder = position.height;
	topBorder = 0;

  //Register Static Controllers
  var keys = Object.keys(staticControllerViews);
  for( key in keys ){
    var key = keys[key];
    var view = staticControllerViews[ key ]
    
    var controller = new StaticController( view, key );
    LayoutManager.registerView( key , controller );
  }

  //Register Dynamic Components
<<<<<<< HEAD
  LayoutManager.registerView( "live", new LiveController("live") )

  LayoutManager.registerView( "embed", new EmbedController("embed") )


=======
>>>>>>> 035bae3486103f2fc16991c138bd2a90077e5eed
  MenuController.on("next", function(){ 
    if(currentControllerIndex == controllersKeys.length -1) return false;
    currentControllerIndex++;
    LayoutManager.bringIntoView(   );
  })

  MenuController.on("last", function(){ 
    if(currentControllerIndex == 0) return false;
    currentControllerIndex--;
    LayoutManager.bringIntoView(   );
  })

  currentControllerIndex = getPath();
  //Show Controller based on URL
  LayoutManager.bringIntoView( currentControllerIndex );

}

LayoutManager.registerView = function(key, controller){
	controllersKeys.push(key);
  controllers[key] = controller;
  
  views.push( controller );

	container.appendChild(controller.el);

  controller.el.style.left = rightBorder + 10 + "px";

  controller.el.style.display = "none";

}

LayoutManager.bringIntoView = function(){
  var controller = controllers[ controllersKeys[ currentControllerIndex ] ]

  updateHistory(currentControllerIndex)

  controller.el.style.display = "block";

  setTimeout( function(){
    if(currentController){
    currentController.el.style.opacity = 0;
    currentController.el.style.left = Position(currentController.el).width * -1;
  }

    controller.el.style.left = 0;
    controller.el.style.opacity = 1;
    currentController = controller;

  }, 10 );

  //Update URL

}


function Position(element){
  var node = element, box = {left: 0, right: 0, top: 0, bottom: 0},
      win = window, doc = node.ownerDocument,
      docElem = doc.documentElement,
      body = doc.body

  if (typeof node.getBoundingClientRect !== "undefined"){
      box = node.getBoundingClientRect()
  }

  var clientTop  = docElem.clientTop  || body.clientTop  || 0,
      clientLeft = docElem.clientLeft || body.clientLeft || 0,
      scrollTop  = win.pageYOffset || docElem.scrollTop,
      scrollLeft = win.pageXOffset || docElem.scrollLeft,
      dx = scrollLeft - clientLeft,
      dy = scrollTop - clientTop

  return {
      x: box.left + dx, left: box.left + dx,
      y: box.top + dy, top: box.top + dy,
      right: box.right + dx, bottom: box.bottom + dy,
      width: box.right - box.left,
      height: box.bottom - box.top
  }
}

function updateHistory(index){
  var history = window.history;
  if(!history) return false;
   
        return history.replaceState({}, document.title, "#" + index);
      //} else if (this.history) {
       // return history.pushState({}, document.title, this.path);
      //} else {
        //return window.location.hash = this.path;
     
}

var hashStrip = /^#*/;
function getPath(){
  var path;
  path = window.location.hash;
  path = path.replace(hashStrip, '');
  if(!parseInt(path)) return 0;
  return path;
};


module.exports = LayoutManager;