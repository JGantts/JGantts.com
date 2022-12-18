<template>
  <div id="app">
  		<div id="wrapper">
  			<div id="main">
          <router-view/>
  			</div>
  		</div>
  </div>
</template>

<script>
/* Carrd Site JS | carrd.co | License: MIT */

(function() {

	var	on = addEventListener,
		$ = function(q) { return document.querySelector(q) },
		$$ = function(q) { return document.querySelectorAll(q) },
		$body = document.body,
		$inner = $('.inner'),
		client = (function() {

			var o = {
					browser: 'other',
					browserVersion: 0,
					os: 'other',
					osVersion: 0,
					mobile: false,
					canUse: null,
					flags: {
						lsdUnits: false,
					},
				},
				ua = navigator.userAgent,
				a, i;

			// browser, browserVersion.
				a = [
					['firefox',		/Firefox\/([0-9\.]+)/],
					['edge',		/Edge\/([0-9\.]+)/],
					['safari',		/Version\/([0-9\.]+).+Safari/],
					['chrome',		/Chrome\/([0-9\.]+)/],
					['chrome',		/CriOS\/([0-9\.]+)/],
					['ie',			/Trident\/.+rv:([0-9]+)/]
				];

				for (i=0; i < a.length; i++) {

					if (ua.match(a[i][1])) {

						o.browser = a[i][0];
						o.browserVersion = parseFloat(RegExp.$1);

						break;

					}

				}

			// os, osVersion.
				a = [
					['ios',			/([0-9_]+) like Mac OS X/,			function(v) { return v.replace('_', '.').replace('_', ''); }],
					['ios',			/CPU like Mac OS X/,				function(v) { return 0 }],
					['ios',			/iPad; CPU/,						function(v) { return 0 }],
					['android',		/Android ([0-9\.]+)/,				null],
					['mac',			/Macintosh.+Mac OS X ([0-9_]+)/,	function(v) { return v.replace('_', '.').replace('_', ''); }],
					['windows',		/Windows NT ([0-9\.]+)/,			null],
					['undefined',	/Undefined/,						null],
				];

				for (i=0; i < a.length; i++) {

					if (ua.match(a[i][1])) {

						o.os = a[i][0];
						o.osVersion = parseFloat( a[i][2] ? (a[i][2])(RegExp.$1) : RegExp.$1 );

						break;

					}

				}

				// Hack: Detect iPads running iPadOS.
					if (o.os == 'mac'
					&&	('ontouchstart' in window)
					&&	(

						// 12.9"
							(screen.width == 1024 && screen.height == 1366)
						// 10.2"
							||	(screen.width == 834 && screen.height == 1112)
						// 9.7"
							||	(screen.width == 810 && screen.height == 1080)
						// Legacy
							||	(screen.width == 768 && screen.height == 1024)

					))
						o.os = 'ios';

			// mobile.
				o.mobile = (o.os == 'android' || o.os == 'ios');

			// canUse.
				var _canUse = document.createElement('div');

				o.canUse = function(property, value) {

					var style;

					// Get style.
						style = _canUse.style;

					// Property doesn't exist? Can't use it.
						if (!(property in style))
							return false;

					// Value provided?
						if (typeof value !== 'undefined') {

							// Assign value.
								style[property] = value;

							// Value is empty? Can't use it.
								if (style[property] == '')
									return false;

						}

					return true;

				};

			// flags.
				o.flags.lsdUnits = o.canUse('width', '100dvw');

			return o;

		}()),
		trigger = function(t) {
			dispatchEvent(new Event(t));
		},
		cssRules = function(selectorText) {

			var ss = document.styleSheets,
				a = [],
				f = function(s) {

					var r = s.cssRules,
						i;

					for (i=0; i < r.length; i++) {

						if (r[i] instanceof CSSMediaRule && matchMedia(r[i].conditionText).matches)
							(f)(r[i]);
						else if (r[i] instanceof CSSStyleRule && r[i].selectorText == selectorText)
							a.push(r[i]);

					}

				},
				x, i;

			for (i=0; i < ss.length; i++)
				f(ss[i]);

			return a;

		},
		thisHash = function() {

			var h = location.hash ? location.hash.substring(1) : null,
				a;

			// Null? Bail.
				if (!h)
					return null;

			// Query string? Move before hash.
				if (h.match(/\?/)) {

					// Split from hash.
						a = h.split('?');
						h = a[0];

					// Update hash.
						history.replaceState(undefined, undefined, '#' + h);

					// Update search.
						window.location.search = a[1];

				}

			// Prefix with "x" if not a letter.
				if (h.length > 0
				&&	!h.match(/^[a-zA-Z]/))
					h = 'x' + h;

			// Convert to lowercase.
				if (typeof h == 'string')
					h = h.toLowerCase();

			return h;

		},
		scrollToElement = function(e, style, duration) {

			var y, cy, dy,
				start, easing, offset, f;

			// Element.

				// No element? Assume top of page.
					if (!e)
						y = 0;

				// Otherwise ...
					else {

						offset = (e.dataset.scrollOffset ? parseInt(e.dataset.scrollOffset) : 0) * parseFloat(getComputedStyle(document.documentElement).fontSize);

						switch (e.dataset.scrollBehavior ? e.dataset.scrollBehavior : 'default') {

							case 'default':
							default:

								y = e.offsetTop + offset;

								break;

							case 'center':

								if (e.offsetHeight < window.innerHeight)
									y = e.offsetTop - ((window.innerHeight - e.offsetHeight) / 2) + offset;
								else
									y = e.offsetTop - offset;

								break;

							case 'previous':

								if (e.previousElementSibling)
									y = e.previousElementSibling.offsetTop + e.previousElementSibling.offsetHeight + offset;
								else
									y = e.offsetTop + offset;

								break;

						}

					}

			// Style.
				if (!style)
					style = 'smooth';

			// Duration.
				if (!duration)
					duration = 750;

			// Instant? Just scroll.
				if (style == 'instant') {

					window.scrollTo(0, y);
					return;

				}

			// Get start, current Y.
				start = Date.now();
				cy = window.scrollY;
				dy = y - cy;

			// Set easing.
				switch (style) {

					case 'linear':
						easing = function (t) { return t };
						break;

					case 'smooth':
						easing = function (t) { return t<.5 ? 4*t*t*t : (t-1)*(2*t-2)*(2*t-2)+1 };
						break;

				}

			// Scroll.
				f = function() {

					var t = Date.now() - start;

					// Hit duration? Scroll to y and finish.
						if (t >= duration)
							window.scroll(0, y);

					// Otherwise ...
						else {

							// Scroll.
								window.scroll(0, cy + (dy * easing(t / duration)));

							// Repeat.
								requestAnimationFrame(f);

						}

				};

				f();

		},
		scrollToTop = function() {

			// Scroll to top.
				scrollToElement(null);

		},
		loadElements = function(parent) {

			var a, e, x, i;

			// IFRAMEs.

				// Get list of unloaded IFRAMEs.
					a = parent.querySelectorAll('iframe[data-src]:not([data-src=""])');

				// Step through list.
					for (i=0; i < a.length; i++) {

						// Load.
							a[i].contentWindow.location.replace(a[i].dataset.src);

						// Save initial src.
							a[i].dataset.initialSrc = a[i].dataset.src;

						// Mark as loaded.
							a[i].dataset.src = '';

					}

			// Video.

				// Get list of videos (autoplay).
					a = parent.querySelectorAll('video[autoplay]');

				// Step through list.
					for (i=0; i < a.length; i++) {

						// Play if paused.
							if (a[i].paused)
								a[i].play();

					}

			// Autofocus.

				// Get first element with data-autofocus attribute.
					e = parent.querySelector('[data-autofocus="1"]');

				// Determine type.
					x = e ? e.tagName : null;

					switch (x) {

						case 'FORM':

							// Get first input.
								e = e.querySelector('.field input, .field select, .field textarea');

							// Found? Focus.
								if (e)
									e.focus();

							break;

						default:
							break;

					}

		},
		unloadElements = function(parent) {

			var a, e, x, i;

			// IFRAMEs.

				// Get list of loaded IFRAMEs.
					a = parent.querySelectorAll('iframe[data-src=""]');

				// Step through list.
					for (i=0; i < a.length; i++) {

						// Don't unload? Skip.
							if (a[i].dataset.srcUnload === '0')
								continue;

						// Mark as unloaded.

							// IFRAME was previously loaded by loadElements()? Use initialSrc.
								if ('initialSrc' in a[i].dataset)
									a[i].dataset.src = a[i].dataset.initialSrc;

							// Otherwise, just use src.
								else
									a[i].dataset.src = a[i].src;

						// Unload.
							a[i].contentWindow.location.replace('about:blank');

					}

			// Video.

				// Get list of videos.
					a = parent.querySelectorAll('video');

				// Step through list.
					for (i=0; i < a.length; i++) {

						// Pause if playing.
							if (!a[i].paused)
								a[i].pause();

					}

			// Autofocus.

				// Get focused element.
					e = $(':focus');

				// Found? Blur.
					if (e)
						e.blur();


		};

		// Expose scrollToElement.
			window._scrollToTop = scrollToTop;

	// "On Load" animation.
		on('load', function() {
			setTimeout(function() {
				$body.className = $body.className.replace(/\bis-loading\b/, 'is-playing');

				setTimeout(function() {
					$body.className = $body.className.replace(/\bis-playing\b/, 'is-ready');
				}, 3000);
			}, 100);
		});

	// Load elements (if needed).
		loadElements(document.body);

	// Browser hacks.

		// Init.
			var style, sheet, rule;

			// Create <style> element.
				style = document.createElement('style');
				style.appendChild(document.createTextNode(''));
				document.head.appendChild(style);

			// Get sheet.
				sheet = style.sheet;

		// Mobile.
			if (client.mobile) {

				// Prevent overscrolling on Safari/other mobile browsers.
				// 'vh' units don't factor in the heights of various browser UI elements so our page ends up being
				// a lot taller than it needs to be (resulting in overscroll and issues with vertical centering).
					(function() {

						// Lsd units available?
							if (client.flags.lsdUnits) {

								document.documentElement.style.setProperty('--viewport-height', '100dvh');
								document.documentElement.style.setProperty('--background-height', '100lvh');

							}

						// Otherwise, use innerHeight hack.
							else {

								var f = function() {
									document.documentElement.style.setProperty('--viewport-height', window.innerHeight + 'px');
									document.documentElement.style.setProperty('--background-height', (window.innerHeight + 250) + 'px');
								};

								on('load', f);
								on('resize', f);
								on('orientationchange', function() {

									// Update after brief delay.
										setTimeout(function() {
											(f)();
										}, 100);

								});

							}

					})();

			}

		// Android.
			if (client.os == 'android') {

				// Prevent background "jump" when address bar shrinks.
				// Specifically, this fix forces the background pseudoelement to a fixed height based on the physical
				// screen size instead of relying on "vh" (which is subject to change when the scrollbar shrinks/grows).
					(function() {

						// Insert and get rule.
							sheet.insertRule('body::after { }', 0);
							rule = sheet.cssRules[0];

						// Event.
							var f = function() {
								rule.style.cssText = 'height: ' + (Math.max(screen.width, screen.height)) + 'px';
							};

							on('load', f);
							on('orientationchange', f);
							on('touchmove', f);

					})();

				// Apply "is-touch" class to body.
					$body.classList.add('is-touch');

			}

		// iOS.
			else if (client.os == 'ios') {

				// <=11: Prevent white bar below background when address bar shrinks.
				// For some reason, simply forcing GPU acceleration on the background pseudoelement fixes this.
					if (client.osVersion <= 11)
						(function() {

							// Insert and get rule.
								sheet.insertRule('body::after { }', 0);
								rule = sheet.cssRules[0];

							// Set rule.
								rule.style.cssText = '-webkit-transform: scale(1.0)';

						})();

				// <=11: Prevent white bar below background when form inputs are focused.
				// Fixed-position elements seem to lose their fixed-ness when this happens, which is a problem
				// because our backgrounds fall into this category.
					if (client.osVersion <= 11)
						(function() {

							// Insert and get rule.
								sheet.insertRule('body.ios-focus-fix::before { }', 0);
								rule = sheet.cssRules[0];

							// Set rule.
								rule.style.cssText = 'height: calc(100% + 60px)';

							// Add event listeners.
								on('focus', function(event) {
									$body.classList.add('ios-focus-fix');
								}, true);

								on('blur', function(event) {
									$body.classList.remove('ios-focus-fix');
								}, true);

						})();

				// Apply "is-touch" class to body.
					$body.classList.add('is-touch');

			}

		var scrollEvents = {

			/**
			 * Items.
			 * @var {array}
			 */
			items: [],

			/**
			 * Adds an event.
			 * @param {object} o Options.
			 */
			add: function(o) {

				this.items.push({
					element: o.element,
					triggerElement: (('triggerElement' in o && o.triggerElement) ? o.triggerElement : o.element),
					enter: ('enter' in o ? o.enter : null),
					leave: ('leave' in o ? o.leave : null),
					mode: ('mode' in o ? o.mode : 3),
					offset: ('offset' in o ? o.offset : 0),
					initialState: ('initialState' in o ? o.initialState : null),
					state: false,
				});

			},

			/**
			 * Handler.
			 */
			handler: function() {

				var	height, top, bottom, scrollPad;

				// Determine values.
					if (client.os == 'ios') {

						height = document.documentElement.clientHeight;
						top = document.body.scrollTop + window.scrollY;
						bottom = top + height;
						scrollPad = 125;

					}
					else {

						height = document.documentElement.clientHeight;
						top = document.documentElement.scrollTop;
						bottom = top + height;
						scrollPad = 0;

					}

				// Step through items.
					scrollEvents.items.forEach(function(item) {

						var bcr, elementTop, elementBottom, state, a, b;

						// No enter/leave handlers? Bail.
							if (!item.enter
							&&	!item.leave)
								return true;

						// No trigger element, or not visible? Bail.
							if (!item.triggerElement
							||	item.triggerElement.offsetParent === null)
								return true;

						// Get element position.
							bcr = item.triggerElement.getBoundingClientRect();
							elementTop = top + Math.floor(bcr.top);
							elementBottom = elementTop + bcr.height;

						// Determine state.

							// Initial state exists?
								if (item.initialState !== null) {

									// Use it for this check.
										state = item.initialState;

									// Clear it.
										item.initialState = null;

								}

							// Otherwise, determine state from mode/position.
								else {

									switch (item.mode) {

										// Element falls within viewport.
											case 1:
											default:

												// State.
													state = (bottom > (elementTop - item.offset) && top < (elementBottom + item.offset));

												break;

										// Viewport midpoint falls within element.
											case 2:

												// Midpoint.
													a = (top + (height * 0.5));

												// State.
													state = (a > (elementTop - item.offset) && a < (elementBottom + item.offset));

												break;

										// Viewport midsection falls within element.
											case 3:

												// Upper limit (25%-).
													a = top + (height * 0.25);

													if (a - (height * 0.375) <= 0)
														a = 0;

												// Lower limit (-75%).
													b = top + (height * 0.75);

													if (b + (height * 0.375) >= document.body.scrollHeight - scrollPad)
														b = document.body.scrollHeight + scrollPad;

												// State.
													state = (b > (elementTop - item.offset) && a < (elementBottom + item.offset));

												break;

									}

								}

						// State changed?
							if (state != item.state) {

								// Update state.
									item.state = state;

								// Call handler.
									if (item.state) {

										// Enter handler exists?
											if (item.enter) {

												// Call it.
													(item.enter).apply(item.element);

												// No leave handler? Unbind enter handler (so we don't check this element again).
													if (!item.leave)
														item.enter = null;

											}

									}
									else {

										// Leave handler exists?
											if (item.leave) {

												// Call it.
													(item.leave).apply(item.element);

												// No enter handler? Unbind leave handler (so we don't check this element again).
													if (!item.enter)
														item.leave = null;

											}

									}

							}

					});

			},

			/**
			 * Initializes scroll events.
			 */
			init: function() {

				// Bind handler to events.
					on('load', this.handler);
					on('resize', this.handler);
					on('scroll', this.handler);

				// Do initial handler call.
					(this.handler)();

			}
		};

		// Initialize.
			scrollEvents.init();

	// "On Visible" animation.
		var onvisible = {

			/**
			 * Effects.
			 * @var {object}
			 */
			effects: {
				'blur-in': {
					transition: function (speed, delay) {
						return	'opacity ' + speed + 's ease' + (delay ? ' ' + delay + 's' : '') + ', ' +
								'filter ' + speed + 's ease' + (delay ? ' ' + delay + 's' : '');
					},
					rewind: function(intensity) {
						this.style.opacity = 0;
						this.style.filter = 'blur(' + (0.25 * intensity) + 'rem)';
					},
					play: function() {
						this.style.opacity = 1;
						this.style.filter = 'none';
					},
				},
				'zoom-in': {
					transition: function (speed, delay) {
						return	'opacity ' + speed + 's ease' + (delay ? ' ' + delay + 's' : '') + ', ' +
								'transform ' + speed + 's ease' + (delay ? ' ' + delay + 's' : '');
					},
					rewind: function(intensity, alt) {
						this.style.opacity = 0;
						this.style.transform = 'scale(' + (1 - ((alt ? 0.25 : 0.05) * intensity)) + ')';
					},
					play: function() {
						this.style.opacity = 1;
						this.style.transform = 'none';
					},
				},
				'zoom-out': {
					transition: function (speed, delay) {
						return	'opacity ' + speed + 's ease' + (delay ? ' ' + delay + 's' : '') + ', ' +
								'transform ' + speed + 's ease' + (delay ? ' ' + delay + 's' : '');
					},
					rewind: function(intensity, alt) {
						this.style.opacity = 0;
						this.style.transform = 'scale(' + (1 + ((alt ? 0.25 : 0.05) * intensity)) + ')';
					},
					play: function() {
						this.style.opacity = 1;
						this.style.transform = 'none';
					},
				},
				'slide-left': {
					custom: true,
					transition: function (speed, delay) {

						this.style.setProperty('--onvisible-speed', speed + 's');

						if (delay) {

							this.style.transition = 'opacity 0s linear ' + delay + 's';
							this.style.setProperty('--onvisible-delay', delay + 's');

						}

					},
					rewind: function() {

						this.style.animation = 'none';
						this.style.opacity = 0;

					},
					play: function() {

						this.style.opacity = 1;
						this.style.animationName = 'onvisible-slide-left';
						this.style.animationTimingFunction = 'ease';
						this.style.animationDuration = 'var(--onvisible-speed)';
						this.style.animationDelay = 'var(--onvisible-delay)';

					},
				},
				'slide-right': {
					custom: true,
					transition: function (speed, delay) {

						this.style.setProperty('--onvisible-speed', speed + 's');

						if (delay) {

							this.style.transition = 'opacity 0s linear ' + delay + 's';
							this.style.setProperty('--onvisible-delay', delay + 's');

						}

					},
					rewind: function() {

						this.style.animation = 'none';
						this.style.opacity = 0;

					},
					play: function() {

						this.style.opacity = 1;
						this.style.animationName = 'onvisible-slide-right';
						this.style.animationTimingFunction = 'ease';
						this.style.animationDuration = 'var(--onvisible-speed)';
						this.style.animationDelay = 'var(--onvisible-delay)';

					},
				},
				'flip-forward': {
					transition: function (speed, delay) {
						return	'opacity ' + speed + 's ease' + (delay ? ' ' + delay + 's' : '') + ', ' +
								'transform ' + speed + 's ease' + (delay ? ' ' + delay + 's' : '');
					},
					rewind: function(intensity, alt) {
						this.style.opacity = 0;
						this.style.transformOrigin = '50% 50%';
						this.style.transform = 'perspective(1000px) rotateX(' + ((alt ? 45 : 15) * intensity) + 'deg)';
					},
					play: function() {
						this.style.opacity = 1;
						this.style.transform = 'none';
					},
				},
				'flip-backward': {
					transition: function (speed, delay) {
						return	'opacity ' + speed + 's ease' + (delay ? ' ' + delay + 's' : '') + ', ' +
								'transform ' + speed + 's ease' + (delay ? ' ' + delay + 's' : '');
					},
					rewind: function(intensity, alt) {
						this.style.opacity = 0;
						this.style.transformOrigin = '50% 50%';
						this.style.transform = 'perspective(1000px) rotateX(' + ((alt ? -45 : -15) * intensity) + 'deg)';
					},
					play: function() {
						this.style.opacity = 1;
						this.style.transform = 'none';
					},
				},
				'flip-left': {
					transition: function (speed, delay) {
						return	'opacity ' + speed + 's ease' + (delay ? ' ' + delay + 's' : '') + ', ' +
								'transform ' + speed + 's ease' + (delay ? ' ' + delay + 's' : '');
					},
					rewind: function(intensity, alt) {
						this.style.opacity = 0;
						this.style.transformOrigin = '50% 50%';
						this.style.transform = 'perspective(1000px) rotateY(' + ((alt ? 45 : 15) * intensity) + 'deg)';
					},
					play: function() {
						this.style.opacity = 1;
						this.style.transform = 'none';
					},
				},
				'flip-right': {
					transition: function (speed, delay) {
						return	'opacity ' + speed + 's ease' + (delay ? ' ' + delay + 's' : '') + ', ' +
								'transform ' + speed + 's ease' + (delay ? ' ' + delay + 's' : '');
					},
					rewind: function(intensity, alt) {
						this.style.opacity = 0;
						this.style.transformOrigin = '50% 50%';
						this.style.transform = 'perspective(1000px) rotateY(' + ((alt ? -45 : -15) * intensity) + 'deg)';
					},
					play: function() {
						this.style.opacity = 1;
						this.style.transform = 'none';
					},
				},
				'tilt-left': {
					transition: function (speed, delay) {
						return	'opacity ' + speed + 's ease' + (delay ? ' ' + delay + 's' : '') + ', ' +
								'transform ' + speed + 's ease' + (delay ? ' ' + delay + 's' : '');
					},
					rewind: function(intensity, alt) {
						this.style.opacity = 0;
						this.style.transform = 'rotate(' + ((alt ? 45 : 5) * intensity) + 'deg)';
					},
					play: function() {
						this.style.opacity = 1;
						this.style.transform = 'none';
					},
				},
				'tilt-right': {
					transition: function (speed, delay) {
						return	'opacity ' + speed + 's ease' + (delay ? ' ' + delay + 's' : '') + ', ' +
								'transform ' + speed + 's ease' + (delay ? ' ' + delay + 's' : '');
					},
					rewind: function(intensity, alt) {
						this.style.opacity = 0;
						this.style.transform = 'rotate(' + ((alt ? -45 : -5) * intensity) + 'deg)';
					},
					play: function() {
						this.style.opacity = 1;
						this.style.transform = 'none';
					},
				},
				'fade-right': {
					transition: function (speed, delay) {
						return	'opacity ' + speed + 's ease' + (delay ? ' ' + delay + 's' : '') + ', ' +
								'transform ' + speed + 's ease' + (delay ? ' ' + delay + 's' : '');
					},
					rewind: function(intensity) {
						this.style.opacity = 0;
						this.style.transform = 'translateX(' + (-1.5 * intensity) + 'rem)';
					},
					play: function() {
						this.style.opacity = 1;
						this.style.transform = 'none';
					},
				},
				'fade-left': {
					transition: function (speed, delay) {
						return	'opacity ' + speed + 's ease' + (delay ? ' ' + delay + 's' : '') + ', ' +
								'transform ' + speed + 's ease' + (delay ? ' ' + delay + 's' : '');
					},
					rewind: function(intensity) {
						this.style.opacity = 0;
						this.style.transform = 'translateX(' + (1.5 * intensity) + 'rem)';
					},
					play: function() {
						this.style.opacity = 1;
						this.style.transform = 'none';
					},
				},
				'fade-down': {
					transition: function (speed, delay) {
						return	'opacity ' + speed + 's ease' + (delay ? ' ' + delay + 's' : '') + ', ' +
								'transform ' + speed + 's ease' + (delay ? ' ' + delay + 's' : '');
					},
					rewind: function(intensity) {
						this.style.opacity = 0;
						this.style.transform = 'translateY(' + (-1.5 * intensity) + 'rem)';
					},
					play: function() {
						this.style.opacity = 1;
						this.style.transform = 'none';
					},
				},
				'fade-up': {
					transition: function (speed, delay) {
						return	'opacity ' + speed + 's ease' + (delay ? ' ' + delay + 's' : '') + ', ' +
								'transform ' + speed + 's ease' + (delay ? ' ' + delay + 's' : '');
					},
					rewind: function(intensity) {
						this.style.opacity = 0;
						this.style.transform = 'translateY(' + (1.5 * intensity) + 'rem)';
					},
					play: function() {
						this.style.opacity = 1;
						this.style.transform = 'none';
					},
				},
				'fade-in': {
					transition: function (speed, delay) {
						return 'opacity ' + speed + 's ease' + (delay ? ' ' + delay + 's' : '');
					},
					rewind: function() {
						this.style.opacity = 0;
					},
					play: function() {
						this.style.opacity = 1;
					},
				},
				'fade-in-background': {
					custom: true,
					transition: function (speed, delay) {

						this.style.setProperty('--onvisible-speed', speed + 's');

						if (delay)
							this.style.setProperty('--onvisible-delay', delay + 's');

					},
					rewind: function() {
						this.style.removeProperty('--onvisible-background-color');
					},
					play: function() {
						this.style.setProperty('--onvisible-background-color', 'rgba(0,0,0,0.001)');
					},
				},
				'zoom-in-image': {
					target: 'img',
					transition: function (speed, delay) {
						return 'transform ' + speed + 's ease' + (delay ? ' ' + delay + 's' : '');
					},
					rewind: function() {
						this.style.transform = 'scale(1)';
					},
					play: function(intensity) {
						this.style.transform = 'scale(' + (1 + (0.1 * intensity)) + ')';
					},
				},
				'zoom-out-image': {
					target: 'img',
					transition: function (speed, delay) {
						return 'transform ' + speed + 's ease' + (delay ? ' ' + delay + 's' : '');
					},
					rewind: function(intensity) {
						this.style.transform = 'scale(' + (1 + (0.1 * intensity)) + ')';
					},
					play: function() {
						this.style.transform = 'none';
					},
				},
				'focus-image': {
					target: 'img',
					transition: function (speed, delay) {
						return	'transform ' + speed + 's ease' + (delay ? ' ' + delay + 's' : '') + ', ' +
								'filter ' + speed + 's ease' + (delay ? ' ' + delay + 's' : '');
					},
					rewind: function(intensity) {
						this.style.transform = 'scale(' + (1 + (0.05 * intensity)) + ')';
						this.style.filter = 'blur(' + (0.25 * intensity) + 'rem)';
					},
					play: function(intensity) {
						this.style.transform = 'none';
						this.style.filter = 'none';
					},
				},
			},

			/**
			 * Adds one or more animatable elements.
			 * @param {string} selector Selector.
			 * @param {object} settings Settings.
			 */
			add: function(selector, settings) {

				var style = settings.style in this.effects ? settings.style : 'fade',
					speed = parseInt('speed' in settings ? settings.speed : 1000) / 1000,
					intensity = ((parseInt('intensity' in settings ? settings.intensity : 5) / 10) * 1.75) + 0.25,
					delay = parseInt('delay' in settings ? settings.delay : 0) / 1000,
					replay = 'replay' in settings ? settings.replay : false,
					stagger = 'stagger' in settings ? (parseInt(settings.stagger) > -125 ? (parseInt(settings.stagger) / 1000) : false) : false,
					staggerOrder = 'staggerOrder' in settings ? settings.staggerOrder : 'default',
					state = 'state' in settings ? settings.state : null,
					effect = this.effects[style];

				// Step through selected elements.
					$$(selector).forEach(function(e) {

						var	children = (stagger !== false) ? e.querySelectorAll(':scope > li, :scope ul > li') : null,
							enter = function(staggerDelay=0) {

								var	_this = this,
									transitionOrig;

								// Target provided? Use it instead of element.
									if (effect.target)
										_this = this.querySelector(effect.target);

								// Not a custom effect?
									if (!effect.custom) {

										// Save original transition.
											transitionOrig = _this.style.transition;

										// Apply temporary styles.
											_this.style.setProperty('backface-visibility', 'hidden');

										// Apply transition.
											_this.style.transition = effect.transition(speed, delay + staggerDelay);

									}

								// Otherwise, call custom transition handler.
									else
										effect.transition.apply(_this, [speed, delay + staggerDelay]);

								// Play.
									effect.play.apply(_this, [intensity, !!children]);

								// Not a custom effect?
									if (!effect.custom)
										setTimeout(function() {

											// Remove temporary styles.
												_this.style.removeProperty('backface-visibility');

											// Restore original transition.
												_this.style.transition = transitionOrig;

										}, (speed + delay + staggerDelay) * 1000 * 2);

							},
							leave = function() {

								var	_this = this,
									transitionOrig;

								// Target provided? Use it instead of element.
									if (effect.target)
										_this = this.querySelector(effect.target);

								// Not a custom effect?
									if (!effect.custom) {

										// Save original transition.
											transitionOrig = _this.style.transition;

										// Apply temporary styles.
											_this.style.setProperty('backface-visibility', 'hidden');

										// Apply transition.
											_this.style.transition = effect.transition(speed);

									}

								// Otherwise, call custom transition handler.
									else
										effect.transition.apply(_this, [speed]);

								// Rewind.
									effect.rewind.apply(_this, [intensity, !!children]);

								// Not a custom effect?
									if (!effect.custom)
										setTimeout(function() {

											// Remove temporary styles.
												_this.style.removeProperty('backface-visibility');

											// Restore original transition.
												_this.style.transition = transitionOrig;

										}, speed * 1000 * 2);

							},
							targetElement, triggerElement;

						// Initial rewind.

							// Determine target element.
								if (effect.target)
									targetElement = e.querySelector(effect.target);
								else
									targetElement = e;

							// Children? Rewind each individually.
								if (children)
									children.forEach(function(targetElement) {
										effect.rewind.apply(targetElement, [intensity, true]);
									});

							// Otherwise. just rewind element.
								else
									effect.rewind.apply(targetElement, [intensity]);

						// Determine trigger element.
							triggerElement = e;

							// Has a parent?
								if (e.parentNode) {

									// Parent is an onvisible trigger? Use it.
										if (e.parentNode.dataset.onvisibleTrigger)
											triggerElement = e.parentNode;

									// Otherwise, has a grandparent?
										else if (e.parentNode.parentNode) {

											// Grandparent is an onvisible trigger? Use it.
												if (e.parentNode.parentNode.dataset.onvisibleTrigger)
													triggerElement = e.parentNode.parentNode;

										}

								}

						// Add scroll event.
							scrollEvents.add({
								element: e,
								triggerElement: triggerElement,
								initialState: state,
								enter: children ? function() {

									var staggerDelay = 0,
										childHandler = function(e) {

											// Apply enter handler.
												enter.apply(e, [staggerDelay]);

											// Increment stagger delay.
												staggerDelay += stagger;

										},
										a;

									// Default stagger order?
										if (staggerOrder == 'default') {

											// Apply child handler to children.
												children.forEach(childHandler);

										}

									// Otherwise ...
										else {

											// Convert children to an array.
												a = Array.from(children);

											// Sort array based on stagger order.
												switch (staggerOrder) {

													case 'reverse':

														// Reverse array.
															a.reverse();

														break;

													case 'random':

														// Randomly sort array.
															a.sort(function() {
																return Math.random() - 0.5;
															});

														break;

												}

											// Apply child handler to array.
												a.forEach(childHandler);

										}

								} : enter,
								leave: (replay ? (children ? function() {

									// Step through children.
										children.forEach(function(e) {

											// Apply leave handler.
												leave.apply(e);

										});

								} : leave) : null),
							});

					});

				},

		};

	// "On Visible" animations.
		onvisible.add('#text04', { style: 'blur-in', speed: 3000, intensity: 5, delay: 250, staggerOrder: '', replay: false });

})();
<script>

