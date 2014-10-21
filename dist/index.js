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
      } else {
        throw TypeError('Uncaught, unspecified "error" event.');
      }
      return false;
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
      console.trace();
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
// shim for using process in browser

var process = module.exports = {};

process.nextTick = (function () {
    var canSetImmediate = typeof window !== 'undefined'
    && window.setImmediate;
    var canPost = typeof window !== 'undefined'
    && window.postMessage && window.addEventListener
    ;

    if (canSetImmediate) {
        return function (f) { return window.setImmediate(f) };
    }

    if (canPost) {
        var queue = [];
        window.addEventListener('message', function (ev) {
            var source = ev.source;
            if ((source === window || source === null) && ev.data === 'process-tick') {
                ev.stopPropagation();
                if (queue.length > 0) {
                    var fn = queue.shift();
                    fn();
                }
            }
        }, true);

        return function nextTick(fn) {
            queue.push(fn);
            window.postMessage('process-tick', '*');
        };
    }

    return function nextTick(fn) {
        setTimeout(fn, 0);
    };
})();

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];

process.binding = function (name) {
    throw new Error('process.binding is not supported');
}

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};

},{}],3:[function(require,module,exports){
var domify = require("domify");



var Layout = require("./layout");


function Embed(name){
	var _this = this;
	if(!name) name = "";
	this.el = domify( Layout(name) );

}



module.exports =  Embed;
},{"./layout":4,"domify":35}],4:[function(require,module,exports){
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
      __out.push('<iframe src="http://3vot.com/fusion/elections_map"></iframe>');
    
    }).call(this);
    
  }).call(__obj);
  __obj.safe = __objSafe, __obj.escape = __escape;
  return __out.join('');
}
},{}],5:[function(require,module,exports){
var domify = require("domify");
var Layout = require("./layout");
var ListItem = require("./item");
var TabItem = require("./tab");

function List(container, name, object, fields, viewType, label){
	var _this = this;
	var standardFields = ["id", "name"];
	var object_name = object.className
	this.ViewType = ListItem;
	this.label = label;
	if(viewType == "tab") this.ViewType = TabItem

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
},{"./item":6,"./layout":7,"./tab":8,"domify":35}],6:[function(require,module,exports){
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
      __out.push('<li data-type="');
    
      __out.push(__sanitize(this.Type));
    
      __out.push('" class="list-group-item  list_item" data-id="');
    
      __out.push(__sanitize(this.id));
    
      __out.push('">\n\n\t');
    
      if (!this.label) {
        __out.push('\n\t\t');
        __out.push(__sanitize(this.Name));
        __out.push('\n\t');
      } else {
        __out.push('\n\t\t');
        __out.push(__sanitize(this[this.label]));
        __out.push('\n\t');
      }
    
      __out.push('\n\n</li>\n');
    
    }).call(this);
    
  }).call(__obj);
  __obj.safe = __objSafe, __obj.escape = __escape;
  return __out.join('');
}
},{}],7:[function(require,module,exports){
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
      __out.push('\t\t<ul class="list-group color-dark list">\n\t\t\t\t\n\t\t\t\t\n\n\t\t\t</ul>');
    
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
      __out.push('<div class="col-md-3">\n\t<div  class="alert alert-info list_item" data-type="');
    
      __out.push(__sanitize(this.Name));
    
      __out.push('">');
    
      __out.push(__sanitize(this.Name));
    
      __out.push('</div>\n</div>');
    
    }).call(this);
    
  }).call(__obj);
  __obj.safe = __objSafe, __obj.escape = __escape;
  return __out.join('');
}
},{}],9:[function(require,module,exports){
var domify = require("domify");

var Account = require("../../model/account");
var Case = require("../../model/case");
var Contact = require("../../model/contact");
var Type = require("../../model/type");

var Layout = require("./layout");

var ListController = require("../list");


function Live(name){
	var _this = this;
	if(!name) name = "";
	this.el = domify( Layout(name) );

	var accountContainer = this.el.querySelector(".account_list");
	this.accountListController = new ListController( accountContainer , "account", Account, ["Type"]  );

	var typeContainer = this.el.querySelector(".type_list");
	this.typeListController = new ListController( typeContainer , "type", Type, [""], "tab" );

	var contactContainer = this.el.querySelector(".contact_list");
	this.contactListController = new ListController( contactContainer , "contact", Contact, [""] );

	var caseContainer = this.el.querySelector(".case_list");
	this.caseListController = new ListController( caseContainer , "case", Case, ["Subject"], "", "Subject" );

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
},{"../../model/account":18,"../../model/case":19,"../../model/contact":20,"../../model/type":21,"../list":5,"./layout":10,"domify":35}],10:[function(require,module,exports){
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
    
      __out.push('">\n\t\n\n\t<div class="view-body">\n\t\t\n\n\t<div class="row-block-head" >\n\t<div  class="row-block-title">Live Coding</div>\n\t<blockquote class="row-block-text">Check it out!</blockquote>\n</div>\n\n<div class="row-block row-block__blue">\n\t<div  class="row-block-title padding-bottom-0 "> How are my accounts divided?</div>\n\n<div class="container">\n\n\t<div class="row type_list">\n\t\t\n\t</div>\n\n\t\t<div class="clearfix"></div>\n\t</div>\n\n</div>\n\n<div class="row-block">\n\n\t<div class="row">\n\t\t\n\t\t<div class="col-md-3  row-block row-block__blue account_list">\n\t\n\t\t</div>\n\t\t<div class="col-md-9 content">\n\t\t\n\t\t<div class="row">\n\n\t\t\t<div class="col-md-3  row-block row- contact_list">\n\t\t\t\t<h3>Contacts</h3>\n\t\t\t</div>\n\n\t\t\t<div class="col-md-6  row-block row- case_list">\n\t\t\t\t<h3>Cases</h3>\n\n\t\t\t</div>\n\n\t\t<div class="col-md-3  row-block row- case_list">\n\t\t\t\t\n\t\t\t\t<h3>Actions</h3><br/>\n\n\t\t\t\t<a class="btn btn-danger">Close</a><br/>\n\n\t\t\t\t<a class="btn btn-warning">Escalate</a><br/>\n\n\t\t\t\t<a class="btn btn-warning">Email Customer</a><br/>\n\n\t\t\t</div>\n\n\n\t\t</div>\n\n\t\t</div>\n\n\t\t<div class="clearfix"></div>\n\n\t</div>\n\n\n\t<div class="padding-end-200"></div>\n</div>\n\n\n\n<div class="row-block row-block__purple">\n\t<div  class="row-block-title"> Ordered and Instant Production Release</div>\n\t<div class="row-block-text row-block-text__large"></div>\n\t<div class="padding-end-200"></div>\n</div>\n\n<div class="navigation-block">\n\t<a data-event="back" class="btn btn-lg pull-left btn-primary">Go Back</a>\n\t<a data-event="next" class="btn btn-lg pull-right btn-primary">Continue</a>\n</div>\n\n\n\t\t\n\t</div>\n\n\n</div>');
    
    }).call(this);
    
  }).call(__obj);
  __obj.safe = __objSafe, __obj.escape = __escape;
  return __out.join('');
}
},{}],11:[function(require,module,exports){
var Layout = require("./layout")
var domify = require("domify")
var EventEmitter = require('events').EventEmitter;
var Menu = new EventEmitter();
	
Menu.appendTo = function(containerSelector){

	Menu.el = domify( Layout() );
	document.querySelector(containerSelector).appendChild(Menu.el);
	
	var buttons = Menu.el.querySelectorAll(".menu-btn");
	for (var i = buttons.length - 1; i >= 0; i--) buttons[i].onclick = onButtonClick
}


Menu.hide = function(){
	Menu.el.parentNode.classList.add("compact")
}	

function onButtonClick(e){
	var target = e.currentTarget;
	while( !target.classList.contains("menu-btn")  ) target= target.parentNode;
	var type = target.dataset.type
	if(type == "nav") return Menu.emit( target.dataset.event );
}



module.exports = Menu
},{"./layout":12,"domify":35,"events":1}],12:[function(require,module,exports){
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
      __out.push('<div class="menu-component">\n\t\n\t<div class=" top-header">\n\t\t\t<small class="small-text"> clay for salesforce . com </small>\n\t\t\t<small style="float: right"> gitub.com/3vot </small>\n\t</div>\n\n\t\n\n\t<div class="header">\n\n\t\t<div class="header-title"> 3VOT</div>\n\n\t\t<div class="header-message">\n\t\t\t\n\t\t\t--------------  Welcome to CLAY  --------------\n\n\t\t</div>\n\n\n\t\t<div class="header-panel">\n\t\t\n\t\t\tContents\n\n\t\t</div>\n\t</div>\n\n</div>');
    
    }).call(this);
    
  }).call(__obj);
  __obj.safe = __objSafe, __obj.escape = __escape;
  return __out.join('');
}
},{}],13:[function(require,module,exports){
var domify = require("domify");

var Layout = require("./layout");

function Static(view, name){
	if(!name) name = "";
	this.el = domify( Layout(name) );
	
	
	var body = this.el.querySelector(".view-body").innerHTML = view();
}

module.exports = Static;
},{"./layout":14,"domify":35}],14:[function(require,module,exports){
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
},{}],15:[function(require,module,exports){
var Size = require("element-size")
var MenuController = require("../controller/menu")
var StaticController = require("../controller/static");
var LiveController = require("../controller/live")

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
    if (!keys.hasOwnProperty(key)) continue;
    var key = keys[key];
    var view = staticControllerViews[ key ]
    
    var controller = new StaticController( view, key );
    LayoutManager.registerView( key , controller );
  }

  //Register Dynamic Components
  LayoutManager.registerView( "live", new LiveController("live") )

  LayoutManager.registerView( "embed", new EmbedController("embed") )


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
      container.height = controller.el.clientHeight;

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
   
  if(top) return top.history.replaceState({}, document.title, "#" + index);
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
  if(top) path = top.location.hash;
  path = path.replace(hashStrip, '');
  if(!parseInt(path)) return 0;
  return path;
};


