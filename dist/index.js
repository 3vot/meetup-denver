(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

function EventEmitter() {
  this._events = this._events || {};
  this._maxListeners = this._maxListeners || undefined;
}
module.exports = EventEmitter;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
EventEmitter.defaultMaxListeners = 10;

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function(n) {
  if (!isNumber(n) || n < 0 || isNaN(n))
    throw TypeError('n must be a positive number');
  this._maxListeners = n;
  return this;
};

EventEmitter.prototype.emit = function(type) {
  var er, handler, len, args, i, listeners;

  if (!this._events)
    this._events = {};

  // If there is no 'error' event listener then throw.
  if (type === 'error') {
    if (!this._events.error ||
        (isObject(this._events.error) && !this._events.error.length)) {
      er = arguments[1];
      if (er instanceof Error) {
        throw er; // Unhandled 'error' event
      }
      throw TypeError('Uncaught, unspecified "error" event.');
    }
  }

  handler = this._events[type];

  if (isUndefined(handler))
    return false;

  if (isFunction(handler)) {
    switch (arguments.length) {
      // fast cases
      case 1:
        handler.call(this);
        break;
      case 2:
        handler.call(this, arguments[1]);
        break;
      case 3:
        handler.call(this, arguments[1], arguments[2]);
        break;
      // slower
      default:
        len = arguments.length;
        args = new Array(len - 1);
        for (i = 1; i < len; i++)
          args[i - 1] = arguments[i];
        handler.apply(this, args);
    }
  } else if (isObject(handler)) {
    len = arguments.length;
    args = new Array(len - 1);
    for (i = 1; i < len; i++)
      args[i - 1] = arguments[i];

    listeners = handler.slice();
    len = listeners.length;
    for (i = 0; i < len; i++)
      listeners[i].apply(this, args);
  }

  return true;
};

EventEmitter.prototype.addListener = function(type, listener) {
  var m;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events)
    this._events = {};

  // To avoid recursion in the case that type === "newListener"! Before
  // adding it to the listeners, first emit "newListener".
  if (this._events.newListener)
    this.emit('newListener', type,
              isFunction(listener.listener) ?
              listener.listener : listener);

  if (!this._events[type])
    // Optimize the case of one listener. Don't need the extra array object.
    this._events[type] = listener;
  else if (isObject(this._events[type]))
    // If we've already got an array, just append.
    this._events[type].push(listener);
  else
    // Adding the second element, need to change to array.
    this._events[type] = [this._events[type], listener];

  // Check for listener leak
  if (isObject(this._events[type]) && !this._events[type].warned) {
    var m;
    if (!isUndefined(this._maxListeners)) {
      m = this._maxListeners;
    } else {
      m = EventEmitter.defaultMaxListeners;
    }

    if (m && m > 0 && this._events[type].length > m) {
      this._events[type].warned = true;
      console.error('(node) warning: possible EventEmitter memory ' +
                    'leak detected. %d listeners added. ' +
                    'Use emitter.setMaxListeners() to increase limit.',
                    this._events[type].length);
      if (typeof console.trace === 'function') {
        // not supported in IE 10
        console.trace();
      }
    }
  }

  return this;
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.once = function(type, listener) {
  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  var fired = false;

  function g() {
    this.removeListener(type, g);

    if (!fired) {
      fired = true;
      listener.apply(this, arguments);
    }
  }

  g.listener = listener;
  this.on(type, g);

  return this;
};

// emits a 'removeListener' event iff the listener was removed
EventEmitter.prototype.removeListener = function(type, listener) {
  var list, position, length, i;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events || !this._events[type])
    return this;

  list = this._events[type];
  length = list.length;
  position = -1;

  if (list === listener ||
      (isFunction(list.listener) && list.listener === listener)) {
    delete this._events[type];
    if (this._events.removeListener)
      this.emit('removeListener', type, listener);

  } else if (isObject(list)) {
    for (i = length; i-- > 0;) {
      if (list[i] === listener ||
          (list[i].listener && list[i].listener === listener)) {
        position = i;
        break;
      }
    }

    if (position < 0)
      return this;

    if (list.length === 1) {
      list.length = 0;
      delete this._events[type];
    } else {
      list.splice(position, 1);
    }

    if (this._events.removeListener)
      this.emit('removeListener', type, listener);
  }

  return this;
};