<script setup>
export default {
  name: 'App'
}

</script>

<style>
#app {
  font-family: 'Avenir', Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  margin-top: 60px;
}

html,body,div,span,applet,object,iframe,h1,h2,h3,h4,h5,h6,p,blockquote,pre,a,abbr,acronym,address,big,cite,code,del,dfn,em,img,ins,kbd,q,s,samp,small,strike,strong,sub,sup,tt,var,b,u,i,center,dl,dt,dd,ol,ul,li,fieldset,form,label,legend,table,caption,tbody,tfoot,thead,tr,th,td,article,aside,canvas,details,embed,figure,figcaption,footer,header,hgroup,menu,nav,output,ruby,section,summary,time,mark,audio,video{margin:0;padding:0;border:0;font-size:100%;font:inherit;vertical-align:baseline;}article,aside,details,figcaption,figure,footer,header,hgroup,menu,nav,section{display:block;}body{line-height:1;}ol,ul{list-style:none;}blockquote,q{quotes:none;}blockquote:before,blockquote:after,q:before,q:after{content:'';content:none;}table{border-collapse:collapse;border-spacing:0;}body{-webkit-text-size-adjust:none}mark{background-color:transparent;color:inherit}input::-moz-focus-inner{border:0;padding:0}input[type="text"],input[type="email"],select,textarea{-moz-appearance:none;-webkit-appearance:none;-ms-appearance:none;appearance:none}

