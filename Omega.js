var Ω = (function () {
	"use strict";

	var Ω = function (from) {
		// Ω(null) = null
		if (from === null) {
			return null;
		}

		// Let the user avoid the use of the `new` keyword for succinctness
		if (!(this instanceof Ω)) {
			return new Ω(from);
		}
		
		// Support array-like structures
		if (Array.isArray(from) || from instanceof NodeList || from instanceof HTMLCollection) {
			return Array.from(from).map(object => Ω(object));
		}

		// Creation
		if (typeof from === "undefined") {
			throw new Error("You must call Ω with an argument.");
		}
		let element;
		if (from instanceof Ω) {
			return from;
		} if (from instanceof HTMLElement) {
			this.element = element = from;
		} else if (from instanceof Node) {
			this.element = element = from;
		} else if (typeof from === "string" || from instanceof String) {
			var selector = from;
			var id = selector.match(/#[a-z0-9-]+/);
			selector = selector.replace(/#[a-z0-9-]+/, "");
			var classes = selector.match(/\.[a-z0-9-]+/g);
			selector = selector.replace(/\.[a-z0-9-]+/g, "");
			var pseudoClasses = selector.match(/:[a-z-]+/g);
			selector = selector.replace(/:[a-z-]+/g, "");
			var attributes = selector.match(/\[[a-z]+(?:="[a-z0-9]+")?\]/g);
			selector = selector.replace(/\[[a-z]+(?:="[a-z0-9]+")?\]/g, "");
			this.element = element = document.createElement(selector);
			if (id) {
				this.element.id = id;
			}
			if (classes) {
				classes.map(styleClass => styleClass.slice(1)).forEach(styleClass => {
					this.element.classList.add(styleClass);
				});
			}
			if (pseudoClasses) {
				pseudoClasses.map(pseudoClass => pseudoClass.slice(1)).forEach(pseudoClass => {
					switch (pseudoClass) {
						case "focus":
							this.element.focus();
							break;
						case "empty":
							break; // Elements are empty by default
						case "target":
							if (window.location.hash.length > 1) {
								this.element.id = window.location.hash.slice(1);
							}
							break;
						case "checked":
							if (this.element instanceof HTMLInputElement) {
								this.element.checked = true;
							}
							break;
						case "enabled":
							break; // Elements are empty by default
						case "disabled":
							if (this.element instanceof HTMLInputElement) {
								this.element.disabled = true;
							}
							break;
						default:
							break; // Ignore unrecognised selectors
					}
				});
			}
			if (attributes) {
				attributes.forEach(attribute => {
					var assignment = attribute.slice(1, -1).split("=");
					this.element.setAttribute(assignment[0], assignment[1].slice(1, -1));
				});
			}
		} else {
			throw new Error("The type of argument passed to Ω could not be recognised as an element.");
		}

		// General Methods
		Object.defineProperty(this, "parentElement", {
			get () {
				return Ω(this.element.parentElement);
			}
		});
		Object.defineProperty(this, "previousSibling", {
			get () {
				return Ω(this.element.previousSibling);
			}
		});
		Object.defineProperty(this, "nextSibling", {
			get () {
				return Ω(this.element.nextSibling);
			}
		});
		Object.defineProperty(this, "childNodes", {
			get () {
				return Ω(this.element.childNodes);
			}
		});
		this.isText = this.element.nodeType === 3;
		this.setAttribute = (attribute, value) => {
			this.element.setAttribute(attribute, value);
			return this;
		};
		this.querySelector = selector => {
			return Ω(this.element.querySelector(selector));
		};
		this.querySelectorAll = selector => {
			return Ω(this.element.querySelectorAll(selector));
		};
		this.contains = object => {
			return this.element.contains(Ω(object).element);
		};
		this.append = object => {
			if (object !== null) {
				this.element.appendChild(Ω(object).element);
			}
			return this;
		};
		this.appendedTo = object => {
			Ω(object).append(this);
			return this;
		};
		this.insertBefore = (object, before) => {
			if (object !== null) {
				this.element.insertBefore(Ω(object).element, before !== null ? Ω(before).element : null);
			}
			return this;
		};
		this.insert = object => {
			return this.insertBefore(object, this.element.firstChild);
		};
		this.insertedInto = object => {
			object.insert(this);
			return this;
		};
		this.insertedBefore = before => {
			before.parentElement.insertBefore(this, before);
			return this;
		};
		this.follow = object => {
			if (object !== null) {
				this.element.parentNode.insertBefore(object.element, this.element.nextSibling);
			}
			return this;
		}
		this.following = object => {
			Ω(object).follow(this);
			return this;
		};
		this.withText = this.addText = text => {
			if (`${text}`.length > 0) {
				if (!this.isText) {
					this.element.appendChild(document.createTextNode(text));
				} else {
					this.element.nodeValue += `${text}`;
				}
			}
			return this;
		};
		this.withStyle = this.addStyle = style => {
			for (let attribute in style) {
				if (["left", "top", "right", "bottom"].indexOf(attribute) !== -1 && typeof style[attribute] === "number") {
					style[attribute] += "px";
				}
				this.element.style[attribute] = style[attribute];
			}
			return this;
		};
		this.clear = () => {
			if (!this.isText) {
				this.element.innerHTML = "";
			} else {
				this.element.nodeValue = "";
			}
			return this;
		};
		this.hasClass = name => {
			return this.element.classList.contains(name);
		};
		this.removeClass = (...names) => {
			names.forEach(name => this.element.classList.remove(name));
			return this;
		};
		this.addClass = name => {
			this.element.classList.add(name);
			return this;
		};
		this.replaceClass = (original, replacement) => {
			if (replacement !== undefined) {
				return this.removeClass(original).addClass(replacement);
			} else {
				this.element.className = "";
				return this.addClass(original);
			}
		};
		this.remove = () => {
			this.element.remove();
			return this;
		};
		this.listenFor = (type, callback) => {
			this.element.addEventListener(type, callback);
			return this;
		};
		this.trigger = type => {
			if (type instanceof Event) {
				this.element.dispatchEvent(type);
			} else {
				this.element.dispatchEvent(new Event(type));
			}
			return this;
		};
		this.onClick = callback => this.listenFor("click", event => callback(event, this));
		this.onMouseDown = callback => this.listenFor("mousedown", event => {
			if (event.button === 0) {
				callback(event, this);
			}
		});
		this.click = () => this.trigger("click");
		Object.defineProperty(this, "rect", {
			get () {
				return element.getBoundingClientRect();
			}
		});
		Object.defineProperty(this, "offsetRect", {
			get () {
				return {
					left: this.element.offsetLeft,
					top: this.element.offsetTop,
					right: this.element.offsetRight,
					bottom: this.element.offsetBottom,
					width: this.element.offsetWidth,
					height: this.element.offsetHeight,
				}
			}
		});
		Object.defineProperty(this, "scroll", {
			value: {
				get left () {
					return element.scrollLeft
				},
				set left (value) {
					element.scrollLeft = value;
				},
				get top () {
					return element.scrollTop
				},
				set top (value) {
					element.scrollTop = value;
				},
				get width () {
					return element.scrollWidth
				},
				get height () {
					return element.scrollHeight
				}
			}
		});

		// Specific Methods
		if (this.isText) {
			Object.defineProperty(this, "value", {
				get () {
					return element.nodeValue;
				},
				set (value) {
					element.nodeValue = `${value}`;
				}
			});
		}
		if (this.element instanceof HTMLTableElement) {
			this.row = index => {
				return Ω(this.element.rows[index >= 0 ? index : this.element.rows.length + index]);
			};
			this.rows = () => {
				return Ω(this.element.rows);
			};
			this.addRow = (cells, wrapWithTD) => {
				// Update with rest parameter soon
				var row = Ω(this.element.insertRow());
				if (typeof cells !== "undefined") {
					if (!Array.isArray(cells)) {
						cells = [cells];
					}
					cells.forEach(cell => row.append(wrapWithTD || typeof wrapWithTD === "undefined" ? Ω(`td`).append(cell) : cell));
				}
				return this;
			};
			this.sliceRows = (from, to) => {
				var i, rows = this.element.rows.length;
				for (i = 0; i < from; ++ i) {
					this.element.deleteRow(0);
				}
				for (i = to; i < rows; ++ i) {
					this.element.deleteRow(to - from);
				}
				return this;
			};
		}
		if (this.element instanceof HTMLTableRowElement) {
			this.cell = index => {
				return Ω(this.element.cells[index >= 0 ? index : this.elements.cells + index]);
			};
			this.cells = () => {
				return Ω(this.element.cells);
			};
		}
		if (this.element instanceof HTMLInputElement || this.element instanceof HTMLTextAreaElement || this.element instanceof HTMLSelectElement) {
			Object.defineProperty(this, "value", {
				get () {
					return element.value;
				},
				set (value) {
					element.value = value;
				}
			});
			this.withValue = this.setValue = value => {
				this.element.value = value;
				return this;
			};
			this.clear = () => {
				this.element.value = "";
				return this;
			};
		}
		if (this.element instanceof HTMLInputElement || this.element instanceof HTMLTextAreaElement || this.element instanceof HTMLSelectElement || this.element instanceof HTMLButtonElement) {
			Object.defineProperty(this, "enabled", {
				get () {
					return !element.disabled;
				},
				set (value) {
					element.disabled = !value;
				}
			});
			Object.defineProperty(this, "disabled", {
				get () {
					return element.disabled;
				},
				set (value) {
					element.disabled = value;
				}
			});
			this.enable = () => {
				this.element.disabled = false;
				return this;
			}
			this.disable = () => {
				this.element.disabled = true;
				return this;
			}
		}
		if (this.element instanceof HTMLInputElement || this.element instanceof HTMLTextAreaElement) {
			this.onInput = callback => this.listenFor("input", event => callback(this.value, this));
			this.onChange = callback => this.listenFor("change", event => callback());
			this.focus = () => {
				this.element.focus();
				return this;
			};
			this.blur = () => {
				this.element.blur();
				return this;
			};
			Object.defineProperty(this, "hasFocus", {
				get () {
					return document.activeElement !== this.element;
				}
			});
			this.onBlur = callback => this.listenFor("blur", event => {
				if (document.activeElement !== this.element) {
					callback(this);
				}
			});
			Object.defineProperty(this, "selection", {
				get () {
					return {
						start: this.element.selectionStart,
						end: this.element.selectionEnd,
						collapsed: this.element.selectionStart === this.element.selectionEnd
					}
				}
			});
			this.withSelection = this.setSelection = (start, end) => {
				this.element.setSelectionRange(start, end);
				return this;
			};
			this.withCursorAt = this.placeCursorAt = position => {
				return this.withSelection(position, position);
			};
			this.withCursorAtBeginning = this.placeCursorAtBeginning = () => {
				return this.withCursorAt(0);
			};
			this.withCursorAtEnd = this.placeCursorAtEnd = () => {
				return this.withCursorAt(this.value.length);
			};
		};
		if (this.element instanceof HTMLInputElement && ["checkbox", "radio"].indexOf(this.element.type) !== -1) {
			Object.defineProperty(this, "checked", {
				get () {
					return this.element.checked;
				},
				set (value) {
					this.element.checked = value;
				}
			});
			this.setChecked = checked => {
				this.element.checked = checked;
				return this;
			};
			this.check = () => this.setChecked(true);
			this.uncheck = () => this.setChecked(false);
			this.onChange = callback => this.listenFor("change", event => callback(this.checked, this));
			// Allow the user to use .value and .withValue to get and set the checked status of checkboxes, as well as listening for .onInput
			this.value = this.checked;
			this.withValue = this.setChecked;
			this.onInput = this.onChange;
		}
		if (this.element instanceof HTMLSelectElement) {
			this.withOptions = options => {
				options.forEach(option => this.append(Ω(`option`).withText(option)));
				return this;
			};
			this.onSelect = callback => this.listenFor("change", event => callback(this.element.value, this));
		}
	};

	return Ω;
}());

var ß = (function () {
	"use strict";

	var ß = function (from) {
		return Ω(document.createTextNode(from));
	};

	return ß;
}());