module.exports = LayoutManager;
},{"../controller/embed":3,"../controller/live":9,"../controller/menu":11,"../controller/static":13,"../staticViews/clay":22,"../staticViews/dreamforce":23,"../staticViews/home":24,"../staticViews/slow":25,"../staticViews/speed":26,"element-size":36}],16:[function(require,module,exports){
var _3Model = require("clay-model")
var Ajax = require("clay-model-vfr");

Account = _3Model.setup("Account", ["Name","Type"]);
Account.ajax = Ajax;

Account.getTypes = function(){
	var types = [];
	var accounts = Account.all();
	for (var i = accounts.length - 1; i >= 0; i--) {
		var account = accounts[i]
		if( account.Type && types.indexOf( account.Type ) == -1 ) types.push( account.Type );
	};

	return types;
}

module.exports= Account
},{"clay-model":32,"clay-model-vfr":28}],17:[function(require,module,exports){
var _3Model = require("clay-model")

Type = _3Model.setup("Type", ["Name","Accounts","Color"]);

Type.buildFromAccounts = function(accounts){
	var types = [];
	var colors = ["blue","red","yellow","green"]

	for (var i = accounts.length - 1; i >= 0; i--) {
		var account = accounts[i]
		if( Type.findByAttribute("Name", account.Type) == null ){
			
			Type.create( {Name: account.Type, Color: colors.pop() } )
		}
	};

	Type.trigger("refresh");
}

module.exports= Type;
},{"clay-model":32}],18:[function(require,module,exports){
module.exports=require(16)
},{"clay-model":32,"clay-model-vfr":28}],19:[function(require,module,exports){
var _3Model = require("clay-model")
var Ajax = require("clay-model-vfr");

Case = _3Model.setup("Case", ["Name","Subject","ContactId"]);
Case.ajax = Ajax;

module.exports= Case
},{"clay-model":32,"clay-model-vfr":28}],20:[function(require,module,exports){
var _3Model = require("clay-model")
var Ajax = require("clay-model-vfr");

Contact = _3Model.setup("Case", ["Name"]);
Contact.ajax = Ajax;

module.exports= Contact;
},{"clay-model":32,"clay-model-vfr":28}],21:[function(require,module,exports){
module.exports=require(17)
},{"clay-model":32}],22:[function(require,module,exports){
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
      __out.push('<div class="row-block-head" >\n\t<div  class="row-block-title">Clay for Salesforce.com</div>\n\t<blockquote class="row-block-text">Available in App Exchange</blockquote>\n</div>\n\n<div class="row-block row-block__blue">\n\t<div  class="row-block-title"> SPEED is our motivation\n\t<div class="row-block-text row-block-text__large">Clay is a Development Tool to build Apps 10X Faster</div></div>\n\t<div class="padding-end-200"></div>\n</div>\n\n<div class="row-block row-block">\n\t<div  class="row-block-title"> It\'s based on components </div>\n\t<div class="row-block-text row-block-text__large">But it\'s not a Framework, is larger than that</div>\n\t<div class="row-block-text row-block-text__large">an open source architecture</div>\n\t<div class="row-block-text row-block-text__large">where you can build your own framework</div>\n\t<div class="padding-end-200"></div>\n</div>\n\n\n<div class="row-block row-block row-block__blue">\n\t<div  class="row-block-title"> Over 30 Development Solutions in one Package </div>\n\t\n\t<div  class="container">\n\t\t\n\t\t<div class="row">\n\t\t\n\t\t\t<div class="col-md-3 "><div class="thumbnail"> Build Locally</div></div>\n\t\t\t<div class="col-md-3 "><div class="thumbnail"> Staging Preview</div></div>\n\t\t\t<div class="col-md-3 "><div class="thumbnail"> One Click Deploy</div></div>\n\t\t\t<div class="col-md-3 "><div class="thumbnail"> Object Oriented</div></div>\n\t\t\t<div class="col-md-3 "><div class="thumbnail"> Modular - Component Based</div></div>\n\t\t\t<div class="col-md-3 "><div class="thumbnail"> 100,000 Open Source Libs ( NPM )</div></div>\n\n\t\t</div>\n\t</div>\n\n\n\t<div class="padding-end-200"></div>\n</div>\n\n\n<div class="row-block row-block__blue">\n\t<div  class="row-block-title"> Push to Deploy</div>\n\t<div class="row-block-text row-block-text__large">Promote fast iterations & short cycles</div>\n\n\t<div class="row-block-text">\n\t\t<div class="btn btn-large btn-warning">Preview in Staging</div>\n\n\t\t<div class="btn btn-large btn-success">Deploy to Production</div>\n\t</div>\n\t<div class="padding-end-200"></div>\n</div>\n\n<div class="row-block row-block__purple">\n\t<div  class="row-block-title"> Clay it\'s an architecture to build your production line</div>\n\t<div class="row-block-text">All apps are the same species </div>\n\t<div class="row-block-text">All apps are created equal</div>\n\t<div class="row-block-text">All apps are updated equal</div>\n\t<div class="row-block-text">Each app is unique</div>\n\t<div class="padding-end-200"></div>\n</div>\n\n<div class="navigation-block">\n\t<a data-event="back" class="btn btn-lg pull-left btn-primary">Go Back</a>\n\t<a data-event="next" class="btn btn-lg pull-right btn-primary">Continue</a>\n</div>\n');
    
    }).call(this);
    
  }).call(__obj);
  __obj.safe = __objSafe, __obj.escape = __escape;
  return __out.join('');
}
},{}],23:[function(require,module,exports){
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
      __out.push('<div class="row-block-head" >\n\t<div  class="row-block-title">Dreamforce Recap</div>\n\t<blockquote class="row-block-text">Secret to digital success: Speed and Javascript</blockquote>\n</div>\n\n\n<div class="row-block row-block__blue">\n\t<div  class="row-block-title"> "Move fast!</div>\n\t<div class="row-block-text row-block-text__large">Those taking too long to consider things, will find themselves left behind"</div>\n\t<div class="row-block-text row-block-text__large">Jeroen Tas, Phillips</div>\n\t<div class="padding-end-200"></div>\n</div>\n\n<div class="row-block row-block__purple">\n\t<div class="row-block-title">It\'s not how great your apps is</div>\n\t<div class="row-block-text row-block-text__large">is how fast you can make it better</div>\n\t<div class="row-block-text row-block-text__large ">Adam Seligman, Salesforce Developer</div>\n\t<div class="padding-end-200"></div>\n\n</div>\n\n<div class="row-block">\n\t<div  class="row-block-title"> Best apps are updated weekly!</div>\n\t<div class="row-block-text row-block-text__large">Tip: Increase iterations, decrease cycle times  </div>\n\t<div class="row-block-title"><a class="btn btn-warning btn-lg">Click to preview</a></div>\n\t<div class="row-block-title"><a class="btn btn-success btn-lg">Click to deploy button</a></div>\n\t<div class="padding-end-200"></div>\n</div>\n\n\n<div class="row-block row-block__blue">\n\t<div class="row-block-title">You don’t have to be a software company to build apps</div>\n\t <div class="row-block-text row-block-text__large">Mark Benioff, Salesforce</div>\n\t<div class="padding-end-200"></div>\n</div>\n\n<div class="row-block row-block__purple">\n\t<div  class="row-block-title">Visualforce Lightning</div>\n\t<div class="row-block-text row-block-text__large">A Javascript Component Framework for Salesforce.com</div>\n\t<div class="padding-end-200"></div>\n</div>\n\n<div class="navigation-block">\n\t\t\t<a data-event="back" class="btn btn-lg pull-left btn-primary">Go Back</a>\n\n\t\t<a data-event="next" class="btn btn-lg pull-right btn-primary">Continue</a>\n</div>\n');
    
    }).call(this);
    
  }).call(__obj);
  __obj.safe = __objSafe, __obj.escape = __escape;
  return __out.join('');
}
},{}],24:[function(require,module,exports){
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
      __out.push('\n<div class="row-block-head row-block" >\n\n\t<div class="row-block-title">Building Salesforce Apps Fast</div>\n\n\t<blockquote class="row-block-text">The whole Catholic Church Organization just ran a disruptive conference to talk about adapting to changes</blockquote>\n\t\n</div>\n\n<div class="row-block row-block__blue">\n\t<div class="row-block-title">Table of Contents</div>\n\n\t<div class=" row">\n\t\t<ul class="col-md-6 col-md-offset-3 text-list" >\n\t\t\t\n\t\t\t<li> The importance of building amazing UI\'s, or Apps </li>\n\n\t\t\t<li> Dreamforce Recap </li>\n\n\t\t\t<li> The need for Speed </li>\n\t\t\t\n\t\t\t<li> What makes you Slow </li>\n\n\t\t\t<li> Steps to become fast </li>\n\n\t\t\t<li> Building an App Live </li>\n\n\t\t\t<li> Q & A - In Presentation </li>\n\n\t\t\t<li> Extended Q & A - After Presentation</li>\n\n\t\t\t<li> Private Q & A - Thursday October 24 </li>\n\n\t\t</ul>\n\t</div>\t\n</div>\n\n<div class="navigation-block">\n\t\t<a data-event="next" class="btn btn-lg btn-block btn-primary">Start Here</a>\n</div>\n\n');
    
    }).call(this);
    
  }).call(__obj);
  __obj.safe = __objSafe, __obj.escape = __escape;
  return __out.join('');
}
},{}],25:[function(require,module,exports){
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
      __out.push('<div class="row-block-head" >\n\n\t<div  class="row-block-title">What makes you slow?</div>\n\n\t<blockquote class="row-block-text">Let\'s identify what\'s dragging us!</blockquote>\n\n</div>\n\n<div class="row-block row-block__blue" >\n\n\t<div class="row-block-title">Developing from a Browser</div>\n\t<div class="row-block-text">Server Side Compile</div>\n\n\t<div class="padding-end-100"></div>\n\n</div>\n\n<div class="row-block row-block" >\n\n\t<div class="row-block-title">Isolation from the World Community</div>\n\t<div class="row-block-text"> - No change - No Innovation</div>\n\n\t<div class="padding-end-100"></div>\n\n</div>\n\n<div class="row-block row-block__purple" >\n\n\t<div class="row-block-title">Lack of Answers, Tools & Support for Developers</div>\n\n\t<div class="padding-end-100"></div>\n\n</div>\n\n<div class="row-block row-block__blue" >\n\n\t<div class="row-block-title">Proprietary Technology & Frameworks</div>\n\t<div class="row-block-text"> - Waiting for Changes</div>\n\n\t<div class="padding-end-100"></div>\n\n</div>\n\n<div class="row-block row-block__" >\n\n\t<div class="row-block-title"> Scripts & Development Process\n\t<div class="row-block-text"> Working outside your core</div>\n\n\t<div class="padding-end-100"></div>\n\n</div>\n\n<div class="row-block row-block__purple" >\n\n\t<div class="row-block-title"> Team Size and Team Management</div>\n\t<div class="row-block-text"> Not being able to outsource properly</div>\n\n\t<div class="padding-end-100"></div>\n\n</div>\n\n<div class="row-block row-block__blue" >\n\n\t<div class="row-block-title">Spaghetti Code</div>\n\n\t<div class="padding-end-100"></div>\n\n</div>\n\n<div class="navigation-block">\n\t\t\t<a data-event="back" class="btn btn-lg pull-left btn-primary">Go Back</a>\n\n\t\t<a data-event="next" class="btn btn-lg pull-right btn-primary">Continue</a>\n</div>');
    
    }).call(this);
    
  }).call(__obj);
  __obj.safe = __objSafe, __obj.escape = __escape;
  return __out.join('');
}
},{}],26:[function(require,module,exports){
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
      __out.push('<div class="row-block-head" >\n\n\t<div  class="row-block-title">What makes you faster?</div>\n\n\t<blockquote class="row-block-text">Faster as an Organization, not only as a developer!</blockquote>\n\n \t<div class="row-block-text row-block-text__large">What\'s the Goal?</div>\n\n\t<div class="row-block-text"> Build and Release an App in a week</div>\n\n\t<div class="row-block-text"> Update and Release in minutes</div>\n\n</div>\n\n\n<div class="row-block row-block__blue" >\n\n\t<div class="row-block-title">Code Structure and Architecture - Highly Engineered </div>\n\n\t<div class="padding-end-100"></div>\n\n</div>\n\n<div class="row-block " >\n\n\t<div class="row-block-title">Build in terms of isolated Components</div>\n\t <div class="row-block-text">Parts Communicate via events</div>\n\n\t<div class="row-block-text"> Quickly reuse Apps and Components</div>\n\n\t<div class="padding-end-100"></div>\n\n</div>\n\n<div class="row-block row-block__blue" >\n\t<div class="row-block-title"> Developer Tools</div>\n\n\t<div class="row-block-text"> Local Development with your preferred tools</div>\n\n\t<div class="row-block-text"> One Click URL Preview </div>\n\n\t<div class="row-block-text"> One Click Production Release</div>\n\n\t<div class="padding-end-100"></div>\n</div>\n\n<div class="row-block row-block__purple" >\n\t<div class="row-block-title"> Standardization and Automation</div>\n\t<div class="row-block-text">All apps are the same species </div>\n\t<div class="row-block-text">All apps are created equal</div>\n\t<div class="row-block-text">All apps are updated equal</div>\n\t<div class="row-block-text">Each app is unique</div>\n\t<div class="padding-end-50"></div>\n\n</div>\n\n<div class="navigation-block">\n\t\t\t<a data-event="back" class="btn btn-lg pull-left btn-primary">Go Back</a>\n\n\t\t<a data-event="next" class="btn btn-lg pull-right btn-primary">Continue</a>\n</div>');
    
    }).call(this);
    
  }).call(__obj);
  __obj.safe = __objSafe, __obj.escape = __escape;
  return __out.join('');
}
},{}],27:[function(require,module,exports){
var MenuController = require("./code/controller/menu")
MenuController.appendTo("._3vot");
MenuController.hide();


var LayoutManager = require("./code/managers/layout");
LayoutManager.register(".slide-container");



var Account = require("./code/model/Account");
var Type = require("./code/model/Type");
Account.bind("refresh", function(){
	Type.buildFromAccounts(Account.all());
})
},{"./code/controller/menu":11,"./code/managers/layout":15,"./code/model/Account":16,"./code/model/Type":17}],28:[function(require,module,exports){

var VFR= require("clay-vfr")

var Ajax = function(eventName, model, options){
  if(eventName == "create") return Ajax.post.call(this, model,options )
  else if(eventName == "update") return Ajax.put.call(this, model,options )
  else if(eventName == "destroy") return Ajax.del.call(this, model,options )
  
  //Sho
  var params = model;
  if(eventName == "query") return Ajax.query.call(this, params, options);  
  else if(eventName == "read") return Ajax.get.call(this, params, options);
  else if(eventName == "api") return Ajax.api.call(this, params, options);

}

Ajax.api = function(){
  if(!this.ajax.namespace) this.ajax.namespace = ""
  var args = Array.prototype.slice(arguments);
  var remoteAction = args[0];
  var callArgs = []
  for (var i = 1; i < args.length-1; i++) {
    callArgs.push(args[i]);
  };
  options = args[args.length-1];
  if(typeof remoteAction != "string" ) throw "First Argument should be the Remote Action (string)"
  if(options == remoteAction) options = {};

  var send = VFR( this.namespace + remoteAction, options, options.nullok || false );
  return send.apply( VFR, callArgs );
}

Ajax.query = function(params, options){
  if(!this.ajax.namespace) this.ajax.namespace =""

  var pctEncodeSpaces = true;
  var params = encodeURIComponent(params).replace(/%40/gi, '@').replace(/%3A/gi, ':').replace(/%24/g, '$').replace(/%2C/gi, ',').replace(/%20/g, pctEncodeSpaces ? '%20' : '+');
  
  var send = VFR(this.ajax.namespace + "ThreeVotApiController.handleRest" );
  return send( "get", "/query?query=" + params , "" )
  .then(function(results){ 
    for (var i = results.length - 1; i >= 0; i--) {
      results[i].id = results[i].Id
      delete results[i].Id;
    };
    return results;
   })
}

Ajax.get = function(id, options){
  if(!this.ajax.namespace) this.ajax.namespace =""

  var send = VFR(this.ajax.namespace + "ThreeVotApiController.handleRest" );
  return send( "get", Ajax.generateURL(this) + "/" + id, "" )
  .then(function(data){
    data.id = data.Id;
    delete results[i].Id;
    return data;
  });
}

Ajax.post = function(model, options){
  if(!model.ajax.namespace) model.namespace =""
  var _this = this;


  var id = this.id;
  this.id = null;
  var send = VFR(model.ajax.namespace + "ThreeVotApiController.handleRest" );
  return send( "post", Ajax.generateURL(model) , JSON.stringify(this.toJSON()) )
  .then( function(data){ _this.id = id; return data; } )
}

Ajax.put = function(model, options){
  if(!model.ajax.namespace) model.ajax.namespace =""

  var valuesToSend = JSON.parse(JSON.stringify(this.toJSON())); //ugly hack
  var previousAttributes = JSON.parse( model.previousAttributes[this.id] );
  for(key in valuesToSend){
    if(valuesToSend[key] == previousAttributes[key]){
      delete valuesToSend[key];
    }
  }

  var send = VFR(model.ajax.namespace + "ThreeVotApiController.handleRest", {}, true );
  return send( "put", Ajax.generateURL(model, this.id ), JSON.stringify(valuesToSend) )
  .then( function(data){ return data; } )
}

Ajax.del = function(model, options){
  if(!model.ajax.namespace) model.ajax.namespace =""

  var send = VFR(model.ajax.namespace + "ThreeVotApiController.handleRest", {}, true );
  return send( "del", Ajax.generateURL(model, this.id ), "" );
}

Ajax.generateURL = function() {
  var args, collection, object, path, scope;
  object = arguments[0], args = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
  collection = object.className;
  
  args.unshift(collection);
  args.unshift(scope);
  path = args.join('/');
  path = path.replace(/(\/\/)/g, "/");
  path = path.replace(/^\/|\/$/g, "");
  return "/"+path;
};

module.exports = Ajax;


},{"clay-vfr":29}],29:[function(require,module,exports){
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

},{"kew":30}],30:[function(require,module,exports){
var process=require("__browserify_process");
/**
 * An object representing a "promise" for a future value
 *
 * @param {?function(T, ?)=} onSuccess a function to handle successful
 *     resolution of this promise
 * @param {?function(!Error, ?)=} onFail a function to handle failed
 *     resolution of this promise
 * @constructor
 * @template T
 */
function Promise(onSuccess, onFail) {
  this.promise = this
  this._isPromise = true
  this._successFn = onSuccess
  this._failFn = onFail
  this._scope = this
  this._boundArgs = null
  this._hasContext = false
  this._nextContext = undefined
  this._currentContext = undefined
}

/**
 * @param {function()} callback
 */
function nextTick (callback) {
  callback()
}

if (typeof process !== 'undefined') {
  nextTick = process.nextTick
}

/**
 * All callback execution should go through this function.  While the
 * implementation below is simple, it can be replaced with more sophisticated
 * implementations that enforce QoS on the event loop.
 *
 * @param {Promise} defer
 * @param {Function} callback
 * @param {Object|undefined} scope
 * @param {Array} args
 */
function nextTickCallback (defer, callback, scope, args) {
  try {
    defer.resolve(callback.apply(scope, args))
  } catch (thrown) {
    defer.reject(thrown)
  }
}

/**
 * Used for accessing the nextTick function from outside the kew module.
 *
 * @return {Function}
 */
function getNextTickFunction () {
  return nextTick
}

/**
 * Used for overriding the nextTick function from outside the kew module so that
 * the user can plug and play lower level schedulers
 * @param {Function} fn
 */
function setNextTickFunction (fn) {
  nextTick = fn
}

/**
 * Keep track of the number of promises that are rejected along side
 * the number of rejected promises we call _failFn on so we can look
 * for leaked rejections.
 * @constructor
 */
function PromiseStats() {
  /** @type {number} */
  this.errorsEmitted = 0

  /** @type {number} */
  this.errorsHandled = 0
}

var stats = new PromiseStats()

Promise.prototype._handleError = function () {
  if (!this._errorHandled) {
    stats.errorsHandled++
    this._errorHandled = true
  }
}

/**
 * Specify that the current promise should have a specified context
 * @param  {*} context context
 * @private
 */
Promise.prototype._useContext = function (context) {
  this._nextContext = this._currentContext = context
  this._hasContext = true
  return this
}

Promise.prototype.clearContext = function () {
  this._hasContext = false
  this._nextContext = undefined
  return this
}

/**
 * Set the context for all promise handlers to follow
 *
 * NOTE(dpup): This should be considered deprecated.  It does not do what most
 * people would expect.  The context will be passed as a second argument to all
 * subsequent callbacks.
 *
 * @param {*} context An arbitrary context
 */
Promise.prototype.setContext = function (context) {
  this._nextContext = context
  this._hasContext = true
  return this
}

/**
 * Get the context for a promise
 * @return {*} the context set by setContext
 */
Promise.prototype.getContext = function () {
  return this._nextContext
}

/**
 * Resolve this promise with a specified value
 *
 * @param {*=} data
 */
Promise.prototype.resolve = function (data) {
  if (this._error || this._hasData) throw new Error("Unable to resolve or reject the same promise twice")

  var i
  if (data && isPromise(data)) {
    this._child = data
    if (this._promises) {
      for (i = 0; i < this._promises.length; i += 1) {
        data._chainPromise(this._promises[i])
      }
      delete this._promises
    }

    if (this._onComplete) {
      for (i = 0; i < this._onComplete.length; i+= 1) {
        data.fin(this._onComplete[i])
      }
      delete this._onComplete
    }
  } else if (data && isPromiseLike(data)) {
    data.then(
      function(data) { this.resolve(data) }.bind(this),
      function(err) { this.reject(err) }.bind(this)
    )
  } else {
    this._hasData = true
    this._data = data

    if (this._onComplete) {
      for (i = 0; i < this._onComplete.length; i++) {
        this._onComplete[i]()
      }
    }

    if (this._promises) {
      for (i = 0; i < this._promises.length; i += 1) {
        this._promises[i]._useContext(this._nextContext)
        this._promises[i]._withInput(data)
      }
      delete this._promises
    }
  }
}

/**
 * Reject this promise with an error
 *
 * @param {!Error} e
 */
Promise.prototype.reject = function (e) {
  if (this._error || this._hasData) throw new Error("Unable to resolve or reject the same promise twice")

  var i
  this._error = e
  stats.errorsEmitted++

  if (this._ended) {
    this._handleError()
    process.nextTick(function onPromiseThrow() {
      throw e
    })
  }

  if (this._onComplete) {
    for (i = 0; i < this._onComplete.length; i++) {
      this._onComplete[i]()
    }
  }

  if (this._promises) {
    this._handleError()
    for (i = 0; i < this._promises.length; i += 1) {
      this._promises[i]._useContext(this._nextContext)
      this._promises[i]._withError(e)
    }
    delete this._promises
  }
}

/**
 * Provide a callback to be called whenever this promise successfully
 * resolves. Allows for an optional second callback to handle the failure
 * case.
 *
 * @param {?function(this:void, T, ?): RESULT|undefined} onSuccess
 * @param {?function(this:void, !Error, ?): RESULT=} onFail
 * @return {!Promise.<RESULT>} returns a new promise with the output of the onSuccess or
 *     onFail handler
 * @template RESULT
 */
Promise.prototype.then = function (onSuccess, onFail) {
  var promise = new Promise(onSuccess, onFail)
  if (this._nextContext) promise._useContext(this._nextContext)

  if (this._child) this._child._chainPromise(promise)
  else this._chainPromise(promise)

  return promise
}

/**
 * Provide a callback to be called whenever this promise successfully
 * resolves. The callback will be executed in the context of the provided scope.
 *
 * @param {function(this:SCOPE, ...): RESULT} onSuccess
 * @param {SCOPE} scope Object whose context callback will be executed in.
 * @param {...*} var_args Additional arguments to be passed to the promise callback.
 * @return {!Promise.<RESULT>} returns a new promise with the output of the onSuccess
 * @template SCOPE, RESULT
 */
Promise.prototype.thenBound = function (onSuccess, scope, var_args) {
  var promise = new Promise(onSuccess)
  if (this._nextContext) promise._useContext(this._nextContext)

  promise._scope = scope
  if (arguments.length > 2) {
    promise._boundArgs = Array.prototype.slice.call(arguments, 2)
  }

  // Chaining must happen after setting args and scope since it may fire callback.
  if (this._child) this._child._chainPromise(promise)
  else this._chainPromise(promise)

  return promise
}

/**
 * Provide a callback to be called whenever this promise is rejected
 *
 * @param {function(this:void, !Error, ?)} onFail
 * @return {!Promise.<T>} returns a new promise with the output of the onFail handler
 */
Promise.prototype.fail = function (onFail) {
  return this.then(null, onFail)
}

/**
 * Provide a callback to be called whenever this promise is rejected.
 * The callback will be executed in the context of the provided scope.
 *
 * @param {function(this:SCOPE, ...)} onFail
 * @param {SCOPE} scope Object whose context callback will be executed in.
 * @param {...?} var_args
 * @return {!Promise.<T>} returns a new promise with the output of the onSuccess
 * @template SCOPE
 */
Promise.prototype.failBound = function (onFail, scope, var_args) {
  var promise = new Promise(null, onFail)
  if (this._nextContext) promise._useContext(this._nextContext)

  promise._scope = scope
  if (arguments.length > 2) {
    promise._boundArgs = Array.prototype.slice.call(arguments, 2)
  }

  // Chaining must happen after setting args and scope since it may fire callback.
  if (this._child) this._child._chainPromise(promise)
  else this._chainPromise(promise)

  return promise
}

/**
 * Provide a callback to be called whenever this promise is either resolved
 * or rejected.
 *
 * @param {function()} onComplete
 * @return {!Promise.<T>} returns the current promise
 */
Promise.prototype.fin = function (onComplete) {
  if (this._hasData || this._error) {
    onComplete()
    return this
  }

  if (this._child) {
    this._child.fin(onComplete)
  } else {
    if (!this._onComplete) this._onComplete = [onComplete]
    else this._onComplete.push(onComplete)
  }

  return this
}

/**
 * Mark this promise as "ended". If the promise is rejected, this will throw an
 * error in whatever scope it happens to be in
 *
 * @return {!Promise.<T>} returns the current promise
 * @deprecated Prefer done(), because it's consistent with Q.
 */
Promise.prototype.end = function () {
  this._end()
  return this
}


/**
 * Mark this promise as "ended".
 * @private
 */
Promise.prototype._end = function () {
  if (this._error) {
    this._handleError()
    throw this._error
  }
  this._ended = true
  return this
}

/**
 * Close the promise. Any errors after this completes will be thrown to the global handler.
 *
 * @param {?function(this:void, T, ?)=} onSuccess a function to handle successful
 *     resolution of this promise
 * @param {?function(this:void, !Error, ?)=} onFailure a function to handle failed
 *     resolution of this promise
 * @return {void}
 */
Promise.prototype.done = function (onSuccess, onFailure) {
  var self = this
  if (onSuccess || onFailure) {
    self = self.then(onSuccess, onFailure)
  }
  self._end()
}

/**
 * Return a new promise that behaves the same as the current promise except
 * that it will be rejected if the current promise does not get fulfilled
 * after a certain amount of time.
 *
 * @param {number} timeoutMs The timeout threshold in msec
 * @param {string=} timeoutMsg error message
 * @return {!Promise.<T>} a new promise with timeout
 */
 Promise.prototype.timeout = function (timeoutMs, timeoutMsg) {
  var deferred = new Promise()
  var isTimeout = false

  var timeout = setTimeout(function() {
    deferred.reject(new Error(timeoutMsg || 'Promise timeout after ' + timeoutMs + ' ms.'))
    isTimeout = true
  }, timeoutMs)

  this.then(function (data) {
    if (!isTimeout) {
      clearTimeout(timeout)
      deferred.resolve(data)
    }
  },
  function (err) {
    if (!isTimeout) {
      clearTimeout(timeout)
      deferred.reject(err)
    }
  })

  return deferred.promise
}

/**
 * Attempt to resolve this promise with the specified input
 *
 * @param {*} data the input
 */
Promise.prototype._withInput = function (data) {
  if (this._successFn) {
    this._nextTick(this._successFn, [data, this._currentContext])
  } else {
    this.resolve(data)
  }

  // context is no longer needed
  delete this._currentContext
}

/**
 * Attempt to reject this promise with the specified error
 *
 * @param {!Error} e
 * @private
 */
Promise.prototype._withError = function (e) {
  if (this._failFn) {
    this._nextTick(this._failFn, [e, this._currentContext])
  } else {
    this.reject(e)
  }

  // context is no longer needed
  delete this._currentContext
}

/**
 * Calls a function in the correct scope, and includes bound arguments.
 * @param {Function} fn
 * @param {Array} args
 * @private
 */
Promise.prototype._nextTick = function (fn, args) {
  if (this._boundArgs) {
    args = this._boundArgs.concat(args)
  }
  nextTick(nextTickCallback.bind(null, this, fn, this._scope, args))
}

/**
 * Chain a promise to the current promise
 *
 * @param {!Promise} promise the promise to chain
 * @private
 */
Promise.prototype._chainPromise = function (promise) {
  var i
  if (this._hasContext) promise._useContext(this._nextContext)

  if (this._child) {
    this._child._chainPromise(promise)
  } else if (this._hasData) {
    promise._withInput(this._data)
  } else if (this._error) {
    // We can't rely on _withError() because it's called on the chained promises
    // and we need to use the source's _errorHandled state
    this._handleError()
    promise._withError(this._error)
  } else if (!this._promises) {
    this._promises = [promise]
  } else {
    this._promises.push(promise)
  }
}

/**
 * Utility function used for creating a node-style resolver
 * for deferreds
 *
 * @param {!Promise} deferred a promise that looks like a deferred
 * @param {Error=} err an optional error
 * @param {*=} data optional data
 */
function resolver(deferred, err, data) {
  if (err) deferred.reject(err)
  else deferred.resolve(data)
}

/**
 * Creates a node-style resolver for a deferred by wrapping
 * resolver()
 *
 * @return {function(?Error, *)} node-style callback
 */
Promise.prototype.makeNodeResolver = function () {
  return resolver.bind(null, this)
}

/**
 * Return true iff the given object is a promise of this library.
 *
 * Because kew's API is slightly different than other promise libraries,
 * it's important that we have a test for its promise type. If you want
 * to test for a more general A+ promise, you should do a cap test for
 * the features you want.
 *
 * @param {*} obj The object to test
 * @return {boolean} Whether the object is a promise
 */
function isPromise(obj) {
  return !!obj._isPromise
}

/**
 * Return true iff the given object is a promise-like object, e.g. appears to
 * implement Promises/A+ specification
 *
 * @param {*} obj The object to test
 * @return {boolean} Whether the object is a promise-like object
 */
function isPromiseLike(obj) {
  return typeof obj === 'object' && typeof obj.then === 'function'
}

/**
 * Static function which creates and resolves a promise immediately
 *
 * @param {T} data data to resolve the promise with
 * @return {!Promise.<T>}
 * @template T
 */
function resolve(data) {
  var promise = new Promise()
  promise.resolve(data)
  return promise
}

/**
 * Static function which creates and rejects a promise immediately
 *
 * @param {!Error} e error to reject the promise with
 * @return {!Promise}
 */
function reject(e) {
  var promise = new Promise()
  promise.reject(e)
  return promise
}

/**
 * Replace an element in an array with a new value. Used by .all() to
 * call from .then()
 *
 * @param {!Array} arr
 * @param {number} idx
 * @param {*} val
 * @return {*} the val that's being injected into the array
 */
function replaceEl(arr, idx, val) {
  arr[idx] = val
  return val
}

/**
 * Replace an element in an array as it is resolved with its value.
 * Used by .allSettled().
 *
 * @param {!Array} arr
 * @param {number} idx
 * @param {*} value The value from a resolved promise.
 * @return {*} the data that's being passed in
 */
function replaceElFulfilled(arr, idx, value) {
  arr[idx] = {
    state: 'fulfilled',
    value: value
  }
  return value
}

/**
 * Replace an element in an array as it is rejected with the reason.
 * Used by .allSettled().
 *
 * @param {!Array} arr
 * @param {number} idx
 * @param {*} reason The reason why the original promise is rejected
 * @return {*} the data that's being passed in
 */
function replaceElRejected(arr, idx, reason) {
  arr[idx] = {
    state: 'rejected',
    reason: reason
  }
  return reason
}

/**
 * Takes in an array of promises or literals and returns a promise which returns
 * an array of values when all have resolved. If any fail, the promise fails.
 *
 * @param {!Array.<!Promise>} promises
 * @return {!Promise.<!Array>}
 */
function all(promises) {
  if (arguments.length != 1 || !Array.isArray(promises)) {
    promises = Array.prototype.slice.call(arguments, 0)
  }
  if (!promises.length) return resolve([])

  var outputs = []
  var finished = false
  var promise = new Promise()
  var counter = promises.length

  for (var i = 0; i < promises.length; i += 1) {
    if (!promises[i] || !isPromiseLike(promises[i])) {
      outputs[i] = promises[i]
      counter -= 1
    } else {
      promises[i].then(replaceEl.bind(null, outputs, i))
      .then(function decrementAllCounter() {
        counter--
        if (!finished && counter === 0) {
          finished = true
          promise.resolve(outputs)
        }
      }, function onAllError(e) {
        if (!finished) {
          finished = true
          promise.reject(e)
        }
      })
    }
  }

  if (counter === 0 && !finished) {
    finished = true
    promise.resolve(outputs)
  }

  return promise
}

/**
 * Takes in an array of promises or values and returns a promise that is
 * fulfilled with an array of state objects when all have resolved or
 * rejected. If a promise is resolved, its corresponding state object is
 * {state: 'fulfilled', value: Object}; whereas if a promise is rejected, its
 * corresponding state object is {state: 'rejected', reason: Object}.
 *
 * @param {!Array} promises or values
 * @return {!Promise.<!Array>} Promise fulfilled with state objects for each input
 */
function allSettled(promises) {
  if (!Array.isArray(promises)) {
    throw Error('The input to "allSettled()" should be an array of Promise or values')
  }
  if (!promises.length) return resolve([])

  var outputs = []
  var promise = new Promise()
  var counter = promises.length

  for (var i = 0; i < promises.length; i += 1) {
    if (!promises[i] || !isPromiseLike(promises[i])) {
      replaceElFulfilled(outputs, i, promises[i])
      if ((--counter) === 0) promise.resolve(outputs)
    } else {
      promises[i]
        .then(replaceElFulfilled.bind(null, outputs, i), replaceElRejected.bind(null, outputs, i))
        .then(function () {
          if ((--counter) === 0) promise.resolve(outputs)
        })
    }
  }

  return promise
}

/**
 * Create a new Promise which looks like a deferred
 *
 * @return {!Promise}
 */
function defer() {
  return new Promise()
}

/**
 * Return a promise which will wait a specified number of ms to resolve
 *
 * @param {*} delayMsOrVal A delay (in ms) if this takes one argument, or ther
 *     return value if it takes two.
 * @param {number=} opt_delayMs
 * @return {!Promise}
 */
function delay(delayMsOrVal, opt_delayMs) {
  var returnVal = undefined
  var delayMs = delayMsOrVal
  if (typeof opt_delayMs != 'undefined') {
    delayMs = opt_delayMs
    returnVal = delayMsOrVal
  }

  if (typeof delayMs != 'number') {
    throw new Error('Bad delay value ' + delayMs)
  }

  var defer = new Promise()
  setTimeout(function onDelay() {
    defer.resolve(returnVal)
  }, delayMs)
  return defer
}

/**
 * Returns a promise that has the same result as `this`, but fulfilled
 * after at least ms milliseconds
 * @param {number} ms
 */
Promise.prototype.delay = function (ms) {
  return this.then(function (val) {
    return delay(val, ms)
  })
}

/**
 * Return a promise which will evaluate the function fn in a future turn with
 * the provided args
 *
 * @param {function(...)} fn
 * @param {...*} var_args a variable number of arguments
 * @return {!Promise}
 */
function fcall(fn, var_args) {
  var rootArgs = Array.prototype.slice.call(arguments, 1)
  var defer = new Promise()
  nextTick(nextTickCallback.bind(null, defer, fn, undefined, rootArgs))
  return defer
}


/**
 * Returns a promise that will be invoked with the result of a node style
 * callback. All args to fn should be given except for the final callback arg
 *
 * @param {function(...)} fn
 * @param {...*} var_args a variable number of arguments
 * @return {!Promise}
 */
function nfcall(fn, var_args) {
  // Insert an undefined argument for scope and let bindPromise() do the work.
  var args = Array.prototype.slice.call(arguments, 0)
  args.splice(1, 0, undefined)
  return bindPromise.apply(undefined, args)()
}


/**
 * Binds a function to a scope with an optional number of curried arguments. Attaches
 * a node style callback as the last argument and returns a promise
 *
 * @param {function(...)} fn
 * @param {Object} scope
 * @param {...*} var_args a variable number of arguments
 * @return {function(...)}: !Promise}
 */
function bindPromise(fn, scope, var_args) {
  var rootArgs = Array.prototype.slice.call(arguments, 2)
  return function onBoundPromise(var_args) {
    var defer = new Promise()
    try {
      fn.apply(scope, rootArgs.concat(Array.prototype.slice.call(arguments, 0), defer.makeNodeResolver()))
    } catch (e) {
      defer.reject(e)
    }
    return defer
  }
}

module.exports = {
    all: all
  , bindPromise: bindPromise
  , defer: defer
  , delay: delay
  , fcall: fcall
  , isPromise: isPromise
  , isPromiseLike: isPromiseLike
  , nfcall: nfcall
  , resolve: resolve
  , reject: reject
  , stats: stats
  , allSettled: allSettled
  , Promise: Promise
  , getNextTickFunction: getNextTickFunction
  , setNextTickFunction: setNextTickFunction
}

},{"__browserify_process":2}],31:[function(require,module,exports){
// Generated by CoffeeScript 1.7.1
(function() {
  var Events, trim,
    __slice = [].slice;

  trim = function(text) {
    var rtrim, _ref;
    rtrim = /^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g;
        if ((_ref = text === null) != null) {
      _ref;
    } else {
      ({
        "": (text + "").replace(rtrim, "")
      });
    };
    return text;
  };

  Events = {
    bind: function(ev, callback) {
      var calls, evs, name, _i, _len;
      evs = ev.split(' ');
      if (this.hasOwnProperty('_callbacks') && this._callbacks) {
        calls = this._callbacks;
      } else {
        this._callbacks = {};
        calls = this._callbacks;
      }
      for (_i = 0, _len = evs.length; _i < _len; _i++) {
        name = evs[_i];
        calls[name] || (calls[name] = []);
        calls[name].push(callback);
      }
      return this;
    },
    one: function(ev, callback) {
      var handler;
      return this.bind(ev, handler = function() {
        this.unbind(ev, handler);
        return callback.apply(this, arguments);
      });
    },
    trigger: function() {
      var args, callback, ev, list, _i, _len, _ref;
      args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
      ev = args.shift();
      list = this.hasOwnProperty('_callbacks') && ((_ref = this._callbacks) != null ? _ref[ev] : void 0);
      if (!list) {
        return;
      }
      for (_i = 0, _len = list.length; _i < _len; _i++) {
        callback = list[_i];
        if (callback.apply(this, args) === false) {
          break;
        }
      }
      return true;
    },
    listenTo: function(obj, ev, callback) {
      obj.bind(ev, callback);
      this.listeningTo || (this.listeningTo = []);
      this.listeningTo.push({
        obj: obj,
        ev: ev,
        callback: callback
      });
      return this;
    },
    listenToOnce: function(obj, ev, callback) {
      var handler, listeningToOnce;
      listeningToOnce = this.listeningToOnce || (this.listeningToOnce = []);
      obj.bind(ev, handler = function() {
        var i, idx, lt, _i, _len;
        idx = -1;
        for (i = _i = 0, _len = listeningToOnce.length; _i < _len; i = ++_i) {
          lt = listeningToOnce[i];
          if (lt.obj === obj) {
            if (lt.ev === ev && lt.callback === callback) {
              idx = i;
            }
          }
        }
        obj.unbind(ev, handler);
        if (idx !== -1) {
          listeningToOnce.splice(idx, 1);
        }
        return callback.apply(this, arguments);
      });
      listeningToOnce.push({
        obj: obj,
        ev: ev,
        callback: callback,
        handler: handler
      });
      return this;
    },
    stopListening: function(obj, events, callback) {
      var ev, evts, i, idx, listeningTo, lt, _i, _j, _k, _len, _len1, _len2, _ref, _ref1, _results;
      if (arguments.length === 0) {
        _ref = [this.listeningTo, this.listeningToOnce];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          listeningTo = _ref[_i];
          if (!listeningTo) {
            continue;
          }
          for (_j = 0, _len1 = listeningTo.length; _j < _len1; _j++) {
            lt = listeningTo[_j];
            lt.obj.unbind(lt.ev, lt.handler || lt.callback);
          }
        }
        this.listeningTo = void 0;
        return this.listeningToOnce = void 0;
      } else if (obj) {
        _ref1 = [this.listeningTo, this.listeningToOnce];
        _results = [];
        for (_k = 0, _len2 = _ref1.length; _k < _len2; _k++) {
          listeningTo = _ref1[_k];
          if (!listeningTo) {
            continue;
          }
          events = events ? events.split(' ') : [void 0];
          _results.push((function() {
            var _l, _len3, _results1;
            _results1 = [];
            for (_l = 0, _len3 = events.length; _l < _len3; _l++) {
              ev = events[_l];
              _results1.push((function() {
                var _m, _ref2, _results2;
                _results2 = [];
                for (idx = _m = _ref2 = listeningTo.length - 1; _ref2 <= 0 ? _m <= 0 : _m >= 0; idx = _ref2 <= 0 ? ++_m : --_m) {
                  lt = listeningTo[idx];
                  if ((!ev) || (ev === lt.ev)) {
                    lt.obj.unbind(lt.ev, lt.handler || lt.callback);
                    if (idx !== -1) {
                      _results2.push(listeningTo.splice(idx, 1));
                    } else {
                      _results2.push(void 0);
                    }
                  } else if (ev) {
                    evts = lt.ev.split(' ');
                    if (~(i = evts.indexOf(ev))) {
                      evts.splice(i, 1);
                      lt.ev = trim(evts.join(' '));
                      _results2.push(lt.obj.unbind(ev, lt.handler || lt.callback));
                    } else {
                      _results2.push(void 0);
                    }
                  } else {
                    _results2.push(void 0);
                  }
                }
                return _results2;
              })());
            }
            return _results1;
          })());
        }
        return _results;
      }
    },
    unbind: function(ev, callback) {
      var cb, evs, i, list, name, _i, _j, _len, _len1, _ref;
      if (arguments.length === 0) {
        this._callbacks = {};
        return this;
      }
      if (!ev) {
        return this;
      }
      evs = ev.split(' ');
      for (_i = 0, _len = evs.length; _i < _len; _i++) {
        name = evs[_i];
        list = (_ref = this._callbacks) != null ? _ref[name] : void 0;
        if (!list) {
          continue;
        }
        if (!callback) {
          delete this._callbacks[name];
          continue;
        }
        for (i = _j = 0, _len1 = list.length; _j < _len1; i = ++_j) {
          cb = list[i];
          if (!(cb === callback)) {
            continue;
          }
          list = list.slice();
          list.splice(i, 1);
          this._callbacks[name] = list;
          break;
        }
      }
      return this;
    }
  };

  Events.on = Events.bind;

  Events.off = Events.unbind;

  Events.emit = Events.trigger;

  module.exports = Events;

}).call(this);

},{}],32:[function(require,module,exports){
var Events = require("./events");

var Module = require("./module");

var ModelUtils = require("../utils/model")

var Model = (function() {
  Module.clone(Model,Module);

  Model.extend(Events);

  Model.records = [];

  Model.irecords = {};

  Model.attributes = [];

  Model.configure = function() {
    var attributes, name;
    name = arguments[0], attributes = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
    this.className = name;
    this.deleteAll();
    if (attributes.length) {
      this.attributes = attributes;
    }
    this.attributes && (this.attributes = makeArray(this.attributes));
    this.attributes || (this.attributes = []);
    this.unbind();
    return this;
  };

  Model.toString = function() {
    return "" + this.className + "(" + (this.attributes.join(", ")) + ")";
  };

  Model.find = function(id, notFound) {
    if (notFound == null) {
      notFound = this.notFound;
    }
    var _ref = this.irecords[id]
    return (this.irecords[id] != null ? _ref.clone() : void 0) || (typeof notFound === "function" ? notFound(id) : void 0);
  };

  Model.findAll = function(ids, notFound) {
    var id, _i, _len, _results;
    _results = [];
    for (_i = 0, _len = ids.length; _i < _len; _i++) {
      id = ids[_i];
      if (this.find(id, notFound)) {
        _results.push(this.find(id));
      }
    }
    return _results;
  };

  Model.notFound = function(id) {
    return null;
  };

  Model.exists = function(id) {
    return Boolean(this.irecords[id]);
  };

  Model.addRecord = function(record, options) {
    var _base, _base1, _name, _name1;
    if (options == null) {
      options = {};
    }
    if (record.id && this.irecords[record.id]) {
      this.irecords[record.id].remove(options);
      if (!options.clear) {
        record = this.irecords[record.id].load(record);
      }
    }
    record.id || (record.id = record.cid);
    if ((_base = this.irecords)[_name = record.id] == null) {
      _base[_name] = record;
    }
    if ((_base1 = this.irecords)[_name1 = record.cid] == null) {
      _base1[_name1] = record;
    }
    return this.records.push(record);
  };

  Model.refresh = function(values, options) {
    var record, records, result, _i, _len;
    if (options == null) {
      options = {};
    }
    if (options.clear) {
      this.deleteAll();
    }
    records = this.fromJSON(values);
    if (!isArray(records)) {
      records = [records];
    }
    for (_i = 0, _len = records.length; _i < _len; _i++) {
      record = records[_i];
      this.addRecord(record, options);
    }
    this.sort();
    result = this.cloneArray(records);
    this.trigger('refresh', result, options);
    return result;
  };

  Model.select = function(callback) {
    var record, _i, _len, _ref, _results;
    _ref = this.records;
    _results = [];
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      record = _ref[_i];
      if (callback(record)) {
        _results.push(record.clone());
      }
    }
    return _results;
  };

  Model.findByAttribute = function(name, value) {
    var record, _i, _len, _ref;
    _ref = this.records;
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      record = _ref[_i];
      if (record[name] === value) {
        return record.clone();
      }
    }
    return null;
  };

  Model.findAllByAttribute = function(name, value) {
    return this.select(function(item) {
      return item[name] === value;
    });
  };

  Model.each = function(callback) {
    var record, _i, _len, _ref, _results;
    _ref = this.records;
    _results = [];
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      record = _ref[_i];
      _results.push(callback(record.clone()));
    }
    return _results;
  };

  Model.all = function() {
    return this.cloneArray(this.records);
  };

  Model.slice = function(begin, end) {
    if (begin == null) {
      begin = 0;
    }
    return this.cloneArray(this.records.slice(begin, end));
  };

  Model.first = function(end) {
    var _ref;
    if (end == null) {
      end = 1;
    }
    if (end > 1) {
      return this.cloneArray(this.records.slice(0, end));
    } else {
      return (_ref = this.records[0]) != null ? _ref.clone() : void 0;
    }
  };

  Model.last = function(begin) {
    var _ref;
    if (typeof begin === 'number') {
      return this.cloneArray(this.records.slice(-begin));
    } else {
      return (_ref = this.records[this.records.length - 1]) != null ? _ref.clone() : void 0;
    }
  };

  Model.count = function() {
    return this.records.length;
  };

  Model.deleteAll = function() {
    this.records = [];
    return this.irecords = {};
  };

  Model.destroyAll = function(options) {
    var record, _i, _len, _ref, _results;
    _ref = this.records;
    _results = [];
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      record = _ref[_i];
      _results.push(record.destroy(options));
    }
    return _results;
  };

  Model.update = function(id, atts, options) {
    return this.find(id).updateAttributes(atts, options);
  };

  Model.create = function(atts, options) {
    var record;
    record = new this(atts);
    return record.save(options);
  };

  Model.destroy = function(id, options) {
    return this.find(id).destroy(options);
  };

  Model.change = function(callbackOrParams) {
    if (typeof callbackOrParams === 'function') {
      return this.bind('change', callbackOrParams);
    } else {
      return this.trigger.apply(this, ['change'].concat(__slice.call(arguments)));
    }
  };

  Model.fetch = function(callbackOrParams) {
    if (typeof callbackOrParams === 'function') {
      return this.bind('fetch', callbackOrParams);
    } else {
      return this.trigger.apply(this, ['fetch'].concat(__slice.call(arguments)));
    }
  };

  Model.toJSON = function() {
    return this.records;
  };

  Model.fromJSON = function(objects) {
    var value, _i, _len, _results;
    if (!objects) {
      return;
    }
    if (typeof objects === 'string') {
      objects = JSON.parse(objects);
    }
    if (isArray(objects)) {
      _results = [];
      for (_i = 0, _len = objects.length; _i < _len; _i++) {
        value = objects[_i];
        if (value instanceof this) {
          _results.push(value);
        } else {
          _results.push(new this(value));
        }
      }
      return _results;
    } else {
      if (objects instanceof this) {
        return objects;
      }
      return new this(objects);
    }
  };

  Model.fromForm = function() {
    var _ref;
    return (_ref = new this).fromForm.apply(_ref, arguments);
  };

  Model.sort = function() {
    if (this.comparator) {
      this.records.sort(this.comparator);
    }
    return this;
  };

  Model.cloneArray = function(array) {
    var value, _i, _len, _results;
    _results = [];
    for (_i = 0, _len = array.length; _i < _len; _i++) {
      value = array[_i];
      _results.push(value.clone());
    }
    return _results;
  };

  Model.idCounter = 0;

  Model.uid = function(prefix) {
    var uid;
    if (prefix == null) {
      prefix = '';
    }
    uid = prefix + this.idCounter++;
    if (this.exists(uid)) {
      uid = this.uid(prefix);
    }
    return uid;
  };

  function Model(atts) {
    Model.__super__.constructor.apply(this, arguments);
    if ((this.constructor.uuid != null) && typeof this.constructor.uuid === 'function') {
      this.cid = this.constructor.uuid();
      if (!this.id) {
        this.id = this.cid;
      }
    } else {
      this.cid = (atts != null ? atts.cid : void 0) || this.constructor.uid('c-');
    }
    if (atts) {
      this.load(atts);
    }
  }

  Model.prototype.isNew = function() {
    return !this.exists();
  };

  Model.prototype.isValid = function() {
    return !this.validate();
  };

  Model.prototype.validate = function() {};

  Model.prototype.load = function(atts) {
    var key, value;
    if (atts.id) {
      this.id = atts.id;
    }
    for (key in atts) {
      value = atts[key];
      if (typeof this[key] === 'function') {
        if (typeof value === 'function') {
          continue;
        }
        this[key](value);
      } else {
        this[key] = value;
      }
    }
    return this;
  };

  Model.prototype.attributes = function() {
    var key, result, _i, _len, _ref;
    result = {};
    _ref = this.constructor.attributes;
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      key = _ref[_i];
      if (key in this) {
        if (typeof this[key] === 'function') {
          result[key] = this[key]();
        } else if(this[key] != null){
          result[key] = this[key];
        }
      }
    }
    if (this.id) {
      result.id = this.id;
    }
    return result;
  };

  Model.prototype.eql = function(rec) {
    return rec && rec.constructor === this.constructor && ((rec.cid === this.cid) || (rec.id && rec.id === this.id));
  };



  Model.prototype.stripCloneAttrs = function() {
    var key, value;
    if (this.hasOwnProperty('cid')) {
      return;
    }
    for (key in this) {
      if (!__hasProp.call(this, key)) continue;
      value = this[key];
      if ([].indexOf.call(this.constructor.attributes, key) >= 0) {
        delete this[key];
      }
    }
    return this;
  };

  Model.prototype.updateAttribute = function(name, value, options) {
    var atts;
    atts = {};
    atts[name] = value;
    return this.updateAttributes(atts, options);
  };

  Model.prototype.updateAttributes = function(atts, options) {
    this.load(atts);
    return this.save(options);
  };

  Model.prototype.changeID = function(id) {
    var records;
    if (id === this.id) {
      return;
    }
    records = this.constructor.irecords;
    records[id] = records[this.id];
    if (this.cid !== this.id) {
      delete records[this.id];
    }
    this.id = id;
    return this.save({ignoreAjax: true});
  };

  Model.prototype.remove = function(options) {
    var i, record, records, _i, _len;
    if (options == null) {
      options = {};
    }
    records = this.constructor.records.slice(0);
    for (i = _i = 0, _len = records.length; _i < _len; i = ++_i) {
      record = records[i];
      if (!(this.eql(record))) {
        continue;
      }
      records.splice(i, 1);
      break;
    }
    this.constructor.records = records;
    if (options.clear) {
      delete this.constructor.irecords[this.id];
      return delete this.constructor.irecords[this.cid];
    }
  };



  Model.prototype.dup = function(newRecord) {
    var atts;
    if (newRecord == null) {
      newRecord = true;
    }
    atts = this.attributes();
    if (newRecord) {
      delete atts.id;
    } else {
      atts.cid = this.cid;
    }
    return new this.constructor(atts);
  };

  Model.prototype.clone = function() {
    return createObject(this);
  };

  Model.prototype.reload = function() {
    var original;
    if (this.isNew()) {
      return this;
    }
    original = this.constructor.find(this.id);
    this.load(original.attributes());
    return original;
  };



  Model.prototype.toJSON = function() {
    return this.attributes();
  };

  Model.prototype.toString = function() {
    return "<" + this.constructor.className + " (" + (JSON.stringify(this)) + ")>";
  };

  Model.prototype.fromForm = function(form) {
    var checkbox, key, name, result, _i, _j, _k, _len, _len1, _len2, _name, _ref, _ref1, _ref2;
    result = {};
    _ref = $(form).find('[type=checkbox]:not([value])');
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      checkbox = _ref[_i];
      result[checkbox.name] = $(checkbox).prop('checked');
    }
    _ref1 = $(form).find('[type=checkbox][name$="[]"]');
    for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
      checkbox = _ref1[_j];
      name = checkbox.name.replace(/\[\]$/, '');
      result[name] || (result[name] = []);
      if ($(checkbox).prop('checked')) {
        result[name].push(checkbox.value);
      }
    }
    _ref2 = $(form).serializeArray();
    for (_k = 0, _len2 = _ref2.length; _k < _len2; _k++) {
      key = _ref2[_k];
      result[_name = key.name] || (result[_name] = key.value);
    }
    return this.load(result);
  };

  Model.prototype.exists = function() {
    return this.constructor.exists(this.id);
  };

  Model.prototype.refresh = function(data) {
    var root;
    root = this.constructor.irecords[this.id];
    root.load(data);
    this.trigger('refresh');
    return this;
  };

  Model.prototype.save = function(options) {
    var error, record;
    if (options == null) {
      options = {};
    }
    if (options.validate !== false) {
      error = this.validate();
      if (error) {
        this.trigger('error', error);
        return false;
      }
    }
    this.trigger('beforeSave', options);
    record = this.isNew() ? this.create(options) : this.update(options);
    this.stripCloneAttrs();
    this.trigger('save', options);
    return record;
  };

  Model.query = function(params,options){
    var _this = this;
    if(this.ajax) return this.ajax.call(this, 'query', params, options )
      .then(function(responseData){ 
        _this.refresh(responseData); 
        return responseData; 
      });
    throw "Ajax Module not defined"
  }

  Model.read = function(id, options){
    var _this = this;
    if(this.ajax) return this.ajax.call(this, 'read', id, options )
      .then(function(data){ 
        var instance = _this.exists(id);
        if(instance){ instance.refresh(data); return instance; } 
        return _this.create(data, { ignoreAjax: true }); 
      });
    throw "Ajax Module not defined"
  }

  Model.api = function(){
    var _this = this;
    if(this.ajax && this.ajax.api) return this.ajax.api.apply(this, arguments )
    throw "Ajax Module or api method not defined"
  }

  Model.prototype.create = function(options) {
    if(!options) options = {};
    var clone, record;
    var _this = this;
    this.trigger('beforeCreate', options);
    this.id || (this.id = this.cid);
    record = this.dup(false);
    var parentModel = this.constructor;
    parentModel.addRecord(record);
    parentModel.sort();
    clone = record.clone();
    clone.trigger('create', options);
    clone.trigger('change', 'create', options);


    if(parentModel.ajax && !options.ignoreAjax) return parentModel.ajax.call(clone, 'create', this.constructor, options )
      .then(function(data){ 
        if (!(ModelUtils.isBlank(data) || _this.destroyed)) {
          if (data.id && _this.id !== data.id) {
            _this.changeID(data.id);
          }
          _this.refresh(data);

          return _this;
        }
      });

    return clone;
  };


 Model.prototype.update = function(options) {
    if(!options) options = {};
    var _this = this;
    var clone, records;
    this.trigger('beforeUpdate', options);
    records = this.constructor.irecords;
    var parentModel = this.constructor;
    
    if(!parentModel.previousAttributes) parentModel.previousAttributes = {}
    var previousRecord = records[this.id]
    parentModel.previousAttributes[this.id] = JSON.stringify(previousRecord.attributes());
    previousRecord.load(this.attributes());
    this.constructor.sort();
    clone = records[this.id].clone();
    clone.trigger('update', options);
    clone.trigger('change', 'update', options);
    if(parentModel.ajax  && !options.ignoreAjax) return parentModel.ajax.call(clone, 'update', this.constructor, options )
      .then( function(data){ delete parentModel.previousAttributes[clone.id]; return clone; })
      .then(function(data){ if(data){_this.refresh(data)}; return clone; })
      .fail(function(err){  delete parentModel.previousAttributes[clone.id]; throw err; });

    return clone;
  };

  Model.prototype.destroy = function(options) {
    if (options == null) options = {};
    if (options.clear == null) options.clear = true;
    var _this = this;
    var parentModel = this.constructor;
    this.trigger('beforeDestroy', options);
    this.remove(options);
    this.destroyed = true;
    this.trigger('destroy', options);
    this.trigger('change', 'destroy', options);
    if (this.listeningTo) {
      this.stopListening();
    }
    this.unbind();
    if(parentModel.ajax  && !options.ignoreAjax) return parentModel.ajax.call(this, 'destroy', this.constructor, options )
      .then(function(){ return _this; });
    return this;
  };

  Model.prototype.bind = function(events, callback) {
    var binder, singleEvent, _fn, _i, _len, _ref;
    this.constructor.bind(events, binder = (function(_this) {
      return function(record) {
        if (record && _this.eql(record)) {
          return callback.apply(_this, arguments);
        }
      };
    })(this));
    _ref = events.split(' ');
    _fn = (function(_this) {
      return function(singleEvent) {
        var unbinder;
        return _this.constructor.bind("unbind", unbinder = function(record, event, cb) {
          if (record && _this.eql(record)) {
            if (event && event !== singleEvent) {
              return;
            }
            if (cb && cb !== callback) {
              return;
            }
            _this.constructor.unbind(singleEvent, binder);
            return _this.constructor.unbind("unbind", unbinder);
          }
        });
      };
    })(this);
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      singleEvent = _ref[_i];
      _fn(singleEvent);
    }
    return this;
  };

  Model.prototype.one = function(events, callback) {
    var handler;
    return this.bind(events, handler = (function(_this) {
      return function() {
        _this.unbind(events, handler);
        return callback.apply(_this, arguments);
      };
    })(this));
  };

  Model.prototype.trigger = function() {
    var args, _ref;
    args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
    args.splice(1, 0, this);
    return (_ref = this.constructor).trigger.apply(_ref, args);
  };

  Model.prototype.listenTo = function() {
    return Events.listenTo.apply(this, arguments);
  };

  Model.prototype.listenToOnce = function() {
    return Events.listenToOnce.apply(this, arguments);
  };

  Model.prototype.stopListening = function() {
    return Events.stopListening.apply(this, arguments);
  };

  Model.prototype.unbind = function(events, callback) {
    var event, _i, _len, _ref, _results;
    if (arguments.length === 0) {
      return this.trigger('unbind');
    } else if (events) {
      _ref = events.split(' ');
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        event = _ref[_i];
        _results.push(this.trigger('unbind', event, callback));
      }
      return _results;
    }
  };

  return Model;

})();