*, *:before, *:after {
	box-sizing: border-box;
}

body {
	line-height: 1.0;
	min-height: var(--viewport-height);
	min-width: 320px;
	overflow-x: hidden;
	word-wrap: break-word;
}

body:before {
	background-attachment: scroll;
	content: '';
	display: block;
	height: var(--background-height);
	left: 0;
	pointer-events: none;
	position: fixed;
	top: 0;
	transform: scale(1);
	width: 100vw;
	z-index: 0;
	background-image: url('data:image/svg+xml;charset=utf8,%3Csvg%20width%3D%22384%22%20height%3D%22216%22%20viewBox%3D%220%200%20384%20216%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%20%3Cstyle%20type%3D%22text%2Fcss%22%3E%20rect%20%7B%20fill%3A%20rgba(29,110,184,0.502)%3B%20%7D%20%3C%2Fstyle%3E%20%3Crect%20x%3D%222.0%22%20y%3D%222.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%221%22%20%2F%3E%20%3Crect%20x%3D%222.0%22%20y%3D%2226.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220%22%20%2F%3E%20%3Crect%20x%3D%222.0%22%20y%3D%2250.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220%22%20%2F%3E%20%3Crect%20x%3D%222.0%22%20y%3D%2274.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%221%22%20%2F%3E%20%3Crect%20x%3D%222.0%22%20y%3D%2298.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220%22%20%2F%3E%20%3Crect%20x%3D%222.0%22%20y%3D%22122.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%221%22%20%2F%3E%20%3Crect%20x%3D%222.0%22%20y%3D%22146.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220.6%22%20%2F%3E%20%3Crect%20x%3D%222.0%22%20y%3D%22170.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220%22%20%2F%3E%20%3Crect%20x%3D%222.0%22%20y%3D%22194.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220.1%22%20%2F%3E%20%3Crect%20x%3D%2226.0%22%20y%3D%222.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220%22%20%2F%3E%20%3Crect%20x%3D%2226.0%22%20y%3D%2226.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220%22%20%2F%3E%20%3Crect%20x%3D%2226.0%22%20y%3D%2250.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220%22%20%2F%3E%20%3Crect%20x%3D%2226.0%22%20y%3D%2274.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220%22%20%2F%3E%20%3Crect%20x%3D%2226.0%22%20y%3D%2298.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220.8%22%20%2F%3E%20%3Crect%20x%3D%2226.0%22%20y%3D%22122.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220%22%20%2F%3E%20%3Crect%20x%3D%2226.0%22%20y%3D%22146.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220.1%22%20%2F%3E%20%3Crect%20x%3D%2226.0%22%20y%3D%22170.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%221%22%20%2F%3E%20%3Crect%20x%3D%2226.0%22%20y%3D%22194.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%221%22%20%2F%3E%20%3Crect%20x%3D%2250.0%22%20y%3D%222.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220.1%22%20%2F%3E%20%3Crect%20x%3D%2250.0%22%20y%3D%2226.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220%22%20%2F%3E%20%3Crect%20x%3D%2250.0%22%20y%3D%2250.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220.5%22%20%2F%3E%20%3Crect%20x%3D%2250.0%22%20y%3D%2274.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%221%22%20%2F%3E%20%3Crect%20x%3D%2250.0%22%20y%3D%2298.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220%22%20%2F%3E%20%3Crect%20x%3D%2250.0%22%20y%3D%22122.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220.2%22%20%2F%3E%20%3Crect%20x%3D%2250.0%22%20y%3D%22146.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220.4%22%20%2F%3E%20%3Crect%20x%3D%2250.0%22%20y%3D%22170.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%221%22%20%2F%3E%20%3Crect%20x%3D%2250.0%22%20y%3D%22194.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220.5%22%20%2F%3E%20%3Crect%20x%3D%2274.0%22%20y%3D%222.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220%22%20%2F%3E%20%3Crect%20x%3D%2274.0%22%20y%3D%2226.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220.6%22%20%2F%3E%20%3Crect%20x%3D%2274.0%22%20y%3D%2250.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220%22%20%2F%3E%20%3Crect%20x%3D%2274.0%22%20y%3D%2274.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220.3%22%20%2F%3E%20%3Crect%20x%3D%2274.0%22%20y%3D%2298.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%221%22%20%2F%3E%20%3Crect%20x%3D%2274.0%22%20y%3D%22122.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220%22%20%2F%3E%20%3Crect%20x%3D%2274.0%22%20y%3D%22146.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%221%22%20%2F%3E%20%3Crect%20x%3D%2274.0%22%20y%3D%22170.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220%22%20%2F%3E%20%3Crect%20x%3D%2274.0%22%20y%3D%22194.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220%22%20%2F%3E%20%3Crect%20x%3D%2298.0%22%20y%3D%222.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%221%22%20%2F%3E%20%3Crect%20x%3D%2298.0%22%20y%3D%2226.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220%22%20%2F%3E%20%3Crect%20x%3D%2298.0%22%20y%3D%2250.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220.1%22%20%2F%3E%20%3Crect%20x%3D%2298.0%22%20y%3D%2274.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220.5%22%20%2F%3E%20%3Crect%20x%3D%2298.0%22%20y%3D%2298.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220.6%22%20%2F%3E%20%3Crect%20x%3D%2298.0%22%20y%3D%22122.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%221%22%20%2F%3E%20%3Crect%20x%3D%2298.0%22%20y%3D%22146.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220.5%22%20%2F%3E%20%3Crect%20x%3D%2298.0%22%20y%3D%22170.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220%22%20%2F%3E%20%3Crect%20x%3D%2298.0%22%20y%3D%22194.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220.2%22%20%2F%3E%20%3Crect%20x%3D%22122.0%22%20y%3D%222.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220.5%22%20%2F%3E%20%3Crect%20x%3D%22122.0%22%20y%3D%2226.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220.3%22%20%2F%3E%20%3Crect%20x%3D%22122.0%22%20y%3D%2250.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220%22%20%2F%3E%20%3Crect%20x%3D%22122.0%22%20y%3D%2274.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%221%22%20%2F%3E%20%3Crect%20x%3D%22122.0%22%20y%3D%2298.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220.2%22%20%2F%3E%20%3Crect%20x%3D%22122.0%22%20y%3D%22122.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220.8%22%20%2F%3E%20%3Crect%20x%3D%22122.0%22%20y%3D%22146.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220%22%20%2F%3E%20%3Crect%20x%3D%22122.0%22%20y%3D%22170.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220.8%22%20%2F%3E%20%3Crect%20x%3D%22122.0%22%20y%3D%22194.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220%22%20%2F%3E%20%3Crect%20x%3D%22146.0%22%20y%3D%222.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220.6%22%20%2F%3E%20%3Crect%20x%3D%22146.0%22%20y%3D%2226.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220.7%22%20%2F%3E%20%3Crect%20x%3D%22146.0%22%20y%3D%2250.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%221%22%20%2F%3E%20%3Crect%20x%3D%22146.0%22%20y%3D%2274.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220.4%22%20%2F%3E%20%3Crect%20x%3D%22146.0%22%20y%3D%2298.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220.8%22%20%2F%3E%20%3Crect%20x%3D%22146.0%22%20y%3D%22122.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220.7%22%20%2F%3E%20%3Crect%20x%3D%22146.0%22%20y%3D%22146.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220%22%20%2F%3E%20%3Crect%20x%3D%22146.0%22%20y%3D%22170.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220.5%22%20%2F%3E%20%3Crect%20x%3D%22146.0%22%20y%3D%22194.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220%22%20%2F%3E%20%3Crect%20x%3D%22170.0%22%20y%3D%222.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%221%22%20%2F%3E%20%3Crect%20x%3D%22170.0%22%20y%3D%2226.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%221%22%20%2F%3E%20%3Crect%20x%3D%22170.0%22%20y%3D%2250.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%221%22%20%2F%3E%20%3Crect%20x%3D%22170.0%22%20y%3D%2274.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%221%22%20%2F%3E%20%3Crect%20x%3D%22170.0%22%20y%3D%2298.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220%22%20%2F%3E%20%3Crect%20x%3D%22170.0%22%20y%3D%22122.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220%22%20%2F%3E%20%3Crect%20x%3D%22170.0%22%20y%3D%22146.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220.6%22%20%2F%3E%20%3Crect%20x%3D%22170.0%22%20y%3D%22170.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%221%22%20%2F%3E%20%3Crect%20x%3D%22170.0%22%20y%3D%22194.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220%22%20%2F%3E%20%3Crect%20x%3D%22194.0%22%20y%3D%222.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220%22%20%2F%3E%20%3Crect%20x%3D%22194.0%22%20y%3D%2226.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220.4%22%20%2F%3E%20%3Crect%20x%3D%22194.0%22%20y%3D%2250.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220.6%22%20%2F%3E%20%3Crect%20x%3D%22194.0%22%20y%3D%2274.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%221%22%20%2F%3E%20%3Crect%20x%3D%22194.0%22%20y%3D%2298.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220%22%20%2F%3E%20%3Crect%20x%3D%22194.0%22%20y%3D%22122.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220.2%22%20%2F%3E%20%3Crect%20x%3D%22194.0%22%20y%3D%22146.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220%22%20%2F%3E%20%3Crect%20x%3D%22194.0%22%20y%3D%22170.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220.4%22%20%2F%3E%20%3Crect%20x%3D%22194.0%22%20y%3D%22194.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220.5%22%20%2F%3E%20%3Crect%20x%3D%22218.0%22%20y%3D%222.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%221%22%20%2F%3E%20%3Crect%20x%3D%22218.0%22%20y%3D%2226.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220%22%20%2F%3E%20%3Crect%20x%3D%22218.0%22%20y%3D%2250.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220.4%22%20%2F%3E%20%3Crect%20x%3D%22218.0%22%20y%3D%2274.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220%22%20%2F%3E%20%3Crect%20x%3D%22218.0%22%20y%3D%2298.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220%22%20%2F%3E%20%3Crect%20x%3D%22218.0%22%20y%3D%22122.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220.2%22%20%2F%3E%20%3Crect%20x%3D%22218.0%22%20y%3D%22146.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220.2%22%20%2F%3E%20%3Crect%20x%3D%22218.0%22%20y%3D%22170.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220.6%22%20%2F%3E%20%3Crect%20x%3D%22218.0%22%20y%3D%22194.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%221%22%20%2F%3E%20%3Crect%20x%3D%22242.0%22%20y%3D%222.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220%22%20%2F%3E%20%3Crect%20x%3D%22242.0%22%20y%3D%2226.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220.6%22%20%2F%3E%20%3Crect%20x%3D%22242.0%22%20y%3D%2250.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%221%22%20%2F%3E%20%3Crect%20x%3D%22242.0%22%20y%3D%2274.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220.5%22%20%2F%3E%20%3Crect%20x%3D%22242.0%22%20y%3D%2298.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220%22%20%2F%3E%20%3Crect%20x%3D%22242.0%22%20y%3D%22122.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220%22%20%2F%3E%20%3Crect%20x%3D%22242.0%22%20y%3D%22146.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%221%22%20%2F%3E%20%3Crect%20x%3D%22242.0%22%20y%3D%22170.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220.8%22%20%2F%3E%20%3Crect%20x%3D%22242.0%22%20y%3D%22194.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220.1%22%20%2F%3E%20%3Crect%20x%3D%22266.0%22%20y%3D%222.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220%22%20%2F%3E%20%3Crect%20x%3D%22266.0%22%20y%3D%2226.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220.8%22%20%2F%3E%20%3Crect%20x%3D%22266.0%22%20y%3D%2250.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%221%22%20%2F%3E%20%3Crect%20x%3D%22266.0%22%20y%3D%2274.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%221%22%20%2F%3E%20%3Crect%20x%3D%22266.0%22%20y%3D%2298.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220.5%22%20%2F%3E%20%3Crect%20x%3D%22266.0%22%20y%3D%22122.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220.4%22%20%2F%3E%20%3Crect%20x%3D%22266.0%22%20y%3D%22146.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220.4%22%20%2F%3E%20%3Crect%20x%3D%22266.0%22%20y%3D%22170.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220.3%22%20%2F%3E%20%3Crect%20x%3D%22266.0%22%20y%3D%22194.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220.1%22%20%2F%3E%20%3Crect%20x%3D%22290.0%22%20y%3D%222.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220%22%20%2F%3E%20%3Crect%20x%3D%22290.0%22%20y%3D%2226.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220.3%22%20%2F%3E%20%3Crect%20x%3D%22290.0%22%20y%3D%2250.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220%22%20%2F%3E%20%3Crect%20x%3D%22290.0%22%20y%3D%2274.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%221%22%20%2F%3E%20%3Crect%20x%3D%22290.0%22%20y%3D%2298.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220%22%20%2F%3E%20%3Crect%20x%3D%22290.0%22%20y%3D%22122.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220%22%20%2F%3E%20%3Crect%20x%3D%22290.0%22%20y%3D%22146.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%221%22%20%2F%3E%20%3Crect%20x%3D%22290.0%22%20y%3D%22170.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220%22%20%2F%3E%20%3Crect%20x%3D%22290.0%22%20y%3D%22194.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220.1%22%20%2F%3E%20%3Crect%20x%3D%22314.0%22%20y%3D%222.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220%22%20%2F%3E%20%3Crect%20x%3D%22314.0%22%20y%3D%2226.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220.3%22%20%2F%3E%20%3Crect%20x%3D%22314.0%22%20y%3D%2250.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220%22%20%2F%3E%20%3Crect%20x%3D%22314.0%22%20y%3D%2274.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220%22%20%2F%3E%20%3Crect%20x%3D%22314.0%22%20y%3D%2298.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220%22%20%2F%3E%20%3Crect%20x%3D%22314.0%22%20y%3D%22122.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%221%22%20%2F%3E%20%3Crect%20x%3D%22314.0%22%20y%3D%22146.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%221%22%20%2F%3E%20%3Crect%20x%3D%22314.0%22%20y%3D%22170.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%221%22%20%2F%3E%20%3Crect%20x%3D%22314.0%22%20y%3D%22194.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220%22%20%2F%3E%20%3Crect%20x%3D%22338.0%22%20y%3D%222.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220%22%20%2F%3E%20%3Crect%20x%3D%22338.0%22%20y%3D%2226.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220%22%20%2F%3E%20%3Crect%20x%3D%22338.0%22%20y%3D%2250.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220%22%20%2F%3E%20%3Crect%20x%3D%22338.0%22%20y%3D%2274.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%221%22%20%2F%3E%20%3Crect%20x%3D%22338.0%22%20y%3D%2298.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220.7%22%20%2F%3E%20%3Crect%20x%3D%22338.0%22%20y%3D%22122.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%221%22%20%2F%3E%20%3Crect%20x%3D%22338.0%22%20y%3D%22146.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220.8%22%20%2F%3E%20%3Crect%20x%3D%22338.0%22%20y%3D%22170.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220.8%22%20%2F%3E%20%3Crect%20x%3D%22338.0%22%20y%3D%22194.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220%22%20%2F%3E%20%3Crect%20x%3D%22362.0%22%20y%3D%222.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220%22%20%2F%3E%20%3Crect%20x%3D%22362.0%22%20y%3D%2226.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220.8%22%20%2F%3E%20%3Crect%20x%3D%22362.0%22%20y%3D%2250.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%221%22%20%2F%3E%20%3Crect%20x%3D%22362.0%22%20y%3D%2274.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220.2%22%20%2F%3E%20%3Crect%20x%3D%22362.0%22%20y%3D%2298.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220%22%20%2F%3E%20%3Crect%20x%3D%22362.0%22%20y%3D%22122.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220.8%22%20%2F%3E%20%3Crect%20x%3D%22362.0%22%20y%3D%22146.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220.8%22%20%2F%3E%20%3Crect%20x%3D%22362.0%22%20y%3D%22170.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220%22%20%2F%3E%20%3Crect%20x%3D%22362.0%22%20y%3D%22194.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220%22%20%2F%3E%3C%2Fsvg%3E'), linear-gradient(343deg, #0E3B63 0%, #1C8AED 75%);
	background-size: 185px, auto;
	background-position: center, 0% 0%;
	background-repeat: repeat, repeat;
}

@media (prefers-color-scheme: dark) {
	body:before {
		background-image: url('data:image/svg+xml;charset=utf8,%3Csvg%20width%3D%22384%22%20height%3D%22216%22%20viewBox%3D%220%200%20384%20216%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%20%3Cstyle%20type%3D%22text%2Fcss%22%3E%20rect%20%7B%20fill%3A%20rgba(29,110,184,0.502)%3B%20%7D%20%3C%2Fstyle%3E%20%3Crect%20x%3D%222.0%22%20y%3D%222.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%221%22%20%2F%3E%20%3Crect%20x%3D%222.0%22%20y%3D%2226.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220%22%20%2F%3E%20%3Crect%20x%3D%222.0%22%20y%3D%2250.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220%22%20%2F%3E%20%3Crect%20x%3D%222.0%22%20y%3D%2274.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%221%22%20%2F%3E%20%3Crect%20x%3D%222.0%22%20y%3D%2298.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220%22%20%2F%3E%20%3Crect%20x%3D%222.0%22%20y%3D%22122.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%221%22%20%2F%3E%20%3Crect%20x%3D%222.0%22%20y%3D%22146.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220.6%22%20%2F%3E%20%3Crect%20x%3D%222.0%22%20y%3D%22170.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220%22%20%2F%3E%20%3Crect%20x%3D%222.0%22%20y%3D%22194.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220.1%22%20%2F%3E%20%3Crect%20x%3D%2226.0%22%20y%3D%222.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220%22%20%2F%3E%20%3Crect%20x%3D%2226.0%22%20y%3D%2226.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220%22%20%2F%3E%20%3Crect%20x%3D%2226.0%22%20y%3D%2250.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220%22%20%2F%3E%20%3Crect%20x%3D%2226.0%22%20y%3D%2274.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220%22%20%2F%3E%20%3Crect%20x%3D%2226.0%22%20y%3D%2298.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220.8%22%20%2F%3E%20%3Crect%20x%3D%2226.0%22%20y%3D%22122.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220%22%20%2F%3E%20%3Crect%20x%3D%2226.0%22%20y%3D%22146.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220.1%22%20%2F%3E%20%3Crect%20x%3D%2226.0%22%20y%3D%22170.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%221%22%20%2F%3E%20%3Crect%20x%3D%2226.0%22%20y%3D%22194.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%221%22%20%2F%3E%20%3Crect%20x%3D%2250.0%22%20y%3D%222.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220.1%22%20%2F%3E%20%3Crect%20x%3D%2250.0%22%20y%3D%2226.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220%22%20%2F%3E%20%3Crect%20x%3D%2250.0%22%20y%3D%2250.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220.5%22%20%2F%3E%20%3Crect%20x%3D%2250.0%22%20y%3D%2274.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%221%22%20%2F%3E%20%3Crect%20x%3D%2250.0%22%20y%3D%2298.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220%22%20%2F%3E%20%3Crect%20x%3D%2250.0%22%20y%3D%22122.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220.2%22%20%2F%3E%20%3Crect%20x%3D%2250.0%22%20y%3D%22146.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220.4%22%20%2F%3E%20%3Crect%20x%3D%2250.0%22%20y%3D%22170.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%221%22%20%2F%3E%20%3Crect%20x%3D%2250.0%22%20y%3D%22194.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220.5%22%20%2F%3E%20%3Crect%20x%3D%2274.0%22%20y%3D%222.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220%22%20%2F%3E%20%3Crect%20x%3D%2274.0%22%20y%3D%2226.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220.6%22%20%2F%3E%20%3Crect%20x%3D%2274.0%22%20y%3D%2250.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220%22%20%2F%3E%20%3Crect%20x%3D%2274.0%22%20y%3D%2274.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220.3%22%20%2F%3E%20%3Crect%20x%3D%2274.0%22%20y%3D%2298.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%221%22%20%2F%3E%20%3Crect%20x%3D%2274.0%22%20y%3D%22122.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220%22%20%2F%3E%20%3Crect%20x%3D%2274.0%22%20y%3D%22146.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%221%22%20%2F%3E%20%3Crect%20x%3D%2274.0%22%20y%3D%22170.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220%22%20%2F%3E%20%3Crect%20x%3D%2274.0%22%20y%3D%22194.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220%22%20%2F%3E%20%3Crect%20x%3D%2298.0%22%20y%3D%222.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%221%22%20%2F%3E%20%3Crect%20x%3D%2298.0%22%20y%3D%2226.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220%22%20%2F%3E%20%3Crect%20x%3D%2298.0%22%20y%3D%2250.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220.1%22%20%2F%3E%20%3Crect%20x%3D%2298.0%22%20y%3D%2274.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220.5%22%20%2F%3E%20%3Crect%20x%3D%2298.0%22%20y%3D%2298.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220.6%22%20%2F%3E%20%3Crect%20x%3D%2298.0%22%20y%3D%22122.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%221%22%20%2F%3E%20%3Crect%20x%3D%2298.0%22%20y%3D%22146.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220.5%22%20%2F%3E%20%3Crect%20x%3D%2298.0%22%20y%3D%22170.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220%22%20%2F%3E%20%3Crect%20x%3D%2298.0%22%20y%3D%22194.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220.2%22%20%2F%3E%20%3Crect%20x%3D%22122.0%22%20y%3D%222.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220.5%22%20%2F%3E%20%3Crect%20x%3D%22122.0%22%20y%3D%2226.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220.3%22%20%2F%3E%20%3Crect%20x%3D%22122.0%22%20y%3D%2250.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220%22%20%2F%3E%20%3Crect%20x%3D%22122.0%22%20y%3D%2274.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%221%22%20%2F%3E%20%3Crect%20x%3D%22122.0%22%20y%3D%2298.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220.2%22%20%2F%3E%20%3Crect%20x%3D%22122.0%22%20y%3D%22122.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220.8%22%20%2F%3E%20%3Crect%20x%3D%22122.0%22%20y%3D%22146.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220%22%20%2F%3E%20%3Crect%20x%3D%22122.0%22%20y%3D%22170.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220.8%22%20%2F%3E%20%3Crect%20x%3D%22122.0%22%20y%3D%22194.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220%22%20%2F%3E%20%3Crect%20x%3D%22146.0%22%20y%3D%222.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220.6%22%20%2F%3E%20%3Crect%20x%3D%22146.0%22%20y%3D%2226.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220.7%22%20%2F%3E%20%3Crect%20x%3D%22146.0%22%20y%3D%2250.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%221%22%20%2F%3E%20%3Crect%20x%3D%22146.0%22%20y%3D%2274.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220.4%22%20%2F%3E%20%3Crect%20x%3D%22146.0%22%20y%3D%2298.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220.8%22%20%2F%3E%20%3Crect%20x%3D%22146.0%22%20y%3D%22122.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220.7%22%20%2F%3E%20%3Crect%20x%3D%22146.0%22%20y%3D%22146.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220%22%20%2F%3E%20%3Crect%20x%3D%22146.0%22%20y%3D%22170.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220.5%22%20%2F%3E%20%3Crect%20x%3D%22146.0%22%20y%3D%22194.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220%22%20%2F%3E%20%3Crect%20x%3D%22170.0%22%20y%3D%222.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%221%22%20%2F%3E%20%3Crect%20x%3D%22170.0%22%20y%3D%2226.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%221%22%20%2F%3E%20%3Crect%20x%3D%22170.0%22%20y%3D%2250.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%221%22%20%2F%3E%20%3Crect%20x%3D%22170.0%22%20y%3D%2274.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%221%22%20%2F%3E%20%3Crect%20x%3D%22170.0%22%20y%3D%2298.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220%22%20%2F%3E%20%3Crect%20x%3D%22170.0%22%20y%3D%22122.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220%22%20%2F%3E%20%3Crect%20x%3D%22170.0%22%20y%3D%22146.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220.6%22%20%2F%3E%20%3Crect%20x%3D%22170.0%22%20y%3D%22170.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%221%22%20%2F%3E%20%3Crect%20x%3D%22170.0%22%20y%3D%22194.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220%22%20%2F%3E%20%3Crect%20x%3D%22194.0%22%20y%3D%222.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220%22%20%2F%3E%20%3Crect%20x%3D%22194.0%22%20y%3D%2226.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220.4%22%20%2F%3E%20%3Crect%20x%3D%22194.0%22%20y%3D%2250.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220.6%22%20%2F%3E%20%3Crect%20x%3D%22194.0%22%20y%3D%2274.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%221%22%20%2F%3E%20%3Crect%20x%3D%22194.0%22%20y%3D%2298.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220%22%20%2F%3E%20%3Crect%20x%3D%22194.0%22%20y%3D%22122.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220.2%22%20%2F%3E%20%3Crect%20x%3D%22194.0%22%20y%3D%22146.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220%22%20%2F%3E%20%3Crect%20x%3D%22194.0%22%20y%3D%22170.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220.4%22%20%2F%3E%20%3Crect%20x%3D%22194.0%22%20y%3D%22194.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220.5%22%20%2F%3E%20%3Crect%20x%3D%22218.0%22%20y%3D%222.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%221%22%20%2F%3E%20%3Crect%20x%3D%22218.0%22%20y%3D%2226.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220%22%20%2F%3E%20%3Crect%20x%3D%22218.0%22%20y%3D%2250.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220.4%22%20%2F%3E%20%3Crect%20x%3D%22218.0%22%20y%3D%2274.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220%22%20%2F%3E%20%3Crect%20x%3D%22218.0%22%20y%3D%2298.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220%22%20%2F%3E%20%3Crect%20x%3D%22218.0%22%20y%3D%22122.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220.2%22%20%2F%3E%20%3Crect%20x%3D%22218.0%22%20y%3D%22146.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220.2%22%20%2F%3E%20%3Crect%20x%3D%22218.0%22%20y%3D%22170.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220.6%22%20%2F%3E%20%3Crect%20x%3D%22218.0%22%20y%3D%22194.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%221%22%20%2F%3E%20%3Crect%20x%3D%22242.0%22%20y%3D%222.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220%22%20%2F%3E%20%3Crect%20x%3D%22242.0%22%20y%3D%2226.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220.6%22%20%2F%3E%20%3Crect%20x%3D%22242.0%22%20y%3D%2250.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%221%22%20%2F%3E%20%3Crect%20x%3D%22242.0%22%20y%3D%2274.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220.5%22%20%2F%3E%20%3Crect%20x%3D%22242.0%22%20y%3D%2298.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220%22%20%2F%3E%20%3Crect%20x%3D%22242.0%22%20y%3D%22122.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220%22%20%2F%3E%20%3Crect%20x%3D%22242.0%22%20y%3D%22146.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%221%22%20%2F%3E%20%3Crect%20x%3D%22242.0%22%20y%3D%22170.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220.8%22%20%2F%3E%20%3Crect%20x%3D%22242.0%22%20y%3D%22194.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220.1%22%20%2F%3E%20%3Crect%20x%3D%22266.0%22%20y%3D%222.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220%22%20%2F%3E%20%3Crect%20x%3D%22266.0%22%20y%3D%2226.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220.8%22%20%2F%3E%20%3Crect%20x%3D%22266.0%22%20y%3D%2250.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%221%22%20%2F%3E%20%3Crect%20x%3D%22266.0%22%20y%3D%2274.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%221%22%20%2F%3E%20%3Crect%20x%3D%22266.0%22%20y%3D%2298.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220.5%22%20%2F%3E%20%3Crect%20x%3D%22266.0%22%20y%3D%22122.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220.4%22%20%2F%3E%20%3Crect%20x%3D%22266.0%22%20y%3D%22146.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220.4%22%20%2F%3E%20%3Crect%20x%3D%22266.0%22%20y%3D%22170.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220.3%22%20%2F%3E%20%3Crect%20x%3D%22266.0%22%20y%3D%22194.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220.1%22%20%2F%3E%20%3Crect%20x%3D%22290.0%22%20y%3D%222.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220%22%20%2F%3E%20%3Crect%20x%3D%22290.0%22%20y%3D%2226.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220.3%22%20%2F%3E%20%3Crect%20x%3D%22290.0%22%20y%3D%2250.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220%22%20%2F%3E%20%3Crect%20x%3D%22290.0%22%20y%3D%2274.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%221%22%20%2F%3E%20%3Crect%20x%3D%22290.0%22%20y%3D%2298.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220%22%20%2F%3E%20%3Crect%20x%3D%22290.0%22%20y%3D%22122.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220%22%20%2F%3E%20%3Crect%20x%3D%22290.0%22%20y%3D%22146.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%221%22%20%2F%3E%20%3Crect%20x%3D%22290.0%22%20y%3D%22170.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220%22%20%2F%3E%20%3Crect%20x%3D%22290.0%22%20y%3D%22194.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220.1%22%20%2F%3E%20%3Crect%20x%3D%22314.0%22%20y%3D%222.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220%22%20%2F%3E%20%3Crect%20x%3D%22314.0%22%20y%3D%2226.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220.3%22%20%2F%3E%20%3Crect%20x%3D%22314.0%22%20y%3D%2250.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220%22%20%2F%3E%20%3Crect%20x%3D%22314.0%22%20y%3D%2274.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220%22%20%2F%3E%20%3Crect%20x%3D%22314.0%22%20y%3D%2298.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220%22%20%2F%3E%20%3Crect%20x%3D%22314.0%22%20y%3D%22122.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%221%22%20%2F%3E%20%3Crect%20x%3D%22314.0%22%20y%3D%22146.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%221%22%20%2F%3E%20%3Crect%20x%3D%22314.0%22%20y%3D%22170.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%221%22%20%2F%3E%20%3Crect%20x%3D%22314.0%22%20y%3D%22194.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220%22%20%2F%3E%20%3Crect%20x%3D%22338.0%22%20y%3D%222.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220%22%20%2F%3E%20%3Crect%20x%3D%22338.0%22%20y%3D%2226.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220%22%20%2F%3E%20%3Crect%20x%3D%22338.0%22%20y%3D%2250.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220%22%20%2F%3E%20%3Crect%20x%3D%22338.0%22%20y%3D%2274.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%221%22%20%2F%3E%20%3Crect%20x%3D%22338.0%22%20y%3D%2298.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220.7%22%20%2F%3E%20%3Crect%20x%3D%22338.0%22%20y%3D%22122.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%221%22%20%2F%3E%20%3Crect%20x%3D%22338.0%22%20y%3D%22146.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220.8%22%20%2F%3E%20%3Crect%20x%3D%22338.0%22%20y%3D%22170.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220.8%22%20%2F%3E%20%3Crect%20x%3D%22338.0%22%20y%3D%22194.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220%22%20%2F%3E%20%3Crect%20x%3D%22362.0%22%20y%3D%222.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220%22%20%2F%3E%20%3Crect%20x%3D%22362.0%22%20y%3D%2226.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220.8%22%20%2F%3E%20%3Crect%20x%3D%22362.0%22%20y%3D%2250.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%221%22%20%2F%3E%20%3Crect%20x%3D%22362.0%22%20y%3D%2274.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220.2%22%20%2F%3E%20%3Crect%20x%3D%22362.0%22%20y%3D%2298.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220%22%20%2F%3E%20%3Crect%20x%3D%22362.0%22%20y%3D%22122.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220.8%22%20%2F%3E%20%3Crect%20x%3D%22362.0%22%20y%3D%22146.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220.8%22%20%2F%3E%20%3Crect%20x%3D%22362.0%22%20y%3D%22170.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220%22%20%2F%3E%20%3Crect%20x%3D%22362.0%22%20y%3D%22194.0%22%20width%3D%2220.0%22%20height%3D%2220.0%22%20fill-opacity%3D%220%22%20%2F%3E%3C%2Fsvg%3E'), linear-gradient(343deg, #082845 25%, #2184DE 100%);
	}
}

body:after {
	background-color: #1D6EB8;
	content: '';
	display: block;
	height: 100%;
	left: 0;
	opacity: 0;
	position: fixed;
	top: 0;
	transform: scale(1);
	transition: opacity 2.75s ease-in-out 0.25s, visibility 2.75s 0.25s;
	visibility: hidden;
	width: 100%;
	z-index: 1;
}

body.is-loading:after {
	opacity: 1;
	visibility: visible;
}

:root {
	--background-height: 100vh;
	--site-language-alignment: left;
	--site-language-direction: ltr;
	--site-language-flex-alignment: flex-start;
	--site-language-indent-left: 1;
	--site-language-indent-right: 0;
	--viewport-height: 100vh;
}

html {
	font-size: 24pt;
}

u {
	text-decoration: underline;
}

strong {
	color: inherit;
	font-weight: bolder;
}

em {
	font-style: italic;
}

code {
	background-color: rgba(144,144,144,0.25);
	border-radius: 0.25em;
	font-family: 'Lucida Console', 'Courier New', monospace;
	font-size: 0.9em;
	font-weight: normal;
	letter-spacing: 0;
	margin: 0 0.25em;
	padding: 0.25em 0.5em;
	text-indent: 0;
}

mark {
	background-color: rgba(144,144,144,0.25);
}

s {
	text-decoration: line-through;
}

sub {
	font-size: smaller;
	vertical-align: sub;
}

sup {
	font-size: smaller;
	vertical-align: super;
}

a {
	color: inherit;
	text-decoration: underline;
	transition: color 0.25s ease;
}

#wrapper {
	-webkit-overflow-scrolling: touch;
	align-items: center;
	display: flex;
	flex-direction: column;
	justify-content: center;
	min-height: var(--viewport-height);
	overflow: hidden;
	position: relative;
	z-index: 2;
	padding: 1.5rem 1.5rem 1.5rem 1.5rem;
}

#main {
	--alignment: center;
	--flex-alignment: center;
	--indent-left: 1;
	--indent-right: 1;
	--border-radius-tl: 3rem;
	--border-radius-tr: 3rem;
	--border-radius-br: 3rem;
	--border-radius-bl: 3rem;
	align-items: center;
	display: flex;
	flex-grow: 0;
	flex-shrink: 0;
	justify-content: center;
	max-width: 100%;
	position: relative;
	text-align: var(--alignment);
	z-index: 1;
	background-color: #FAFAFA;
	border-radius: var(--border-radius-tl) var(--border-radius-tr) var(--border-radius-br) var(--border-radius-bl);
}

