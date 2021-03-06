/*!
 * @author mole <mole.chen@foxmail.com>
 * @version $Id: libadmin.js 226 2012-03-11 16:49:53Z mole1230 $
 */
(function(window) {
	var document = window.document,
		$ = window.jQuery,
		EQ = {};

	/**---------------------------------------------------------------------------------------------
	 * Loader begin
	 ---------------------------------------------------------------------------------------------*/
	(function () {
		var __head = document.head || document.getElementsByTagName("head")[0];
		var __waterfall = {};
		var __loaded = {};
		var __loading = {};
		var __configure = {
			autoload: false,
			core: "",
			serial: false,
			base: "",
			sleep: "/"
		};
		var __in, __debug = false;
	
		//in - load
		var __load = function (url, type, charset, callback) {
				if (__loading[url]) {
					if (callback) {
						setTimeout(function () {
							__load(url, type, charset, callback);
						}, 1);
						return;
					}
					return;
				}
	
				if (__loaded[url]) {
					if (callback) {
						callback();
						return;
					}
					return;
				}
	
				__loading[url] = true;
	
				var pureurl = url.split("?")[0];
				var n, t = type || pureurl.toLowerCase().substring(pureurl.lastIndexOf(".") + 1);
	
				if (t === "js") {
					n = document.createElement("script");
					n.type = "text/javascript";
					n.src = url;
					n.async = "true";
					if (charset) {
						n.charset = charset;
					}
				} else if (t === "css") {
					n = document.createElement("link");
					n.type = "text/css";
					n.rel = "stylesheet";
					n.href = url;
					__loaded[url] = true;
					__loading[url] = false;
					__head.appendChild(n);
					if (callback) {
						callback();
					}
					return;
				}
	
				n.onload = n.onreadystatechange = function () {
					if (!this.readyState || this.readyState === "loaded" || this.readyState === "complete") {
						__loading[url] = false;
						__loaded[url] = true;
	
						if (callback) {
							callback();
						}
	
						n.onload = n.onreadystatechange = null;
					}
				};
	
				n.onerror = function () {
					__loading[url] = false;
	
					if (callback) {
						callback();
					}
	
					n.onerror = null;
				};
	
				__head.appendChild(n);
			};
	
		//in - analyze
		var __analyze = function (array) {
				var riverflow = [],
					i;
				for (i = array.length - 1; i >= 0; i--) {
					var current = array[i];
					if (typeof (current) === "string") {
						if (!__waterfall[current]) {
							console && console.warn("model not found:" + current);
	
							continue;
						}
						riverflow.push(current);
						var relylist = __waterfall[current].rely;
						if (relylist) {
							riverflow = riverflow.concat(__analyze(relylist));
						}
					} else if (typeof (current) === "function") {
						riverflow.push(current);
					}
				}
				return riverflow;
			};
	
		//in - serial process
		var __stackline = function (blahlist) {
				var o = this;
				this.stackline = blahlist;
				this.current = this.stackline[0];
				this.bag = {
					returns: [],
					complete: false
				};
				this.start = function () {
					if (typeof (o.current) != "function" && __waterfall[o.current]) {
						__load(__waterfall[o.current].path, __waterfall[o.current].type, __waterfall[o.current].charset, o.next);
					} else {
						o.bag.returns.push(o.current());
						o.next();
					}
				};
				this.next = function () {
					if (o.stackline.length == 1 || o.stackline.length < 1) {
						o.bag.complete = true;
						if (o.bag.oncomplete) {
							o.bag.oncomplete(o.bag.returns);
						}
						return;
					}
					o.stackline.shift();
					o.current = o.stackline[0];
					o.start();
				};
			};
	
		//in - parallel process
		var __parallel = function (blahlist, callback) {
				var length = blahlist.length,
					i;
				var hook = function () {
						if (!--length && callback) {
							callback();
						}
					};
	
				if (length == 0) {
					callback && callback();
					return;
				}
	
				for (i = 0; i < blahlist.length; i++) {
					var current = __waterfall[blahlist[i]];
	
					if (typeof (blahlist[i]) == "function") {
						blahlist[i]();
						hook();
						continue;
					}
	
					if (current.rely && current.rely.length != 0) {
						__parallel(current.rely, (function (current) {
							return function () {
								__load(current.path, current.type, current.charset, hook);
							};
						})(current));
					} else {
						__load(current.path, current.type, current.charset, hook);
					}
				}
			};
	
		//in - add
		var __add = function (name, config) {
				if (!name || !config || !config.path) {
					return;
				}
				
				config.path = __configure["base"] + (__debug ? config.path : config.path.replace(/\.js$/, '.min.js'));
				__waterfall[name] = config;
			};
	
		//in - config
		var __config = function (name, conf) {
				__configure[name] = conf;
			};
	
		//in - inline css
		var __css = function (csstext) {
				var css = document.getElementById("in-inline-css");
	
				if (!css) {
					css = document.createElement("style");
					css.type = "text/css";
					css.id = "in-inline-css";
					__head.appendChild(css);
				}
	
				if (css.styleSheet) {
					css.styleSheet.cssText = css.styleSheet.cssText + csstext;
				} else {
					css.appendChild(document.createTextNode(csstext));
				}
			};
	
		//in - later
		var __later = function () {
				var args = [].slice.call(arguments);
				var timeout = args.shift();
				window.setTimeout(function () {
					__in.apply(this, args);
				}, timeout);
			};
	
		//in - main
		var __in = function () {
				var args = [].slice.call(arguments),
					callback;
	
				if (__configure.serial) {
					if (__configure.core && !__loaded[__configure.core]) {
						args = ["__core"].concat(args);
					}
					var blahlist = __analyze(args).reverse();
					var stack = new __stackline(blahlist);
					stack.start();
					return stack.bag;
				}
	
				if (typeof (args[args.length - 1]) === "function") {
					var callback = args.pop();
				}
	
				if (__configure.core && !__loaded[__configure.core]) {
					__parallel(["__core"], function () {
						__parallel(args, callback);
					});
				} else {
					__parallel(args, callback);
				}
			};
	
		//in - contentLoaded
		var __contentLoaded = function (win, fn) {
				var done = false,
					top = true,
					doc = win.document,
					root = doc.documentElement,
					add = doc.addEventListener ? "addEventListener" : "attachEvent",
					rem = doc.addEventListener ? "removeEventListener" : "detachEvent",
					pre = doc.addEventListener ? "" : "on",
	
					init = function (e) {
						if (e.type == "readystatechange" && doc.readyState != "complete") {
							return;
						}
						(e.type == "load" ? win : doc)[rem](pre + e.type, init, false);
						if (!done && (done = true)) {
							fn.call(win, e.type || e);
						}
					},
	
					poll = function () {
						try {
							root.doScroll("left");
						} catch (e) {
							setTimeout(poll, 50);
							return;
						}
						init("poll");
					};
	
				if (doc.readyState == "complete") {
					fn.call(win, "lazy");
				} else {
					if (doc.createEventObject && root.doScroll) {
						try {
							top = !win.frameElement;
						} catch (e) {}
						if (top) {
							poll();
						}
					}
					doc[add](pre + "DOMContentLoaded", init, false);
					doc[add](pre + "readystatechange", init, false);
					win[add](pre + "load", init, false);
				}
			};
	
		//in - ready
		var __ready = function () {
				var args = arguments;
				__contentLoaded(window, function () {
					__in.apply(this, args);
				});
			};
	
		//in - initialize
		(function () {
			var myself = (function () {
				var scripts = document.getElementsByTagName("script");
				return scripts[scripts.length - 1];
			})();
			var autoload = myself.getAttribute("autoload");
			var core = myself.getAttribute("core");
			var src = myself.getAttribute("src");
			__configure["base"] = src.replace(/\/js\/.+$/, "");
			__configure["sleep"] = myself.getAttribute("sleep") || '/';
			__debug = !(/\.min\.js$/.test(src));
			
			if (core) {
				__configure["autoload"] = eval(autoload);
				__configure["core"] = core;
				__add("__core", {
					path: __configure.core
				});
			}
	
			//autoload the core files
			if (__configure.autoload && __configure.core) {
				__in();
			}
		})();
	
		//in - bind the method
		__in.add = __add;
		__in.config = __config;
		__in.css = __css;
		__in.later = __later;
		__in.load = __load;
		__in.ready = __ready;
		EQ.In = __in;
		EQ.debug = __debug;
	})();
	
	/**---------------------------------------------------------------------------------------------
	 * Module config begin
	 ---------------------------------------------------------------------------------------------*/
	EQ.In.add("jquery.utils", {path: "/js/jquery/jquery.utils.js", type: "js"});
	
	/**--------------------------------------------------------------------------------------------
	 * Api begin
	 --------------------------------------------------------------------------------------------*/
	EQ.log = function() {
		if (EQ.debug && window.console && window.console.log) {
			window.console.log.apply(window.console, arguments);
		}
	};
	
	EQ.cookie = function (key, value, options) {
		// key and at least value given, set cookie...
		if (arguments.length > 1 && String(value) !== "[object Object]") {
			options = jQuery.extend({}, options);

			if (value === null || value === undefined) {
				options.expires = -1;
			}

			if (typeof options.expires === 'number') {
				var days = options.expires,
					t = options.expires = new Date();
				t.setDate(t.getDate() + days);
			}

			value = String(value);

			return (document.cookie = [
			encodeURIComponent(key), '=', options.raw ? value : encodeURIComponent(value), options.expires ? '; expires=' + options.expires.toUTCString() : '', // use expires attribute, max-age is not supported by IE
			options.path ? '; path=' + options.path : '', options.domain ? '; domain=' + options.domain : '', options.secure ? '; secure' : ''].join(''));
		}

		// key and possibly options given, get cookie...
		options = value || {};
		var result, decode = options.raw ? function (s) {return s;} : decodeURIComponent;
		return (result = new RegExp('(?:^|; )' + encodeURIComponent(key) + '=([^;]*)').exec(document.cookie)) ? decode(result[1]) : null;
	};
	
	EQ.date = function(format, timestamp) {
		var that = this,
			jsdate, f, formatChr = /\\?([a-z])/gi,
			formatChrCb,
			_pad = function(n, c) {
				if ((n = n + "").length < c) {
					return new Array((++c) - n.length).join("0") + n;
				} else {
					return n;
				}
			},
			txt_words = ["Sun", "Mon", "Tues", "Wednes", "Thurs", "Fri", "Satur", "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
			txt_ordin = {1: "st", 2: "nd", 3: "rd", 21: "st", 22: "nd", 23: "rd", 31: "st"};
		formatChrCb = function(t, s) {
			return f[t] ? f[t]() : s;
		};
		f = {
			// Day
			d: function() { // Day of month w/leading 0; 01..31
				return _pad(f.j(), 2);
			},
			D: function() { // Shorthand day name; Mon...Sun
				return f.l().slice(0, 3);
			},
			j: function() { // Day of month; 1..31
				return jsdate.getDate();
			},
			l: function() { // Full day name; Monday...Sunday
				return txt_words[f.w()] + 'day';
			},
			N: function() { // ISO-8601 day of week; 1[Mon]..7[Sun]
				return f.w() || 7;
			},
			S: function() { // Ordinal suffix for day of month; st, nd, rd, th
				return txt_ordin[f.j()] || 'th';
			},
			w: function() { // Day of week; 0[Sun]..6[Sat]
				return jsdate.getDay();
			},
			z: function() { // Day of year; 0..365
				var a = new Date(f.Y(), f.n() - 1, f.j()),
					b = new Date(f.Y(), 0, 1);
				return Math.round((a - b) / 864e5) + 1;
			},

			// Week
			W: function() { // ISO-8601 week number
				var a = new Date(f.Y(), f.n() - 1, f.j() - f.N() + 3),
					b = new Date(a.getFullYear(), 0, 4);
				return 1 + Math.round((a - b) / 864e5 / 7);
			},

			// Month
			F: function() { // Full month name; January...December
				return txt_words[6 + f.n()];
			},
			m: function() { // Month w/leading 0; 01...12
				return _pad(f.n(), 2);
			},
			M: function() { // Shorthand month name; Jan...Dec
				return f.F().slice(0, 3);
			},
			n: function() { // Month; 1...12
				return jsdate.getMonth() + 1;
			},
			t: function() { // Days in month; 28...31
				return (new Date(f.Y(), f.n(), 0)).getDate();
			},

			// Year
			L: function() { // Is leap year?; 0 or 1
				return new Date(f.Y(), 1, 29).getMonth() === 1 | 0;
			},
			o: function() { // ISO-8601 year
				var n = f.n(),
					W = f.W(),
					Y = f.Y();
				return Y + (n === 12 && W < 9 ? -1 : n === 1 && W > 9);
			},
			Y: function() { // Full year; e.g. 1980...2010
				return jsdate.getFullYear();
			},
			y: function() { // Last two digits of year; 00...99
				return (f.Y() + "").slice(-2);
			},

			// Time
			a: function() { // am or pm
				return jsdate.getHours() > 11 ? "pm" : "am";
			},
			A: function() { // AM or PM
				return f.a().toUpperCase();
			},
			B: function() { // Swatch Internet time; 000..999
				var H = jsdate.getUTCHours() * 36e2,
					// Hours
					i = jsdate.getUTCMinutes() * 60,
					// Minutes
					s = jsdate.getUTCSeconds(); // Seconds
				return _pad(Math.floor((H + i + s + 36e2) / 86.4) % 1e3, 3);
			},
			g: function() { // 12-Hours; 1..12
				return f.G() % 12 || 12;
			},
			G: function() { // 24-Hours; 0..23
				return jsdate.getHours();
			},
			h: function() { // 12-Hours w/leading 0; 01..12
				return _pad(f.g(), 2);
			},
			H: function() { // 24-Hours w/leading 0; 00..23
				return _pad(f.G(), 2);
			},
			i: function() { // Minutes w/leading 0; 00..59
				return _pad(jsdate.getMinutes(), 2);
			},
			s: function() { // Seconds w/leading 0; 00..59
				return _pad(jsdate.getSeconds(), 2);
			},
			u: function() { // Microseconds; 000000-999000
				return _pad(jsdate.getMilliseconds() * 1000, 6);
			},

			// Timezone
			e: function() { // Timezone identifier; e.g. Atlantic/Azores, ...
				throw 'Not supported (see source code of date() for timezone on how to add support)';
			},
			I: function() { // DST observed?; 0 or 1
				// Compares Jan 1 minus Jan 1 UTC to Jul 1 minus Jul 1 UTC.
				// If they are not equal, then DST is observed.
				var a = new Date(f.Y(), 0),
					// Jan 1
					c = Date.UTC(f.Y(), 0),
					// Jan 1 UTC
					b = new Date(f.Y(), 6),
					// Jul 1
					d = Date.UTC(f.Y(), 6); // Jul 1 UTC
				return 0 + ((a - c) !== (b - d));
			},
			O: function() { // Difference to GMT in hour format; e.g. +0200
				var a = jsdate.getTimezoneOffset();
				return (a > 0 ? "-" : "+") + _pad(Math.abs(a / 60 * 100), 4);
			},
			P: function() { // Difference to GMT w/colon; e.g. +02:00
				var O = f.O();
				return (O.substr(0, 3) + ":" + O.substr(3, 2));
			},
			T: function() { // Timezone abbreviation; e.g. EST, MDT, ...
				return 'UTC';
			},
			Z: function() { // Timezone offset in seconds (-43200...50400)
				return -jsdate.getTimezoneOffset() * 60;
			},

			// Full Date/Time
			c: function() { // ISO-8601 date.
				return 'Y-m-d\\Th:i:sP'.replace(formatChr, formatChrCb);
			},
			r: function() { // RFC 2822
				return 'D, d M Y H:i:s O'.replace(formatChr, formatChrCb);
			},
			U: function() { // Seconds since UNIX epoch
				return jsdate.getTime() / 1000 | 0;
			}
		};
		this.date = function(format, timestamp) {
			that = this;
			jsdate = ((typeof timestamp === 'undefined') ? new Date() : // Not provided
			(timestamp instanceof Date) ? new Date(timestamp) : // JS Date()
			new Date(timestamp * 1000) // UNIX timestamp (auto-convert to int)
			);
			return format.replace(formatChr, formatChrCb);
		};
		return this.date(format, timestamp);
	};
	
	/**---------------------------------------------------------------------------------------------
	 * Widgets begin
	 ---------------------------------------------------------------------------------------------*/
	EQ.Widgets = {
		gridAjaxOperate: function(s, options) {
			// delete row
			function _delete(e, $this, s, attr) {
				try {
					s.element = $this;
					s.beforeSend = function(jqXhr, setting) {
						if (attr.confirm && !window.confirm(attr.confirm)) {
							return false;
						}

						return true;
					};

					var jqXhr = $.ajax($this.attr("href"), s);
					jqXhr && jqXhr.success(function(e) {
						$this.closest(s.closest || "tr").remove();
					});
				} catch (ex) {
					EQ.log(ex);
				}
			}
			
			// toggle
			function _toggle(e, $this, s, attr) {
				try {
					var i, val, text = $this.text();
					for (i in attr.labels) {
						if (attr.labels[i] != text) {
							val = i;
							break;
						}
					}
					s.element = $this;
					s.data = {val: val};
					$.ajax($this.attr("href"), s).success(function(e) {
						$this.text(attr.labels[val]);
					});
				} catch (ex) {
					EQ.log(ex);
				}
			}
			
			// bind event
			$(s).live("click", function(e) {
				var $this = $(this),
					attr = $this.data("attr") || {},
					s = options || {};

				if (attr.ajax) {
					switch (attr.type) {
						case "delete":
							_delete(e, $this, s, attr);
							break;
						case "toggle":
							_toggle(e, $this, s, attr);
							break;
						default:
							break;
					}

					return false;
				}
				
				return true;
			});
		},
		
		ajaxGlobal: function(s) {
			$(s).ajaxStart(function() {
				$(this).show();
			}).ajaxStop(function() {
				$(this).hide();
			});
		}
	};

	/**---------------------------------------------------------------------------------------------
	 * Massage begin
	 ---------------------------------------------------------------------------------------------*/
	EQ.Msg = function(options) {
		this.options = options || {};
		this.timer = null;	
	};
	
	EQ.Msg.prototype = {
		show: function(msg, delay, className) {
			var s = this.options,
				m = msg || "",
				d = delay || 3,
				c = className || "info",
				$box = $(s.boxSel), $content = $(s.contentSel);
			if ($box.length < 1) {
				return;
			}

			if (!$box.data("EQ_ORG_CLASS")) {
				$box.data("EQ_ORG_CLASS", $box.attr("class"));
			}

			window.clearTimeout(this.timer);
			$content.html(m);
			$box.removeClass().addClass($box.data("EQ_ORG_CLASS")).addClass(c).show();
			this.timer = window.setTimeout(function() {
				$box.fadeOut();
			}, d * 1000);
		},
		success: function(msg, delay) {
			this.show(msg, delay, "success");
		},
		failure: function(msg, delay) {
			this.show(msg, delay, "failure");
		},
		info: function(msg, delay) {
			this.show(msg, delay, "info");
		}
	};
	
	window.EQ = EQ;
}(window));

(function($) {
	// extend ajax
	var msg = window.EQ.Widgets.ajaxMsg = new window.EQ.Msg({boxSel: "#msgbox", contentSel: "#msgbox-content"});
	$.ajaxPrefilter(function(options, originalOptions, jqXhr) {
		if (options.element) {
			var $el = $(options.element),
				count = $el.data("EQ_AJAX_COUNT") || 0;
			if (count > 0) {
				jqXhr.abort();
			} else {
				$el.data("EQ_AJAX_COUNT", ++count);
				jqXhr.complete(function() {
					$el.data("EQ_AJAX_COUNT", --count);
				});
			}
		}
	});
	$.ajaxSetup({
		statusCode: {
			"400": function() {msg.failure("\u53c2\u6570\u9519\u8bef");},
			"401": function() {msg.failure("\u8bf7\u60a8\u5148\u767b\u9646");},
			"403": function() {msg.failure("\u672a\u6388\u6743");},
			"404": function() {msg.failure("\u60a8\u8bbf\u95ee\u7684\u9875\u9762\u4e0d\u5b58\u5728");},
			"500": function() {msg.failure("\u670d\u52a1\u5668\u5185\u90e8\u9519\u8bef");},
			"502": function() {msg.failure("\u670d\u52a1\u5668\u7e41\u5fd9\uff0c\u8bf7\u7a0d\u5019\u518d\u8bd5");}
		}
	});
}(jQuery));

// DOM ready
jQuery(function($) {
	var EQ = window.EQ;
	EQ.Widgets.gridAjaxOperate("div.grid-view tbody a");
	try {
		EQ.Widgets.ajaxGlobal(window.top.frames["top-frame"].document.getElementById("ajax"));
	} catch (e) {
		EQ.log(e);
	}
});