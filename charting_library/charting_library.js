(function() {

if (window.TradingView) {
	return;
}

var TradingView = {

	version: function() {
		return "0.7";
	},

	gEl : function(id) {
		return document.getElementById(id);
	},
	gId : function() {
		return 'tradingview_' + (((1+Math.random())*0x100000)|0).toString(16).substring(1);
	},
	onready : function(callback) {
		if (window.addEventListener) {
			window.addEventListener('DOMContentLoaded', callback, false);
		} else {
			window.attachEvent('onload', callback);
		}
	},
	css : function(css_content) {
		var head = document.getElementsByTagName('head')[0],
			style = document.createElement('style'), rules;

		style.type = 'text/css';
		if (style.styleSheet) {
			style.styleSheet.cssText = css_content;
		} else {
			rules = document.createTextNode(css_content);
			style.appendChild(rules);
		}
		head.appendChild(style);
	},
	bindEvent : function(o, ev, fn){
		if (o.addEventListener){
			o.addEventListener(ev, fn, false);
		} else if (o.attachEvent){
			o.attachEvent('on' + ev, fn);
		}
	},
	unbindEvent : function(o, ev, fn){
		if (o.removeEventListener){
			o.removeEventListener(ev, fn, false);
		} else if (o.detachEvent){
			o.detachEvent('on' + ev, fn);
		}
	},



	widget : function(options) {
		this.id = TradingView.gId();
		var _url_params = TradingView.getUrlParams();
		var _symbol = _url_params.symbol || options.symbol || 'FX:SPX500';

		if (!options.datafeed) {
			throw "Datafeed is not defined";
		}

		this.options = {
			width : options.width || 800,
			height : options.height || 500,
			symbol : _symbol,
			interval : options.interval || '1',
			timezone : options.timezone || '',
			autosize : options.autosize,
			save_image : options.save_image !== undefined ? options.save_image : true,
			container : options.container_id || '',
			toolbar_bg : options.toolbar_bg || 'f4f7f9',
			studies : options.studies || [],
			theme : options.theme || '',
			widgetbar_width: +options.widgetbar_width || undefined,
			datafeed: options.datafeed,
			path: options.library_path,
			enabledStudies: options.enabled_studies || [],
			enabledDrawings: options.enabled_drawings || [],
			disabledDrawings: options.disabled_drawings || [],
			savedData: options.savedData || undefined,
			locale: options.locale
		};

		if (options.news && options.news.length){
			this.options.news_vendors = [];
			for (var i=0; i<options.news.length; i++){
				switch (options.news[i]){
					case 'headlines':
					case 'stocktwits':
						this.options.news_vendors.push(options.news[i]);
				}
			}
			if (!this.options.news_vendors){
				delete this.options.news_vendors;
			}
		}

		if (isFinite(options.widgetbar_width) && options.widgetbar_width > 0){
			this.options.widgetbar_width = options.widgetbar_width;
		}

		this._ready_handlers = [];
		this.create();
	},
};


TradingView.widget.prototype = {

	_messageTarget: function () { return TradingView.gEl(this.id).contentWindow },

	create : function() {
		var widget_html = this.render(),
			self = this,
			c;
		if (this.options.container) {
			TradingView.gEl(this.options.container).innerHTML = widget_html;
		} else {
			document.write(widget_html);
		}

		c = TradingView.gEl(this.id);
		this.postMessage = TradingView.postMessageWrapper(c.contentWindow, this.id);
		TradingView.bindEvent(c, 'load', function() {
			self.postMessage.get('widgetReady', {}, function() {
				var i;
				self._ready = true;
				for (i = self._ready_handlers.length; i--;) {
					self._ready_handlers[i].call(self);
				}

				self.postMessage.post(c.contentWindow, "initializationFinished")
			});
		});
	},

	render : function() {

		window.Datafeed = this.options.datafeed;

		var url = (this.options.path || "") + "static/tv-chart.html" +
			'?localserver=1' +
			'&symbol=' + encodeURIComponent(this.options.symbol) +
			'&interval=' + encodeURIComponent(this.options.interval) +
			'&toolbarbg=' + this.options.toolbar_bg.replace('#', '') +
			(this.options.widgetbar_width ? '&widgetbarwidth=' + this.options.widgetbar_width : '') +
			(this.options.studies ? '&studies='+encodeURIComponent(this.options.studies.join('\x1F')) : '') +
			(this.options.theme ? '&theme='+encodeURIComponent(this.options.theme) : '') +
			'&enabledStudies='+ encodeURIComponent(JSON.stringify(this.options.enabledStudies)) +
			'&enabledDrawings='+ encodeURIComponent(JSON.stringify(this.options.enabledDrawings)) +
			'&disabledDrawings='+ encodeURIComponent(JSON.stringify(this.options.disabledDrawings)) +
			'&locale='+ encodeURIComponent(this.options.locale) +
			(this.options.timezone ? '&timezone='+encodeURIComponent(this.options.timezone) : '');

		if (!!this.options.savedData) {
			window.__TVSavedChart = this.options.savedData;
		}

		return '<iframe id="' + this.id + '"' +
			' src="' + url + '"' +
			( this.options.autosize
				? ' style="width: 100%; height: 100%;"'
				: ' width="' + this.options.width + '"' + ' height="' + this.options.height + '"'
			) +
			' frameborder="0" allowTransparency="true" scrolling="no"></iframe>';
	},

	onChartReady : function(callback) {
		if (this._ready) {
			callback.call(this);
		} else {
			this._ready_handlers.push(callback);
		}
	},

	setSymbol: function(symbol, interval) {
		this.postMessage.post(this._messageTarget(), 'changeSymbol', {
			symbol: symbol,
			interval: interval
		});
	},

	createStudy: function(name, lock) {
		this.postMessage.post(this._messageTarget(), 'createStudy', {name: name, lock: lock});
	},

	createShape: function(point, options) {
		this.postMessage.post(this._messageTarget(), 'createShape', {
			point: point,
			options: options
		});

		var that = this;
		this.postMessage.on('onIconCreated', function(uid) {
			that.postMessage.on('onIconClicked', function(clickedIconUid) {
				if (uid == clickedIconUid) {
					//	onClickedCallback();
				}
			})
		});
	},

	removeIcon: function(uid) {
	},


	onSymbolChange: function(callback) {
		this.postMessage.on('onSymbolChange', callback);
	},

	onTick: function(callback) {
		this.postMessage.on('onTick', callback);
	},

	remove : function() {
		var widget = TradingView.gEl(this.id);
		widget.parentNode.removeChild(widget);
	},

	onAutoSaveNeeded : function(callback) {
		this.postMessage.on('onAutoSaveNeeded', callback);
	},

	save : function(callback) {
		this.postMessage.on('onChartSaved', callback);
		this.postMessage.post(this._messageTarget(), 'saveChart', {});
	},

	load : function(json) {
		window.__TVSavedChart = json;
		this.remove();
		this.create();
	}
};


TradingView.postMessageWrapper = (function() {
	var get_handlers = {},
		on_handlers = {},
		client_targets = {},
		on_target,
		call_id = 0,
		post_id = 0,
		provider_id = 'TradingView';

	if (window.addEventListener){
		window.addEventListener('message', function (e) {
			var msg, i;
			try {
				msg = JSON.parse(e.data);
			} catch (e) {
				return;
			}
			if (!msg.provider || msg.provider != provider_id) {
				return;
			}
			if (msg.type == 'get') {
				on_handlers[msg.name].call(msg, msg.data, function(result) {
					var reply = {
						id: msg.id,
						type: 'on',
						name: msg.name,
						client_id: msg.client_id,
						data: result,
						provider: provider_id
					};
					on_target.postMessage(JSON.stringify(reply), '*');
				});
			} else if (msg.type == 'on') {
				if (get_handlers[msg.client_id] && get_handlers[msg.client_id][msg.id]) {
					get_handlers[msg.client_id][msg.id].call(msg, msg.data);
					delete get_handlers[msg.client_id][msg.id];
				}
			} else if (msg.type == 'post') {
				if (typeof on_handlers[msg.name] === "function") {
					on_handlers[msg.name].call(msg, msg.data, function(){});
				}
			}
		});
	}

	return function(target, client_id) {
		get_handlers[client_id] = {};
		client_targets[client_id] = target;
		on_target = target;

		return {
			on : function(name, callback) {
				on_handlers[name] = callback;
			},

			get : function(name, data, callback) {
				var msg = {
					id: call_id++,
					type: 'get',
					name: name,
					client_id: client_id,
					data: data,
					provider: provider_id
				};
				get_handlers[client_id][msg.id] = callback;
				client_targets[client_id].postMessage(JSON.stringify(msg), '*');
			},

			post : function(target, name, data) {
				var msg = {
					id: post_id++,
					type: 'post',
					name: name,
					data: data,
					provider: provider_id
				};
				if (target && typeof target.postMessage === 'function'){
					target.postMessage(JSON.stringify(msg), '*')
				}
			}
		};
	};
})();


TradingView.getUrlParams = function () {
	var match,
		pl     = /\+/g,
		search = /([^&=]+)=?([^&]*)/g,
		decode = function (s) { return decodeURIComponent(s.replace(pl, " ")); },
		query  = window.location.search.substring(1),
		result = {};

	while (match = search.exec(query)) {
		result[decode(match[1])] = decode(match[2]);
	}
	return result;
};


if (window.TradingView && jQuery) {
	jQuery.extend(window.TradingView, TradingView);
} else {
	window.TradingView = TradingView;
}
})();