@media (prefers-color-scheme: dark) {
	#main {
		background-color: #1F1F1F;
	}
}

#main > .inner {
	--padding-horizontal: 3rem;
	--padding-vertical: 1.625rem;
	--spacing: 0rem;
	--width: 20rem;
	border-radius: var(--border-radius-tl) var(--border-radius-tr) var(--border-radius-br) var(--border-radius-bl);
	max-width: 100%;
	position: relative;
	width: var(--width);
	z-index: 1;
	padding: var(--padding-vertical) var(--padding-horizontal);
}

#main > .inner > * {
	margin-top: var(--spacing);
	margin-bottom: var(--spacing);
}

#main > .inner > :first-child {
	margin-top: 0 !important;
}

#main > .inner > :last-child {
	margin-bottom: 0 !important;
}

#main > .inner > .full {
	margin-left: calc(var(--padding-horizontal) * -1);
	max-width: calc(100% + calc(var(--padding-horizontal) * 2) + 0.4725px);
	width: calc(100% + calc(var(--padding-horizontal) * 2) + 0.4725px);
}

#main > .inner > .full:first-child {
	border-top-left-radius: inherit;
	border-top-right-radius: inherit;
	margin-top: calc(var(--padding-vertical) * -1) !important;
}

#main > .inner > .full:last-child {
	border-bottom-left-radius: inherit;
	border-bottom-right-radius: inherit;
	margin-bottom: calc(var(--padding-vertical) * -1) !important;
}