EventEmitter.prototype.removeAllListeners = function(type) {
  var key, listeners;

  if (!this._events)
    return this;

  // not listening for removeListener, no need to emit
  if (!this._events.removeListener) {
    if (arguments.length === 0)
      this._events = {};
    else if (this._events[type])
      delete this._events[type];
    return this;
  }

  // emit removeListener for all listeners on all events
  if (arguments.length === 0) {
    for (key in this._events) {
      if (key === 'removeListener') continue;
      this.removeAllListeners(key);
    }
    this.removeAllListeners('removeListener');
    this._events = {};
    return this;
  }

  listeners = this._events[type];

  if (isFunction(listeners)) {
    this.removeListener(type, listeners);
  } else {
    // LIFO order
    while (listeners.length)
      this.removeListener(type, listeners[listeners.length - 1]);
  }
  delete this._events[type];

  return this;
};

EventEmitter.prototype.listeners = function(type) {
  var ret;
  if (!this._events || !this._events[type])
    ret = [];
  else if (isFunction(this._events[type]))
    ret = [this._events[type]];
  else
    ret = this._events[type].slice();
  return ret;
};

EventEmitter.listenerCount = function(emitter, type) {
  var ret;
  if (!emitter._events || !emitter._events[type])
    ret = 0;
  else if (isFunction(emitter._events[type]))
    ret = 1;
  else
    ret = emitter._events[type].length;
  return ret;
};

function isFunction(arg) {
  return typeof arg === 'function';
}

function isNumber(arg) {
  return typeof arg === 'number';
}

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}