Model.setup = function(name, attributes) {
  var Instance;
  if (attributes == null) {
    attributes = [];
  }
  Instance = (function(_super) {
    
    Module.clone(Instance, _super);

    function Instance() {
      return Instance.__super__.constructor.apply(this, arguments);
    }

    return Instance;

  })(this);
  
  Instance.configure.apply(Instance, [name].concat(__slice.call(attributes)));
  return Instance;
};

Model.options = {};

var createObject = ModelUtils.createObject;
var isArray = ModelUtils.isArray;
var makeArray = ModelUtils.makeArray;

module.exports = Model

Model.prototype.on = Model.prototype.bind;
Model.prototype.off = Model.prototype.unbind;
Model.prototype.emit = Model.prototype.trigger;

__hasProp = {}.hasOwnProperty,
__slice = [].slice;
},{"../utils/model":34,"./events":31,"./module":33}],33:[function(require,module,exports){
var moduleKeywords = ['included', 'extended'];


var Module = function(){

  function Module() {
    if (typeof this.init === "function") {
      this.init.apply(this, arguments);
    }
  }
}

Module.include = function(obj) {
  if (!obj) throw new Error('include(obj) requires obj');
  for (var key in obj) if ( moduleKeywords.indexOf(key)  < 0) this.prototype[key] = obj[key];
  if (obj.included) obj.included.apply(this);
  return this;
};

Module.extend = function(obj) {
  if (!obj) throw new Error('extend(obj) requires obj');
  for (key in obj) if (moduleKeywords.indexOf(key) < 0) this[key] = obj[key];
  if (obj.extended) obj.extended.apply(this);
  return this;
};

Module.proxy = function(func) {
  return (function(_this) {
    return function() {
      return func.apply(_this, arguments);
    };
  })(this);
};

Module.prototype.proxy = Module.proxy;
  
Module.create = Module.sub = function(instances, statics) {
  var Result;
  Result = (function(_super) {
    Module.clone(Result, _super);

    function Result() {
      return Result.__super__.constructor.apply(this, arguments);
    }
    return Result;

  })(this);

  if (instances) {
    Result.include(instances);
  }
  if (statics) {
    Result.extend(statics);
  }
  if (typeof Result.unbind === "function") {
    Result.unbind();
  }
  return Result;
};


Module.clone = function(child, parent) { 
  for (var key in parent) { 
    if ({}.hasOwnProperty.call(parent, key)){
      child[key] = parent[key]; 
    }
  } 

  function ctor() { 
    this.constructor = child; 
  } 
  ctor.prototype = parent.prototype; 
  child.prototype = new ctor(); 
  child.__super__ = parent.prototype; 
  return child; 
};

module.exports = Module;
},{}],34:[function(require,module,exports){
var createObject = Object.create || function(o) {
  var Func;
  Func = function() {};
  Func.prototype = o;
  return new Func();
};

var isArray = function(value) {
  return Object.prototype.toString.call(value) === '[object Array]';
};


var makeArray = function(args) {
  return Array.prototype.slice.call(args, 0);
};

var isBlank = function(value) {
    var key;
    if (!value) {
      return true;
    }
    for (key in value) {
      return false;
    }
    return true;
  };

module.exports = {
	createObject: createObject,
	isArray: isArray,
	makeArray: makeArray,
	isBlank: isBlank
}
},{}],35:[function(require,module,exports){

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

},{}],36:[function(require,module,exports){
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

},{}]},{},[27])