#main > .inner > .full.screen {
	border-radius: 0 !important;
	max-width: 100vw;
	position: relative;
	width: 100vw;
	left: 50%;
	margin-left: -50vw;
	right: auto;
}

body.is-instant #main, body.is-instant #main > .inner > *,body.is-instant #main > .inner > section > *  {
	transition: none !important;
}

body.is-instant:after {
	display: none !important;
	transition: none !important;
}

@keyframes onvisible-slide-left {
	0% {
		visibility: hidden;
		transform: translateX(100vw);
	}

	1% {
		visibility: visible;
	}

	100% {
		transform: translateX(0);
	}
}

@keyframes onvisible-slide-right {
	0% {
		visibility: hidden;
		transform: translateX(-100vw);
	}

	1% {
		visibility: visible;
	}

	100% {
		transform: translateX(0);
	}
}

h1, h2, h3, p {
	direction: var(--site-language-direction);
	position: relative;
}

h1 span.p, h2 span.p, h3 span.p, p span.p {
	display: block;
	position: relative;
}

h1 span[style], h2 span[style], h3 span[style], p span[style], h1 strong, h2 strong, h3 strong, p strong, h1 a, h2 a, h3 a, p a, h1 code, h2 code, h3 code, p code, h1 mark, h2 mark, h3 mark, p mark {
	-webkit-text-fill-color: currentcolor;
}