function isUndefined(arg) {
  return arg === void 0;
}

},{}],2:[function(require,module,exports){
var Layout = require("./layout")
var domify = require("domify")
var EventEmitter = require('events').EventEmitter;

var Menu = new EventEmitter();

var el;
	
Menu.appendTo = function(containerSelector){
	el = domify( Layout() );
	document.querySelector(containerSelector).appendChild(el);
	
	var buttons = el.querySelectorAll(".menu-btn");
	for (var i = buttons.length - 1; i >= 0; i--) buttons[i].onclick = onButtonClick
}

function onButtonClick(e){
	var target = e.currentTarget;
	while( !target.classList.contains("menu-btn")  ) target= target.parentNode;
	var type = target.dataset.type
	if(type == "nav") return Menu.emit( target.dataset.event );
}

module.exports = Menu
},{"./layout":3,"domify":13,"events":1}],3:[function(require,module,exports){
module.exports = function(__obj) {
  if (!__obj) __obj = {};
  var __out = [], __capture = function(callback) {
    var out = __out, result;
    __out = [];
    callback.call(this);
    result = __out.join('');
    __out = out;
    return __safe(result);
  }, __sanitize = function(value) {
    if (value && value.ecoSafe) {
      return value;
    } else if (typeof value !== 'undefined' && value != null) {
      return __escape(value);
    } else {
      return '';
    }
  }, __safe, __objSafe = __obj.safe, __escape = __obj.escape;
  __safe = __obj.safe = function(value) {
    if (value && value.ecoSafe) {
      return value;
    } else {
      if (!(typeof value !== 'undefined' && value != null)) value = '';
      var result = new String(value);
      result.ecoSafe = true;
      return result;
    }
  };
  if (!__escape) {
    __escape = __obj.escape = function(value) {
      return ('' + value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    };
  }
  (function() {
    (function() {
      __out.push('<div class="menu-component">\n\t\n\t<div class=" top-header">\n\t\t\t<small class="small-text"> clay for salesforce . com </small>\n\t\t\t<small style="float: right"> gitub.com/3vot </small>\n\t</div>\n\n\t\n\n\t<div class="header">\n\n\t\t<div class="header-title"><img src="{3vot}/images/clay-logo.png" alt=""></div>\n\n\t\t<!-- <div class="header-message">\n\t\t\t\n\t\t\t--------------  Welcome to CLAY  --------------\n\n\t\t</div> -->\n\n\n\t\t<div class="header-panel">\n\t\t\n\t\t\tContents\n\n\t\t</div>\n\t</div>\n\n</div>');
    
    }).call(this);
    
  }).call(__obj);
  __obj.safe = __objSafe, __obj.escape = __escape;
  return __out.join('');
}
},{}],4:[function(require,module,exports){
var domify = require("domify");

var Layout = require("./layout");

function Static(view, name){
	if(!name) name = "";
	this.el = domify( Layout(name) );
	
	
	var body = this.el.querySelector(".view-body").innerHTML = view();
}

module.exports = Static;
},{"./layout":5,"domify":13}],5:[function(require,module,exports){
module.exports = function(__obj) {
  if (!__obj) __obj = {};
  var __out = [], __capture = function(callback) {
    var out = __out, result;
    __out = [];
    callback.call(this);
    result = __out.join('');
    __out = out;
    return __safe(result);
  }, __sanitize = function(value) {
    if (value && value.ecoSafe) {
      return value;
    } else if (typeof value !== 'undefined' && value != null) {
      return __escape(value);
    } else {
      return '';
    }
  }, __safe, __objSafe = __obj.safe, __escape = __obj.escape;
  __safe = __obj.safe = function(value) {
    if (value && value.ecoSafe) {
      return value;
    } else {
      if (!(typeof value !== 'undefined' && value != null)) value = '';
      var result = new String(value);
      result.ecoSafe = true;
      return result;
    }
  };
  if (!__escape) {
    __escape = __obj.escape = function(value) {
      return ('' + value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    };
  }
  (function() {
    (function() {
      __out.push('\n<div class="view ');
    
      __out.push(__sanitize(this));
    
      __out.push('">\n\t\n\n\t<div class="view-body">\n\t\t\n\t\t\n\t</div>\n\n\n</div>');
    
    }).call(this);
    
  }).call(__obj);
  __obj.safe = __objSafe, __obj.escape = __escape;
  return __out.join('');
}
},{}],6:[function(require,module,exports){
var Size = require("element-size")
var MenuController = require("../controller/menu")
var StaticController = require("../controller/static");

var views = [];

var leftBorder, rightBorder, bottomBorder, container, topBorder, currentController, viewportWidth, viewportHeight;

var currentControllerIndex = 0;
var controllers = {};
var controllersKeys = []

var staticControllerViews = {
  home: require("../staticViews/home"),
  dreamforce: require("../staticViews/dreamforce"),
  speed: require("../staticViews/speed"),
  slow: require("../staticViews/slow"),
  clay: require("../staticViews/clay"),
}

var LayoutManager = {}

LayoutManager.register = function(containerSelector){

	container = document.querySelector(containerSelector);
	window.container = container;
  container.onclick = function(e){
    if(e.target.dataset.event == "next"){
      var nextController = controllers[ controllersKeys[++currentControllerIndex] ]
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
},{"../controller/menu":2,"../controller/static":4,"../staticViews/clay":7,"../staticViews/dreamforce":8,"../staticViews/home":9,"../staticViews/slow":10,"../staticViews/speed":11,"element-size":14}],7:[function(require,module,exports){
module.exports = function(__obj) {
  if (!__obj) __obj = {};
  var __out = [], __capture = function(callback) {
    var out = __out, result;
    __out = [];
    callback.call(this);
    result = __out.join('');
    __out = out;
    return __safe(result);
  }, __sanitize = function(value) {
    if (value && value.ecoSafe) {
      return value;
    } else if (typeof value !== 'undefined' && value != null) {
      return __escape(value);
    } else {
      return '';
    }
  }, __safe, __objSafe = __obj.safe, __escape = __obj.escape;
  __safe = __obj.safe = function(value) {
    if (value && value.ecoSafe) {
      return value;
    } else {
      if (!(typeof value !== 'undefined' && value != null)) value = '';
      var result = new String(value);
      result.ecoSafe = true;
      return result;
    }
  };
  if (!__escape) {
    __escape = __obj.escape = function(value) {
      return ('' + value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    };
  }
  (function() {
    (function() {
      __out.push('<div class="row-block row-block-head" >\n\t<div  class="row-block-title"><span class="text-clay">Clay</span> for Salesforce.com</div>\n\t<blockquote class="row-block-text">Available in App Exchange</blockquote>\n</div>\n\n<div class="row-block row-block__blue">\n\t<div  class="row-block-title"> SPEED is our motivation</div>\n\t<div class="row-block-text row-block-text__large">Clay is a Development Tool to build Apps 10X Faster</div>\n\t<div class="padding-end-100"></div>\n</div>\n\n<div class="row-block row-block">\n\t<div  class="row-block-title"> It\'s based on components </div>\n\t<div class="row-block-text row-block-text__large"><span class="text-clay">But it\'s not a Framework</span>, is larger than that</div>\n\t<div class="row-block-text row-block-text__large">an open source architecture</div>\n\t<div class="row-block-text row-block-text__large">where you can build your framework</div>\n\t<div class="padding-end-100"></div>\n</div>\n\n<div class="row-block row-block__purple">\n\t<div  class="row-block-title"> Ordered and Instant Production Release</div>\n\t<div class="padding-end-100"></div>\n</div>\n\n<div class="navigation-block">\n\t<a data-event="back" class="btn btn-lg pull-left btn-default btn-block">Go Back</a>\n\t<a data-event="next" class="btn btn-lg pull-right btn-default btn-block">Continue</a>\n</div>\n');
    
    }).call(this);
    
  }).call(__obj);
  __obj.safe = __objSafe, __obj.escape = __escape;
  return __out.join('');
}
},{}],8:[function(require,module,exports){
module.exports = function(__obj) {
  if (!__obj) __obj = {};
  var __out = [], __capture = function(callback) {
    var out = __out, result;
    __out = [];
    callback.call(this);
    result = __out.join('');
    __out = out;
    return __safe(result);
  }, __sanitize = function(value) {
    if (value && value.ecoSafe) {
      return value;
    } else if (typeof value !== 'undefined' && value != null) {
      return __escape(value);
    } else {
      return '';
    }
  }, __safe, __objSafe = __obj.safe, __escape = __obj.escape;
  __safe = __obj.safe = function(value) {
    if (value && value.ecoSafe) {
      return value;
    } else {
      if (!(typeof value !== 'undefined' && value != null)) value = '';
      var result = new String(value);
      result.ecoSafe = true;
      return result;
    }
  };
  if (!__escape) {
    __escape = __obj.escape = function(value) {
      return ('' + value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    };
  }
  (function() {
    (function() {
      __out.push('<div class="row-block-head  row-block text-white text-shadow" >\n\t<div  class="row-block-title">Dreamforce Recap</div>\n\t<blockquote class="row-block-text">Secret to digital success: Speed and Javascript</blockquote>\n</div>\n\n\n<div class="row-block row-block__blue">\n\t<div  class="row-block-title"> "Move fast!</div>\n\t<div class="row-block-text row-block-text__large">Those taking too long to consider things, will find themselves left behind"</div>\n\t<div class="row-block-text row-block-text__large"><i><small>Jeroen Tas, Phillips</small></i></div>\n\t<!-- <div class="padding-end-200"></div> -->\n</div>\n\n<div class="row-block row-block__purple">\n\t<div class="row-block-title">It\'s not how great your apps is</div>\n\t<div class="row-block-text row-block-text__large">is how fast you can make it better</div>\n\t<div class="row-block-text row-block-text__large "><i><small>Adam Seligman, Salesforce Developer</small></i></div>\n\t<!-- <div class="padding-end-200"></div> -->\n\n</div><\n\n<div class="row-block">\n\t<div  class="row-block-title"> Best apps are updated weekly!</div>\n\t<div class="row-block-text row-block-text__large">Tip: Increase iterations, decrease cycle times  </div>\n\t<div class="row-block-title"><a class="btn btn-warning btn-lg">Click to preview</a> <a class="btn btn-success btn-lg">Click to deploy button</a></div>\n\t<!-- <div class="padding-end-200"></div> -->\n</div>\n\n\n<div class="row-block row-block__blue">\n\t<div class="row-block-title">You don’t have to be a software company to build apps</div>\n\t <div class="row-block-text row-block-text__large"><i><small>Mark Benioff, Salesforce</small></i></div>\n\t<div class="padding-end-100"></div>\n</div>\n\n<div class="row-block row-block__purple">\n\t<div  class="row-block-title">Visualforce Lightning</div>\n\t<div class="row-block-text row-block-text__large">A Javascript Component Framework for Salesforce.com</div>\n\t<div class="padding-end-100"></div>\n</div>\n\n<div class="navigation-block">\n\t\t\t<a data-event="back" class="btn btn-lg pull-left btn-default btn-block">Go Back</a>\n\n\t\t<a data-event="next" class="btn btn-lg pull-right btn-default btn-block">Continue</a>\n</div>\n');
    
    }).call(this);
    
  }).call(__obj);
  __obj.safe = __objSafe, __obj.escape = __escape;
  return __out.join('');
}
},{}],9:[function(require,module,exports){
module.exports = function(__obj) {
  if (!__obj) __obj = {};
  var __out = [], __capture = function(callback) {
    var out = __out, result;
    __out = [];
    callback.call(this);
    result = __out.join('');
    __out = out;
    return __safe(result);
  }, __sanitize = function(value) {
    if (value && value.ecoSafe) {
      return value;
    } else if (typeof value !== 'undefined' && value != null) {
      return __escape(value);
    } else {
      return '';
    }
  }, __safe, __objSafe = __obj.safe, __escape = __obj.escape;
  __safe = __obj.safe = function(value) {
    if (value && value.ecoSafe) {
      return value;
    } else {
      if (!(typeof value !== 'undefined' && value != null)) value = '';
      var result = new String(value);
      result.ecoSafe = true;
      return result;
    }
  };
  if (!__escape) {
    __escape = __obj.escape = function(value) {
      return ('' + value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    };
  }
  (function() {
    (function() {
      __out.push('\n<div class="row-block-head row-block text-white text-shadow" >\n\n\t<div class="row-block-title"><p>Building Salesforce Apps Fast</p></div>\n\n\t<blockquote class="row-block-text">The whole Catholic Church Organization just ran a disruptive conference to talk about adapting to changes</blockquote>\n\t\n</div>\n\n<div class="row-block row-block__blue">\n\t<div class="row-block-title">Table of Contents</div>\n\n\t<div class=" row">\n\t\t<ul class="col-md-8 col-md-offset-2 text-list" >\n\t\t\t\n\t\t\t<li> The importance of building amazing UI\'s, or Apps </li>\n\n\t\t\t<li> Dreamforce Recap </li>\n\n\t\t\t<li> The need for Speed </li>\n\t\t\t\n\t\t\t<li> What makes you Slow </li>\n\n\t\t\t<li> Steps to become fast </li>\n\n\t\t\t<li> Building an App Live </li>\n\n\t\t\t<li> Q & A - In Presentation </li>\n\n\t\t\t<li> Extended Q & A - After Presentation</li>\n\n\t\t\t<li> Private Q & A - Thursday October 24 </li>\n\n\t\t</ul>\n\t</div>\t\n</div>\n\n<div class="navigation-block">\n\t\t<a data-event="next" class="btn btn-default btn-lg btn-block ">Start Here</a>\n</div>\n\n');
    
    }).call(this);
    
  }).call(__obj);
  __obj.safe = __objSafe, __obj.escape = __escape;
  return __out.join('');
}
},{}],10:[function(require,module,exports){
module.exports = function(__obj) {
  if (!__obj) __obj = {};
  var __out = [], __capture = function(callback) {
    var out = __out, result;
    __out = [];
    callback.call(this);
    result = __out.join('');
    __out = out;
    return __safe(result);
  }, __sanitize = function(value) {
    if (value && value.ecoSafe) {
      return value;
    } else if (typeof value !== 'undefined' && value != null) {
      return __escape(value);
    } else {
      return '';
    }
  }, __safe, __objSafe = __obj.safe, __escape = __obj.escape;
  __safe = __obj.safe = function(value) {
    if (value && value.ecoSafe) {
      return value;
    } else {
      if (!(typeof value !== 'undefined' && value != null)) value = '';
      var result = new String(value);
      result.ecoSafe = true;
      return result;
    }
  };
  if (!__escape) {
    __escape = __obj.escape = function(value) {
      return ('' + value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    };
  }
  (function() {
    (function() {
      __out.push('<div class="row-block row-block-head" >\n\t\n\t<div  class="row-block-title">What makes you slow?</div>\n\n\t<blockquote class="row-block-text">Let\'s identify what\'s dragging us!</blockquote>\n\t<div class="padding-end-100"></div>\n\n</div>\n\n<div class="row-block row-block__blue" >\n\n\t<div class="row-block-title">Developing from a Browser</div>\n\t<div class="row-block-text">Server Side Compile</div>\n\t<div class="padding-end-100"></div>\n\n</div>\n\n<div class="row-block row-block" >\n\n\t<div class="row-block-title">Isolation from the World Community</div>\n\t<div class="row-block-text"> - No change - No Innovation</div>\n\n\t<div class="padding-end-100"></div>\n\n</div>\n\n<div class="row-block row-block__purple" >\n\n\t<div class="row-block-title">Lack of Answers, Tools & Support for Developers</div>\n\n\t<div class="padding-end-50"></div>\n\n</div>\n\n<div class="row-block row-block__blue" >\n\n\t<div class="row-block-title">Proprietary Technology & Frameworks</div>\n\t<div class="row-block-text"> - Waiting for Changes</div>\n</div>\n\n<div class="row-block row-block__" >\n\n\t<div class="row-block-title"> Scripts & Development Process</div>\n\t<div class="row-block-text"> Working outside your core</div>\n\t<div class="padding-end-100"></div>\n\n</div>\n\n<div class="row-block row-block__purple" >\n\n\t<div class="row-block-title"> Team Size and Team Management</div>\n\t<div class="row-block-text"> Not being able to outsource properly</div>\n\n\t<div class="padding-end-100"></div>\n\n</div>\n\n<div class="row-block row-block__blue" >\n\n\t<div class="row-block-title">Spaghetti Code</div>\n\n\t<div class="padding-end-100"></div>\n\n</div>\n\n<div class="navigation-block">\n\t\t\t<a data-event="back" class="btn btn-lg pull-left btn-default btn-block">Go Back</a>\n\n\t\t<a data-event="next" class="btn btn-lg pull-right btn-default btn-block">Continue</a>\n</div>');
    
    }).call(this);
    
  }).call(__obj);
  __obj.safe = __objSafe, __obj.escape = __escape;
  return __out.join('');
}
},{}],11:[function(require,module,exports){
module.exports = function(__obj) {
  if (!__obj) __obj = {};
  var __out = [], __capture = function(callback) {
    var out = __out, result;
    __out = [];
    callback.call(this);
    result = __out.join('');
    __out = out;
    return __safe(result);
  }, __sanitize = function(value) {
    if (value && value.ecoSafe) {
      return value;
    } else if (typeof value !== 'undefined' && value != null) {
      return __escape(value);
    } else {
      return '';
    }
  }, __safe, __objSafe = __obj.safe, __escape = __obj.escape;
  __safe = __obj.safe = function(value) {
    if (value && value.ecoSafe) {
      return value;
    } else {
      if (!(typeof value !== 'undefined' && value != null)) value = '';
      var result = new String(value);
      result.ecoSafe = true;
      return result;
    }
  };
  if (!__escape) {
    __escape = __obj.escape = function(value) {
      return ('' + value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    };
  }
  (function() {
    (function() {
      __out.push('<div class="row-block row-block-head" >\n\n\t<div class="container">\n\t\t<div  class="row-block-title">What makes you faster?</div>\n\n\t<blockquote class="row-block-text">Faster as an Organization, not only as a developer!</blockquote>\n\n \t<div class="row-block-text row-block-text__large"><i>What\'s the Goal?</i></div>\n \t<div class="padding-end-50"></div>\n\t</div>\n\n\t\n\n</div>\n\n<div class="row-block row-block__purple">\n\t<div class="row-block-title">Build and Release an App in a week</div>\n\t<div class="row-block-text"> Update and Release in minutes</div>\n\t<div class="padding-end-100"></div>\n</div>\n\n<div class="row-block row-block__blue" >\n\n\t<div class="row-block-title">Code Structure and Architecture</div>\n\t<div class="row-block-text">Highly Engineered</div>\n\t<div class="padding-end-100"></div>\n</div>\n\n<div class="row-block " >\n\n\t<div class="row-block-title">Build in terms of isolated Components</div>\n\t <div class="row-block-text">Parts Communicate via events</div>\n\n\t<div class="row-block-text"> Quickly reuse Apps and Components</div>\n\n\t<div class="padding-end-100"></div>\n\n</div>\n\n<div class="row-block row-block__blue" >\n\t<div class="row-block-title"> Developer Tools</div>\n\n\t<div class="row-block-text"> Local Development with your preferred tools</div>\n\n\t<div class="row-block-text"> One Click URL Preview </div>\n\n\t<div class="row-block-text"> One Click Production Release</div>\n\n\t<div class="padding-end-100"></div>\n</div>\n\n<div class="row-block row-block__purple" >\n\t<div class="row-block-title"> Standardization and Automation</div>\n\t<div class="row-block-text">All apps are the same species </div>\n\t<div class="row-block-text">All apps are created equal</div>\n\t<div class="row-block-text">All apps are updated equal</div>\n\t<div class="row-block-text">Each app is unique</div>\n\t<div class="padding-end-50"></div>\n\n</div>\n\n<div class="navigation-block">\n\t\t\t<a data-event="back" class="btn btn-lg pull-left btn-defaul btn-block">Go Back</a>\n\n\t\t<a data-event="next" class="btn btn-lg pull-right btn-default btn-block">Continue</a>\n</div>');
    
    }).call(this);
    
  }).call(__obj);
  __obj.safe = __objSafe, __obj.escape = __escape;
  return __out.join('');
}
},{}],12:[function(require,module,exports){
var LayoutManager = require("./code/managers/layout");
var MenuController = require("./code/controller/menu")

LayoutManager.register(".slide-container");

MenuController.appendTo("._3vot");

},{"./code/controller/menu":2,"./code/managers/layout":6}],13:[function(require,module,exports){

/**
 * Expose `parse`.
 */

module.exports = parse;

/**
 * Tests for browser support.
 */

var div = document.createElement('div');
// Setup
div.innerHTML = '  <link/><table></table><a href="/a">a</a><input type="checkbox"/>';
// Make sure that link elements get serialized correctly by innerHTML
// This requires a wrapper element in IE
var innerHTMLBug = !div.getElementsByTagName('link').length;
div = undefined;

/**
 * Wrap map from jquery.
 */

var map = {
  legend: [1, '<fieldset>', '</fieldset>'],
  tr: [2, '<table><tbody>', '</tbody></table>'],
  col: [2, '<table><tbody></tbody><colgroup>', '</colgroup></table>'],
  // for script/link/style tags to work in IE6-8, you have to wrap
  // in a div with a non-whitespace character in front, ha!
  _default: innerHTMLBug ? [1, 'X<div>', '</div>'] : [0, '', '']
};

map.td =
map.th = [3, '<table><tbody><tr>', '</tr></tbody></table>'];

map.option =
map.optgroup = [1, '<select multiple="multiple">', '</select>'];

map.thead =
map.tbody =
map.colgroup =
map.caption =
map.tfoot = [1, '<table>', '</table>'];

map.text =
map.circle =
map.ellipse =
map.line =
map.path =
map.polygon =
map.polyline =
map.rect = [1, '<svg xmlns="http://www.w3.org/2000/svg" version="1.1">','</svg>'];

/**
 * Parse `html` and return a DOM Node instance, which could be a TextNode,
 * HTML DOM Node of some kind (<div> for example), or a DocumentFragment
 * instance, depending on the contents of the `html` string.
 *
 * @param {String} html - HTML string to "domify"
 * @param {Document} doc - The `document` instance to create the Node for
 * @return {DOMNode} the TextNode, DOM Node, or DocumentFragment instance
 * @api private
 */

function parse(html, doc) {
  if ('string' != typeof html) throw new TypeError('String expected');

  // default to the global `document` object
  if (!doc) doc = document;

  // tag name
  var m = /<([\w:]+)/.exec(html);
  if (!m) return doc.createTextNode(html);

  html = html.replace(/^\s+|\s+$/g, ''); // Remove leading/trailing whitespace

  var tag = m[1];

  // body support
  if (tag == 'body') {
    var el = doc.createElement('html');
    el.innerHTML = html;
    return el.removeChild(el.lastChild);
  }

  // wrap map
  var wrap = map[tag] || map._default;
  var depth = wrap[0];
  var prefix = wrap[1];
  var suffix = wrap[2];
  var el = doc.createElement('div');
  el.innerHTML = prefix + html + suffix;
  while (depth--) el = el.lastChild;

  // one element
  if (el.firstChild == el.lastChild) {
    return el.removeChild(el.firstChild);
  }

  // several elements
  var fragment = doc.createDocumentFragment();
  while (el.firstChild) {
    fragment.appendChild(el.removeChild(el.firstChild));
  }

  return fragment;
}

},{}],14:[function(require,module,exports){
module.exports = getSize

function getSize(element) {
  // Handle cases where the element is not already
  // attached to the DOM by briefly appending it
  // to document.body, and removing it again later.
  if (element === window || element === document.body) {
    return [window.innerWidth, window.innerHeight]
  }

  if (!element.parentNode) {
    var temporary = true
    document.body.appendChild(element)
  }

  var bounds = element.getBoundingClientRect()
  var styles = getComputedStyle(element)
  var height = (bounds.height|0)
    + parse(styles.getPropertyValue('margin-top'))
    + parse(styles.getPropertyValue('margin-bottom'))
  var width  = (bounds.width|0)
    + parse(styles.getPropertyValue('margin-left'))
    + parse(styles.getPropertyValue('margin-right'))

  if (temporary) {
    document.body.removeChild(element)
  }

  return [width, height]
}

function parse(prop) {
  return parseFloat(prop) || 0
}

},{}]},{},[12])