#text01 {
	color: #000000;
	font-family: 'Figtree', sans-serif;
	font-size: 2em;
	line-height: 1.5;
	font-weight: 600;
}

@media (prefers-color-scheme: dark) {
	#text01 {
		color: #FFFFFF;
	}
}

#text01 a {
	text-decoration: underline;
}

#text01 a:hover {
	text-decoration: none;
}

#text01 span.p:nth-child(n + 2) {
	margin-top: 1rem;
}

#text02 {
	color: #000000;
	font-family: 'Figtree', sans-serif;
	font-size: 1em;
	line-height: 1.5;
	font-weight: 300;
}

@media (prefers-color-scheme: dark) {
	#text02 {
		color: #FFFFFF;
	}
}

#text02 a {
	text-decoration: underline;
}

#text02 a:hover {
	text-decoration: none;
}

#text02 span.p:nth-child(n + 2) {
	margin-top: 1rem;
}

#text03 {
	color: #000000;
	font-family: 'Figtree', sans-serif;
	font-size: 0.625em;
	line-height: 1.5;
	font-weight: 300;
}

@media (prefers-color-scheme: dark) {
	#text03 {
		color: #FFFFFF;
	}
}

#text03 a {
	text-decoration: underline;
}

#text03 a:hover {
	text-decoration: none;
}

#text03 span.p:nth-child(n + 2) {
	margin-top: 1rem;
}

#text04 {
	color: #000000;
	font-family: 'Figtree', sans-serif;
	font-size: 1em;
	line-height: 1.5;
	font-weight: 400;
}

@media (prefers-color-scheme: dark) {
	#text04 {
		color: #FFFFFF;
	}
}

#text04 a {
	text-decoration: underline;
}

#text04 a:hover {
	text-decoration: none;
}

#text04 span.p:nth-child(n + 2) {
	margin-top: 1rem;
}

#text06 {
	text-align: justify;
	color: #000000;
	font-family: 'Figtree', sans-serif;
	font-size: 0.625em;
	line-height: 1.5;
	font-weight: 400;
}

@media (prefers-color-scheme: dark) {
	#text06 {
		color: #FFFFFF;
	}
}

#text06 a {
	text-decoration: underline;
}

#text06 a:hover {
	text-decoration: none;
}

#text06 span.p:nth-child(n + 2) {
	margin-top: 1rem;
}

#text05 {
	color: #000000;
	font-family: 'Figtree', sans-serif;
	font-size: 1em;
	line-height: 1.5;
	font-weight: 600;
}

@media (prefers-color-scheme: dark) {
	#text05 {
		color: #FFFFFF;
	}
}

#text05 a {
	text-decoration: underline;
}

#text05 a:hover {
	text-decoration: none;
}

#text05 span.p:nth-child(n + 2) {
	margin-top: 1rem;
}

#text07 {
	color: #000000;
	font-family: 'Figtree', sans-serif;
	font-size: 0.5em;
	line-height: 1.5;
	font-weight: 300;
}

@media (prefers-color-scheme: dark) {
	#text07 {
		color: #FFFFFF;
	}
}

#text07 a {
	text-decoration: underline;
}

#text07 a:hover {
	text-decoration: none;
}

#text07 span.p:nth-child(n + 2) {
	margin-top: 1rem;
}

.container {
	position: relative;
}

.container > .wrapper {
	vertical-align: top;
	position: relative;
	max-width: 100%;
	border-radius: inherit;
}

.container > .wrapper > .inner {
	vertical-align: top;
	position: relative;
	max-width: 100%;
	border-radius: inherit;
	text-align: var(--alignment);
}

#main .container.full:first-child > .wrapper {
	border-top-left-radius: inherit;
	border-top-right-radius: inherit;
}

#main .container.full:last-child > .wrapper {
	border-bottom-left-radius: inherit;
	border-bottom-right-radius: inherit;
}

#main .container.full:first-child > .wrapper > .inner {
	border-top-left-radius: inherit;
	border-top-right-radius: inherit;
}

#main .container.full:last-child > .wrapper > .inner {
	border-bottom-left-radius: inherit;
	border-bottom-right-radius: inherit;
}

#container01 {
	display: flex;
	width: 100%;
	align-items: center;
	justify-content: center;
	background-color: transparent;
}

#container01 > .wrapper > .inner {
	--gutters: 2rem;
	--padding-vertical: 0.125rem;
	padding: var(--padding-vertical) var(--padding-horizontal);
}

#container01 > .wrapper {
	max-width: var(--width);
	width: 100%;
}

#container01.default > .wrapper > .inner > * {
	margin-bottom: var(--spacing);
	margin-top: var(--spacing);
}

#container01.default > .wrapper > .inner > *:first-child {
	margin-top: 0 !important;
}

#container01.default > .wrapper > .inner > *:last-child {
	margin-bottom: 0 !important;
}

#container01.columns > .wrapper > .inner {
	flex-wrap: wrap;
	display: flex;
	align-items: flex-start;
}

#container01.columns > .wrapper > .inner > * {
	flex-grow: 0;
	flex-shrink: 0;
	max-width: 100%;
	text-align: var(--alignment);
	padding: 0 0 0 var(--gutters);
}

#container01.columns > .wrapper > .inner > * > * {
	margin-bottom: var(--spacing);
	margin-top: var(--spacing);
}

#container01.columns > .wrapper > .inner > * > *:first-child {
	margin-top: 0 !important;
}

#container01.columns > .wrapper > .inner > * > *:last-child {
	margin-bottom: 0 !important;
}

#container01.columns > .wrapper > .inner > *:first-child {
	margin-left: calc(var(--gutters) * -1);
}

#container01.default > .wrapper > .inner > .full {
	margin-left: calc(var(--padding-horizontal) * -1);
	max-width: none !important;
	width: calc(100% + (var(--padding-horizontal) * 2) + 0.4725px);
}

#container01.default > .wrapper > .inner > .full:first-child {
	margin-top: calc(var(--padding-vertical) * -1) !important;
	border-top-left-radius: inherit;
	border-top-right-radius: inherit;
}

#container01.default > .wrapper > .inner > .full:last-child {
	margin-bottom: calc(var(--padding-vertical) * -1) !important;
	border-bottom-left-radius: inherit;
	border-bottom-right-radius: inherit;
}

#container01.columns > .wrapper > .inner > div > .full {
	margin-left: calc(var(--gutters) * -0.5);
	max-width: none !important;
	width: calc(100% + var(--gutters) + 0.4725px);
}

#container01.columns > .wrapper > .inner > div:first-child > .full {
	margin-left: calc(var(--padding-horizontal) * -1);
	width: calc(100% + var(--padding-horizontal) + calc(var(--gutters) * 0.5) + 0.4725px);
}

#container01.columns > .wrapper > .inner > div:last-child > .full {
	width: calc(100% + var(--padding-horizontal) + calc(var(--gutters) * 0.5) + 0.4725px);
}

#container01.columns > .wrapper > .inner > div > .full:first-child {
	margin-top: calc(var(--padding-vertical) * -1) !important;
}

#container01.columns > .wrapper > .inner > div > .full:last-child {
	margin-bottom: calc(var(--padding-vertical) * -1) !important;
}

#container01.columns > .wrapper > .inner > div:first-child, #container01.columns > .wrapper > .inner > div:first-child > .full:first-child {
	border-top-left-radius: inherit;
}

#container01.columns > .wrapper > .inner > div:last-child, #container01.columns > .wrapper > .inner > div:last-child > .full:first-child {
	border-top-right-radius: inherit;
}

#container01.columns > .wrapper > .inner > .full {
	align-self: stretch;
}

#container01.columns > .wrapper > .inner > .full:first-child {
	border-bottom-left-radius: inherit;
	border-top-left-radius: inherit;
}

#container01.columns > .wrapper > .inner > .full:last-child {
	border-bottom-right-radius: inherit;
	border-top-right-radius: inherit;
}

#container01.columns > .wrapper > .inner > .full > .full:first-child:last-child {
	border-radius: inherit;
	height: calc(100% + (var(--padding-vertical) * 2));
}

#container01.columns > .wrapper > .inner > .full > .full:first-child:last-child > * {
	border-radius: inherit;
	height: 100%;
	position: absolute;
	width: 100%;
}

#container02 {
	display: flex;
	width: 100%;
	align-items: center;
	justify-content: center;
	background-color: transparent;
}

#container02 > .wrapper > .inner {
	--gutters: 1.5rem;
	--padding-horizontal: 0.5rem;
	--padding-vertical: 0.25rem;
	padding: var(--padding-vertical) var(--padding-horizontal);
}

#container02 > .wrapper {
	max-width: var(--width);
	width: 100%;
}

#container02.default > .wrapper > .inner > * {
	margin-bottom: var(--spacing);
	margin-top: var(--spacing);
}

#container02.default > .wrapper > .inner > *:first-child {
	margin-top: 0 !important;
}

#container02.default > .wrapper > .inner > *:last-child {
	margin-bottom: 0 !important;
}

#container02.columns > .wrapper > .inner {
	flex-wrap: wrap;
	display: flex;
	align-items: flex-start;
}

#container02.columns > .wrapper > .inner > * {
	flex-grow: 0;
	flex-shrink: 0;
	max-width: 100%;
	text-align: var(--alignment);
	padding: 0 0 0 var(--gutters);
}

#container02.columns > .wrapper > .inner > * > * {
	margin-bottom: var(--spacing);
	margin-top: var(--spacing);
}

#container02.columns > .wrapper > .inner > * > *:first-child {
	margin-top: 0 !important;
}

#container02.columns > .wrapper > .inner > * > *:last-child {
	margin-bottom: 0 !important;
}

#container02.columns > .wrapper > .inner > *:first-child {
	margin-left: calc(var(--gutters) * -1);
}

#container02.default > .wrapper > .inner > .full {
	margin-left: calc(var(--padding-horizontal) * -1);
	max-width: none !important;
	width: calc(100% + (var(--padding-horizontal) * 2) + 0.4725px);
}

#container02.default > .wrapper > .inner > .full:first-child {
	margin-top: calc(var(--padding-vertical) * -1) !important;
	border-top-left-radius: inherit;
	border-top-right-radius: inherit;
}

#container02.default > .wrapper > .inner > .full:last-child {
	margin-bottom: calc(var(--padding-vertical) * -1) !important;
	border-bottom-left-radius: inherit;
	border-bottom-right-radius: inherit;
}

#container02.columns > .wrapper > .inner > div > .full {
	margin-left: calc(var(--gutters) * -0.5);
	max-width: none !important;
	width: calc(100% + var(--gutters) + 0.4725px);
}

#container02.columns > .wrapper > .inner > div:first-child > .full {
	margin-left: calc(var(--padding-horizontal) * -1);
	width: calc(100% + var(--padding-horizontal) + calc(var(--gutters) * 0.5) + 0.4725px);
}

#container02.columns > .wrapper > .inner > div:last-child > .full {
	width: calc(100% + var(--padding-horizontal) + calc(var(--gutters) * 0.5) + 0.4725px);
}

#container02.columns > .wrapper > .inner > div > .full:first-child {
	margin-top: calc(var(--padding-vertical) * -1) !important;
}

#container02.columns > .wrapper > .inner > div > .full:last-child {
	margin-bottom: calc(var(--padding-vertical) * -1) !important;
}

#container02.columns > .wrapper > .inner > div:first-child, #container02.columns > .wrapper > .inner > div:first-child > .full:first-child {
	border-top-left-radius: inherit;
}

#container02.columns > .wrapper > .inner > div:last-child, #container02.columns > .wrapper > .inner > div:last-child > .full:first-child {
	border-top-right-radius: inherit;
}

#container02.columns > .wrapper > .inner > .full {
	align-self: stretch;
}

#container02.columns > .wrapper > .inner > .full:first-child {
	border-bottom-left-radius: inherit;
	border-top-left-radius: inherit;
}

#container02.columns > .wrapper > .inner > .full:last-child {
	border-bottom-right-radius: inherit;
	border-top-right-radius: inherit;
}

#container02.columns > .wrapper > .inner > .full > .full:first-child:last-child {
	border-radius: inherit;
	height: calc(100% + (var(--padding-vertical) * 2));
}

#container02.columns > .wrapper > .inner > .full > .full:first-child:last-child > * {
	border-radius: inherit;
	height: 100%;
	position: absolute;
	width: 100%;
}

#container02 > .wrapper > .inner > :nth-child(1) {
	width: calc(40% + (var(--gutters) / 2));
}

#container02 > .wrapper > .inner > :nth-child(2) {
	width: calc(60% + (var(--gutters) / 2));
}

#container03 {
	display: flex;
	width: 100%;
	align-items: flex-end;
	justify-content: center;
	background-color: transparent;
}

#container03 > .wrapper > .inner {
	--gutters: 1.5rem;
	--padding-horizontal: 0.125rem;
	--padding-vertical: 0.25rem;
	padding: var(--padding-vertical) var(--padding-horizontal);
}

#container03 > .wrapper {
	max-width: var(--width);
	width: 100%;
}

#container03.default > .wrapper > .inner > * {
	margin-bottom: var(--spacing);
	margin-top: var(--spacing);
}

#container03.default > .wrapper > .inner > *:first-child {
	margin-top: 0 !important;
}

#container03.default > .wrapper > .inner > *:last-child {
	margin-bottom: 0 !important;
}

#container03.columns > .wrapper > .inner {
	flex-wrap: wrap;
	display: flex;
	align-items: flex-start;
}

#container03.columns > .wrapper > .inner > * {
	flex-grow: 0;
	flex-shrink: 0;
	max-width: 100%;
	text-align: var(--alignment);
	padding: 0 0 0 var(--gutters);
}

#container03.columns > .wrapper > .inner > * > * {
	margin-bottom: var(--spacing);
	margin-top: var(--spacing);
}

#container03.columns > .wrapper > .inner > * > *:first-child {
	margin-top: 0 !important;
}

#container03.columns > .wrapper > .inner > * > *:last-child {
	margin-bottom: 0 !important;
}

#container03.columns > .wrapper > .inner > *:first-child {
	margin-left: calc(var(--gutters) * -1);
}

#container03.default > .wrapper > .inner > .full {
	margin-left: calc(var(--padding-horizontal) * -1);
	max-width: none !important;
	width: calc(100% + (var(--padding-horizontal) * 2) + 0.4725px);
}

#container03.default > .wrapper > .inner > .full:first-child {
	margin-top: calc(var(--padding-vertical) * -1) !important;
	border-top-left-radius: inherit;
	border-top-right-radius: inherit;
}

#container03.default > .wrapper > .inner > .full:last-child {
	margin-bottom: calc(var(--padding-vertical) * -1) !important;
	border-bottom-left-radius: inherit;
	border-bottom-right-radius: inherit;
}

#container03.columns > .wrapper > .inner > div > .full {
	margin-left: calc(var(--gutters) * -0.5);
	max-width: none !important;
	width: calc(100% + var(--gutters) + 0.4725px);
}

#container03.columns > .wrapper > .inner > div:first-child > .full {
	margin-left: calc(var(--padding-horizontal) * -1);
	width: calc(100% + var(--padding-horizontal) + calc(var(--gutters) * 0.5) + 0.4725px);
}

#container03.columns > .wrapper > .inner > div:last-child > .full {
	width: calc(100% + var(--padding-horizontal) + calc(var(--gutters) * 0.5) + 0.4725px);
}

#container03.columns > .wrapper > .inner > div > .full:first-child {
	margin-top: calc(var(--padding-vertical) * -1) !important;
}

#container03.columns > .wrapper > .inner > div > .full:last-child {
	margin-bottom: calc(var(--padding-vertical) * -1) !important;
}

#container03.columns > .wrapper > .inner > div:first-child, #container03.columns > .wrapper > .inner > div:first-child > .full:first-child {
	border-top-left-radius: inherit;
}

#container03.columns > .wrapper > .inner > div:last-child, #container03.columns > .wrapper > .inner > div:last-child > .full:first-child {
	border-top-right-radius: inherit;
}

#container03.columns > .wrapper > .inner > .full {
	align-self: stretch;
}

#container03.columns > .wrapper > .inner > .full:first-child {
	border-bottom-left-radius: inherit;
	border-top-left-radius: inherit;
}

#container03.columns > .wrapper > .inner > .full:last-child {
	border-bottom-right-radius: inherit;
	border-top-right-radius: inherit;
}

#container03.columns > .wrapper > .inner > .full > .full:first-child:last-child {
	border-radius: inherit;
	height: calc(100% + (var(--padding-vertical) * 2));
}

#container03.columns > .wrapper > .inner > .full > .full:first-child:last-child > * {
	border-radius: inherit;
	height: 100%;
	position: absolute;
	width: 100%;
}

.links {
	display: flex;
	justify-content: var(--flex-alignment);
	letter-spacing: 0;
	line-height: 1.5;
	padding: 0;
}

.links li {
	position: relative;
}

.links li a {
	direction: var(--site-language-direction);
	display: block;
}

#links01 {
	gap: 0rem;
	flex-direction: row;
	flex-wrap: wrap;
	font-family: 'Figtree', sans-serif;
	font-size: 0.625em;
	font-weight: 400;
}

#links01 li a {
	color: #000000;
	text-decoration: underline;
}

@media (prefers-color-scheme: dark) {
	#links01 li a {
		color: #FFFFFF;
	}
}

#links01 li a:hover {
	text-decoration: none;
}

@media (max-width: 1920px) {

}

@media (max-width: 1680px) {
	html {
		font-size: 18pt;
	}
}

@media (max-width: 1280px) {
	html {
		font-size: 18pt;
	}
}

@media (max-width: 1024px) {

}

@media (max-width: 980px) {
	html {
		font-size: 15pt;
	}
}

@media (max-width: 736px) {
	html {
		font-size: 15pt;
	}



	#main > .inner {
		--padding-horizontal: 2rem;
		--padding-vertical: 1.625rem;
		--spacing: 0rem;
	}

	#text01 {
		letter-spacing: 0rem;
		width: 100%;
		font-size: 1.875em;
		line-height: 1.5;
	}

	#text02 {
		letter-spacing: 0rem;
		width: 100%;
		font-size: 1em;
		line-height: 1.5;
	}

	#text03 {
		letter-spacing: 0rem;
		width: 100%;
		font-size: 0.625em;
		line-height: 1.5;
	}

	#text04 {
		letter-spacing: 0rem;
		width: 100%;
		font-size: 1.75em;
		line-height: 1.5;
	}

	#text06 {
		letter-spacing: 0rem;
		width: 100%;
		font-size: 0.625em;
		line-height: 1.5;
	}

	#text05 {
		letter-spacing: 0rem;
		width: 100%;
		font-size: 1em;
		line-height: 1.5;
	}

	#text07 {
		letter-spacing: 0rem;
		width: 100%;
		font-size: 0.5em;
		line-height: 1.5;
	}



	#container01 > .wrapper > .inner {
		--gutters: 2rem;
		--padding-vertical: 0.125rem;
	}

	#container01.columns > .wrapper > .inner {
		flex-direction: column !important;
		flex-wrap: nowrap !important;
	}

	#container01.columns > .wrapper > .inner > span {
		height: 0;
		margin-top: calc(var(--gutters) * -1);
		pointer-events: none;
		visibility: hidden;
	}

	#container01.columns > .wrapper > .inner > *:first-child {
		margin-left: 0 !important;
		padding-top: 0 !important;
	}

	#container01.columns > .wrapper > .inner > * {
		padding: calc(var(--gutters) * 0.5) 0 !important;
	}

	#container01.columns > .wrapper > .inner > *:last-child {
		padding-bottom: 0 !important;
	}

	#container01.columns > .wrapper > .inner > div > .full {
		margin-left: calc(var(--padding-horizontal) * -1);
		width: calc(100% + (var(--padding-horizontal) * 2) + 0.4725px);
	}

	#container01.columns > .wrapper > .inner > div:first-of-type > .full {
		margin-left: calc(var(--padding-horizontal) * -1);
		width: calc(100% + (var(--padding-horizontal) * 2) + 0.4725px);
	}

	#container01.columns > .wrapper > .inner > div:last-of-type > .full {
		margin-left: calc(var(--padding-horizontal) * -1);
		width: calc(100% + (var(--padding-horizontal) * 2) + 0.4725px);
	}

	#container01.columns > .wrapper > .inner > div > .full:first-child {
		margin-top: calc(var(--gutters) * -0.5) !important;
	}

	#container01.columns > .wrapper > .inner > div > .full:last-child {
		margin-bottom: calc(var(--gutters) * -0.5) !important;
	}

	#container01.columns > .wrapper > .inner > div:first-of-type > .full:first-child {
		margin-top: calc(var(--padding-vertical) * -1) !important;
	}

	#container01.columns > .wrapper > .inner > div:last-of-type > .full:last-child {
		margin-bottom: calc(var(--padding-vertical) * -1) !important;
	}

	#container01.columns > .wrapper > .inner > div:first-of-type, #container01.columns > .wrapper > .inner > div:first-of-type > .full:first-child {
		border-top-left-radius: inherit;
		border-top-right-radius: inherit;
	}

	#container01.columns > .wrapper > .inner > div:last-of-type, #container01.columns > .wrapper > .inner > div:last-of-type > .full:last-child {
		border-bottom-left-radius: inherit;
		border-bottom-right-radius: inherit;
	}

	#container01.columns > .wrapper > .inner > div:first-of-type, #container01.columns > .wrapper > .inner > div:first-of-type > .full:last-child {
		border-bottom-left-radius: 0 !important;
	}

	#container01.columns > .wrapper > .inner > div:last-of-type, #container01.columns > .wrapper > .inner > div:last-of-type > .full:first-child {
		border-top-right-radius: 0 !important;
	}

	#container01.columns > .wrapper > .inner > .full > .full:first-child:last-child {
		height: auto;
	}

	#container01.columns > .wrapper > .inner > .full > .full:first-child:last-child > * {
		height: auto;
		position: relative;
		width: auto;
	}



	#container02 > .wrapper > .inner {
		--gutters: 1rem;
		--padding-horizontal: 1.625rem;
		--padding-vertical: 0.25rem;
	}

	#container02.columns > .wrapper > .inner {
		flex-direction: column !important;
		flex-wrap: nowrap !important;
	}

	#container02.columns > .wrapper > .inner > span {
		height: 0;
		margin-top: calc(var(--gutters) * -1);
		pointer-events: none;
		visibility: hidden;
	}

	#container02.columns > .wrapper > .inner > *:first-child {
		margin-left: 0 !important;
		padding-top: 0 !important;
	}

	#container02.columns > .wrapper > .inner > * {
		padding: calc(var(--gutters) * 0.5) 0 !important;
	}

	#container02.columns > .wrapper > .inner > *:last-child {
		padding-bottom: 0 !important;
	}

	#container02.columns > .wrapper > .inner > div > .full {
		margin-left: calc(var(--padding-horizontal) * -1);
		width: calc(100% + (var(--padding-horizontal) * 2) + 0.4725px);
	}

	#container02.columns > .wrapper > .inner > div:first-of-type > .full {
		margin-left: calc(var(--padding-horizontal) * -1);
		width: calc(100% + (var(--padding-horizontal) * 2) + 0.4725px);
	}

	#container02.columns > .wrapper > .inner > div:last-of-type > .full {
		margin-left: calc(var(--padding-horizontal) * -1);
		width: calc(100% + (var(--padding-horizontal) * 2) + 0.4725px);
	}

	#container02.columns > .wrapper > .inner > div > .full:first-child {
		margin-top: calc(var(--gutters) * -0.5) !important;
	}

	#container02.columns > .wrapper > .inner > div > .full:last-child {
		margin-bottom: calc(var(--gutters) * -0.5) !important;
	}

	#container02.columns > .wrapper > .inner > div:first-of-type > .full:first-child {
		margin-top: calc(var(--padding-vertical) * -1) !important;
	}

	#container02.columns > .wrapper > .inner > div:last-of-type > .full:last-child {
		margin-bottom: calc(var(--padding-vertical) * -1) !important;
	}

	#container02.columns > .wrapper > .inner > div:first-of-type, #container02.columns > .wrapper > .inner > div:first-of-type > .full:first-child {
		border-top-left-radius: inherit;
		border-top-right-radius: inherit;
	}

	#container02.columns > .wrapper > .inner > div:last-of-type, #container02.columns > .wrapper > .inner > div:last-of-type > .full:last-child {
		border-bottom-left-radius: inherit;
		border-bottom-right-radius: inherit;
	}

	#container02.columns > .wrapper > .inner > div:first-of-type, #container02.columns > .wrapper > .inner > div:first-of-type > .full:last-child {
		border-bottom-left-radius: 0 !important;
	}

	#container02.columns > .wrapper > .inner > div:last-of-type, #container02.columns > .wrapper > .inner > div:last-of-type > .full:first-child {
		border-top-right-radius: 0 !important;
	}

	#container02.columns > .wrapper > .inner > .full > .full:first-child:last-child {
		height: auto;
	}

	#container02.columns > .wrapper > .inner > .full > .full:first-child:last-child > * {
		height: auto;
		position: relative;
		width: auto;
	}

	#container02 > .wrapper > .inner > :nth-child(1) {
		min-height: 100% !important;
		width: 100% !important;
	}

	#container02 > .wrapper > .inner > :nth-child(2) {
		min-height: 100% !important;
		width: 100% !important;
	}



	#container03 > .wrapper > .inner {
		--gutters: 1.5rem;
		--padding-horizontal: 1.625rem;
		--padding-vertical: 0.25rem;
	}

	#container03.columns > .wrapper > .inner {
		flex-direction: column !important;
		flex-wrap: nowrap !important;
	}

	#container03.columns > .wrapper > .inner > span {
		height: 0;
		margin-top: calc(var(--gutters) * -1);
		pointer-events: none;
		visibility: hidden;
	}

	#container03.columns > .wrapper > .inner > *:first-child {
		margin-left: 0 !important;
		padding-top: 0 !important;
	}

	#container03.columns > .wrapper > .inner > * {
		padding: calc(var(--gutters) * 0.5) 0 !important;
	}

	#container03.columns > .wrapper > .inner > *:last-child {
		padding-bottom: 0 !important;
	}

	#container03.columns > .wrapper > .inner > div > .full {
		margin-left: calc(var(--padding-horizontal) * -1);
		width: calc(100% + (var(--padding-horizontal) * 2) + 0.4725px);
	}

	#container03.columns > .wrapper > .inner > div:first-of-type > .full {
		margin-left: calc(var(--padding-horizontal) * -1);
		width: calc(100% + (var(--padding-horizontal) * 2) + 0.4725px);
	}

	#container03.columns > .wrapper > .inner > div:last-of-type > .full {
		margin-left: calc(var(--padding-horizontal) * -1);
		width: calc(100% + (var(--padding-horizontal) * 2) + 0.4725px);
	}

	#container03.columns > .wrapper > .inner > div > .full:first-child {
		margin-top: calc(var(--gutters) * -0.5) !important;
	}

	#container03.columns > .wrapper > .inner > div > .full:last-child {
		margin-bottom: calc(var(--gutters) * -0.5) !important;
	}

	#container03.columns > .wrapper > .inner > div:first-of-type > .full:first-child {
		margin-top: calc(var(--padding-vertical) * -1) !important;
	}

	#container03.columns > .wrapper > .inner > div:last-of-type > .full:last-child {
		margin-bottom: calc(var(--padding-vertical) * -1) !important;
	}

	#container03.columns > .wrapper > .inner > div:first-of-type, #container03.columns > .wrapper > .inner > div:first-of-type > .full:first-child {
		border-top-left-radius: inherit;
		border-top-right-radius: inherit;
	}

	#container03.columns > .wrapper > .inner > div:last-of-type, #container03.columns > .wrapper > .inner > div:last-of-type > .full:last-child {
		border-bottom-left-radius: inherit;
		border-bottom-right-radius: inherit;
	}

	#container03.columns > .wrapper > .inner > div:first-of-type, #container03.columns > .wrapper > .inner > div:first-of-type > .full:last-child {
		border-bottom-left-radius: 0 !important;
	}

	#container03.columns > .wrapper > .inner > div:last-of-type, #container03.columns > .wrapper > .inner > div:last-of-type > .full:first-child {
		border-top-right-radius: 0 !important;
	}

	#container03.columns > .wrapper > .inner > .full > .full:first-child:last-child {
		height: auto;
	}

	#container03.columns > .wrapper > .inner > .full > .full:first-child:last-child > * {
		height: auto;
		position: relative;
		width: auto;
	}

	#links01 {
		gap: 0rem;
		font-size: 1.125em;
	}
}

@media (max-width: 480px) {
	#main > .inner {
		--spacing: 0rem;
	}
}

@media (max-width: 360px) {
	#main > .inner {
		--padding-horizontal: 1.5rem;
		--padding-vertical: 1.21875rem;
		--spacing: 0rem;
	}

	#text01 {
		font-size: 1.875em;
	}

	#text02 {
		font-size: 1em;
	}

	#text03 {
		font-size: 0.625em;
	}

	#text04 {
		font-size: 1.75em;
	}

	#text06 {
		font-size: 0.625em;
	}

	#text05 {
		font-size: 1em;
	}

	#text07 {
		font-size: 0.5em;
	}

	#container01 > .wrapper > .inner {
		--gutters: 1.5rem;
		--padding-vertical: 0.09375rem;
	}

	#container02 > .wrapper > .inner {
		--gutters: 1rem;
		--padding-horizontal: 1.21875rem;
		--padding-vertical: 0.1875rem;
	}

	#container03 > .wrapper > .inner {
		--gutters: 1.125rem;
		--padding-horizontal: 1.21875rem;
		--padding-vertical: 0.1875rem;
	}

	#links01 {
		gap: 0rem;
		font-size: 1.125em;
	}
}

</style>
