"use strict";

class MathsTree {
	constructor (referenceNode, cloneChildren) {
		if (typeof referenceNode === "undefined") {
			this.operation = null;
			this.data = null;
			this.parent = null;
			this.children = [];
		} else {
			this.operation = referenceNode.operation;
			this.data = referenceNode.data;
			this.parent = null;
			this.children = [];
			if (cloneChildren) {
				for (const child of referenceNode.children) {
					this.addChild(new MathsTree(child, true));
				}
			}
		}
	}
	insertChild (index, ...nodes) {
		for (const node of nodes) {
			if (node.parent !== null) {
				throw new Error(`You cannot add a child that already has a parent to a tree.`);
			}
			node.parent = this;
			this.children.splice(index ++, 0, node);
		}
	}
	addChild (...nodes) {
		this.insertChild(this.children.length, ...nodes);
	}
	removeChild (node) {
		if (!this.children.includes(node)) {
			throw new Error(`You cannot remove a child that is not part of the tree.`);
		}
		node.parent = null;
		this.children.splice(this.children.indexOf(node), 1);
	}
	removeAllChildren () {
		for (const child of this.children) {
			child.parent = null;
		}
		this.children = [];
	}
	relativeSibling (i) {
		if (this.parent !== null) {
			const indexOfSelf = this.parent.children.indexOf(this);
			if (indexOfSelf + i >= 0 && indexOfSelf + i < this.parent.children.length) {
				return this.parent.children[indexOfSelf + i];
			}
		}
		return null;
	}
	get previousSibling () {
		return this.relativeSibling(-1);
	}
	get nextSibling () {
		return this.relativeSibling(1);
	}
	adjacentCousin (next) {
		let levels = 0;
		let node = this;
		let previous = null;
		while (node !== null) {
			console.log(node);
			if (node.children.includes(previous) && node.children.indexOf(previous) !== (next ? node.children.length - 1 : 0)) {
				node = node.children[node.children.indexOf(previous) + (next ? 1 : -1)];
				while (node.children.length > 0) {
					node = node.children[next ? 0 : node.children.length - 1];
				}
				return node;
			}
			previous = node;
			node = node.parent;
		}
		return null;
	}
	get previousCousin () {
		return this.adjacentCousin(false);
	}
	get nextCousin () {
		return this.adjacentCousin(true);
	}
	get root () {
		let root = this;
		while (root.parent !== null) {
			root = root.parent;
		}
		return root;
	}
	evaluate () {
		if (this.operation === null) {
			return null;
		}
		if (this.operation === "value") {
			return {
				1: this.data
			};
		}
		if (this.operation === "symbol") {
			const match = this.data.match(/([0-9]*)([a-zA-Z]+)/);
			let value = match[1].length > 0 ? parseInt(match[1]) : 1;
			console.log({
				[match[2]]: value
			});
			return {
				[match[2]]: value
			};
		}
		const evaluatedChildren = this.children.map(child => child.evaluate());
		if (evaluatedChildren.includes(null)) {
			return null;
		}
		let values = {};
		for (const evaluatedChild of evaluatedChildren) {
			for (const key in evaluatedChild) {
				if (!values.hasOwnProperty(key)) {
					values[key] = [];
				}
				values[key].push(evaluatedChild[key]);
			}
		}
		let symbols = MathsTree.operations[this.operation].evaluate(values);
		for (const symbol in symbols) {
			if (symbols[symbol] === 0) {
				delete symbols[symbol];
			}
		}
		return symbols;
	}
	get isOperation () {
		return ![null, "value", "symbol"].includes(this.operation);
	}
	unresolve () {
		this.operation = null;
		this.data = null;
		this.removeAllChildren();
	}
	resolveToValue (value) {
		this.operation = "value";
		this.data = value;
	}
	resolveToSymbol (name) {
		this.operation = "symbol";
		const match = name.match(/([0-9]*)([a-zA-Z]+)/);
		let quantity = 1;
		if (match[1].length > 0) {
			quantity = parseInt(match[1]);
		}
		const symbols = match[2].split("").sort().join("");
		this.data = `${quantity}${symbols}`;
	}
	postOperation (operation) {
		if (!MathsTree.operations.hasOwnProperty(operation)) {
			throw new Error(`\`${operation}\` is not a valid operation.`);
		}

		const operationNode = new MathsTree();
		const midTree = new MathsTree();
		midTree.operation = operation;

		const parent = this.parent;
		if (parent !== null) {
			const secondParent = parent.parent;
			if (parent.operation === operation && MathsTree.operations[operation].associative) {
				parent.insertChild(parent.children.indexOf(this) + 1, operationNode);
				return [parent.root, operationNode];
			}

			const siblings = parent.children;
			
			siblings.splice(siblings.indexOf(this) + 1, 0, operationNode);
			parent.children = [];
			siblings.forEach(sibling => sibling.parent = null);
			const leftTree = new MathsTree(parent, false);
			leftTree.addChild(...siblings.slice(0, siblings.indexOf(this) + 1));
			const rightTree = new MathsTree(parent, false);
			rightTree.addChild(...siblings.slice(siblings.indexOf(this) + 1));
			
			midTree.children = [this, operationNode];

			let sidesUp = 0;
			if (MathsTree.operations[midTree.operation].precedence <= MathsTree.operations[leftTree.operation].precedence) {
				midTree.children.splice(0, 1);
				midTree.insertChild(0, leftTree);
			} else {
				++ sidesUp;
				leftTree.removeChild(this);
				midTree.parent = null;
				leftTree.addChild(midTree);
				this.parent = midTree;
			}
			if (MathsTree.operations[midTree.operation].precedence <= MathsTree.operations[rightTree.operation].precedence) {
				midTree.children.splice(1, 1);
				midTree.addChild(rightTree);
			} else {
				++ sidesUp;
				rightTree.removeChild(operationNode);
				midTree.parent = null;
				rightTree.addChild(midTree);
				operationNode.parent = midTree;
			}
			let parentNode;
			if (sidesUp === 2) {
				parentNode = rightTree;
				let i = 0;
				for (const child of leftTree.children) {
					if (child !== midTree) {
						leftTree.removeChild(child);
						parentNode.insertChild(i ++, child);
					}
				}
			} else {
				parentNode = midTree.root;
			}
			if (rightTree.children.length === 1 && operationNode.parent === rightTree) {
				console.log(rightTree.parent);
				operationNode.parent.removeChild(operationNode);
				rightTree.parent.insertChild(rightTree.parent.children.indexOf(rightTree) + 1, operationNode);
				rightTree.parent.removeChild(rightTree);
			}

			if (secondParent !== null) {
				parent.parent.insertChild(parent.parent.children.indexOf(parent) + 1, parentNode);
				parent.parent.removeChild(parent);
			}
			// console.log(parentNode.root);
			return [parentNode.root, operationNode];

			// while (parent.parent !== null) {
			// 	parent = parent.parent;
			// 	if (MathsTree.operations[parentNode.operation].precedence <= MathsTree.operations[parent.operation].precedence) {

			// 	}
			// }
		} else {
			midTree.addChild(this, operationNode);
			return [midTree, operationNode];
		}
	}
	removeOperation () {
		if (!this.isOperation && this.parent !== null) {
			const parent = this.parent;
			parent.operation = this.parent.children.every(node => node.operation === null) ? null : "value";
			parent.data = this.parent.operation === null ? null : parseInt(this.parent.children.filter(node => node.operation !== null).map(node => `${node.data}`).reduce((a, b) => a + b));
			parent.removeAllChildren();
			return parent;
		}
		return null;
	}
}

MathsTree.operations = {
	"+": {
		associative: true,
		associates: "left",
		name: "plus",
		evaluate (symbols) {
			const sum = {};
			for (const symbol in symbols) {
				sum[symbol] = symbols[symbol].reduce((a, b) => a + b);
			}
			return sum;
		}
	},
	"*": {
		associative: true,
		associates: "left",
		name: "multiply",
		evaluate (symbols) {
			let product = 1;
			let combined = [];
			for (const symbol in symbols) {
				if (symbol !== "1") {
					combined.push(symbol.repeat(symbols[symbol].length));
				}
				product *= symbols[symbol].reduce((a, b) => a * b);
			}
			if (combined.length === 0) {
				combined.push("1");
			}
			combined = combined.sort().join("");
			return {
				[combined]: product
			};
		}
	},
	"^": {
		associative: false,
		name: "power",
		evaluate (symbols) {
			const powers = {};
			for (const symbol in symbols) {
				if (symbol === "1") {
					powers[symbol] = symbols[symbol].reduce((a, b) => Math.pow(a, b));
				} else {
					powers[symbol.repeat(symbols[symbol].reduce((a, b) => a + b))] = 1;
				}
			}
			return powers;
		}
	}
};
let precedence = 0;
for (const operations of [
	["^"],
	["*"],
	["+"]
].reverse()) {
	operations.forEach(operation => MathsTree.operations[operation].precedence = precedence);
	++ precedence;
}

class MathsTreeDOMRepresentation {
	constructor (mathsTree, onModification) {
		this.mathsTree = new MathsTree(mathsTree, true);
		this.elements = new Map();
		const createElementForNode = node => {
			const element = Ω(`div.node`);
			this.elements.set(node, element);
			if (!node.isOperation) {
				element.addClass("value");
				const input = Ω(`input[type="text"]`);
				if (node.data !== null) {
					input.value = node.data;
				}
				input.onBlur(() => {
					let blurNode = node;
					while (blurNode !== null) {
						const element = this.elementForNode(blurNode);
						if (element !== null) {
							this.elementForNode(blurNode).removeClass("focused");
						}
						blurNode = blurNode.parent;
					}
				}).listenFor("focus", () => {
					let focusNode = node;
					while (focusNode !== null) {
						const element = this.elementForNode(focusNode);
						if (element !== null) {
							this.elementForNode(focusNode).addClass("focused");
						}
						focusNode = focusNode.parent;
					}
				}).onInput(value => {
					if (value.trim().length === 0) {
						node.unresolve();
					} else {
						let string = "";
						const selection = input.selection;
						let forkOperation = null;
						for (const character of value) {
							if (MathsTree.operations.hasOwnProperty(character)) {
								forkOperation = () => {
									const postResult = node.postOperation(character);
									this.mathsTree = postResult[0];
									const newNode = postResult[1];
									const previousSiblingElement = this.elementForNode(newNode.previousSibling);
									if (previousSiblingElement !== null) {
										previousSiblingElement.follow(createElementForNode(newNode)).follow(Ω(`div.operation.${MathsTree.operations[character].name}`));
									} else {
										const parentElement = this.elementForNode(newNode.parent);
										if (parentElement !== null) {
											this.elementForNode(newNode.parent).follow(createElementForNode(newNode)).remove();
										} else {
											doc.querySelector(`body .editor`).clear();
											const representation = new MathsTreeDOMRepresentation(this.mathsTree, () => {
												updateLaTeX(representation.mathsTree);
											});
											doc.querySelector(`body .editor`).append(representation.root);
											for (const newInput of representation.root.querySelectorAll(`.value input[type="text"]`)) {
												if (newInput.value === "") {
													newInput.focus();
													break;
												}
											}
											return;
										}
									}
									this.elementForNode(newNode).querySelector(`input[type="text"]`).withValue(value.slice(string.length + 1)).trigger("input").focus().withCursorAtBeginning();
								}
								break;
							} else if (/[a-zA-Z0-9]/.test(character)) {
								string += character;
							}
						}
						const numberValue = parseInt(string);
						if (/^[0-9]+$/.test(string) && !isNaN(numberValue)) {
							node.resolveToValue(numberValue);
						} else if (/^[0-9]*[a-zA-Z]+$/.test(string)) {
							node.resolveToSymbol(string);
						} else {
							node.unresolve();
						}
						input.value = string;
						input.withSelection(selection.start, selection.end);
						if (forkOperation !== null) {
							forkOperation();
						}
					}
					let evaluateNode = node;
					while (evaluateNode !== null) {
						if (evaluateNode.isOperation) {
							const element = this.elementForNode(evaluateNode);
							if (element !== null) {
								element.querySelector(".evaluation").clear().append(MathsTreeDOMRepresentation.evaluatedElement(evaluateNode));
							}
						}
						evaluateNode = evaluateNode.parent;
					}
					onModification();
				}).listenFor("keydown", event => {
					const selection = input.selection;
					const removeOperation = () => {
						const parent = node.parent;
						let cursorPosition = 0;
						for (let child of parent.children) {
							if (child === node) {
								cursorPosition += selection.start;
								break;
							}
							if (child.operation === "value") {
								cursorPosition += `${child.data}`.length;
							}
						}
						const newNode = node.removeOperation();
						if (newNode !== null) {
							const parentElement = this.elementForNode(parent);
							const newElement = createElementForNode(newNode);
							parentElement.follow(newElement).remove();
							this.elements.delete(parentElement);
							newElement.querySelector(`input[type="text"]`).focus().withCursorAt(cursorPosition);
							onModification();
						}
					};
					switch (event.keyCode) {
						case 8: // Backspace
							if (selection.collapsed) {
								if (selection.start === 0) {
									event.preventDefault();
									const previousSibling = node.previousSibling
									if (previousSibling !== null && !previousSibling.isOperation) {
										removeOperation();
									}
								}
							}
							break;
						case 37: // Left
							if (selection.collapsed) {
								if (selection.start === 0) {
									event.preventDefault();
									const previousCousin = node.previousCousin;
									if (previousCousin !== null) {
										this.elementForNode(previousCousin).querySelector(`input[type="text"]`).focus().withCursorAtEnd();
									}
								}
							}
							break;
						case 39: // Right
							if (selection.collapsed) {
								if (selection.start === input.value.length) {
									event.preventDefault();
									const nextCousin = node.nextCousin;
									if (nextCousin !== null) {
										this.elementForNode(nextCousin).querySelector(`input[type="text"]`).focus().withCursorAtBeginning();
									}
								}
							}
							break;
						case 46: // Delete
							if (selection.collapsed) {
								if (selection.start === input.value.length) {
									event.preventDefault();
									const nextSibling = node.nextSibling
									if (nextSibling !== null && !nextSibling.isOperation) {
										removeOperation();
									}
								}
							}
							break;
					}
				});
				element.append(input);
			} else {
				element.addClass(MathsTree.operations[node.operation].name);
				element.append(Ω(`div.evaluation`).append(MathsTreeDOMRepresentation.evaluatedElement(node)));
			}
			for (let i = 0; i < node.children.length; ++ i) {
				const child = node.children[i];
				const childElement = createElementForNode(child);
				element.append(childElement);
				if (i < node.children.length - 1) {
					element.append(Ω(`div.operation.${MathsTree.operations[node.operation].name}`));
				}
			}
			return element;
		};
		this.root = createElementForNode(this.mathsTree);
	}
	elementForNode (node) {
		if (this.elements.has(node)) {
			return this.elements.get(node);
		}
		return null;
	}
};
MathsTreeDOMRepresentation.evaluatedElement = mathsTree => {
	const evaluation = mathsTree.evaluate();
	if (evaluation === null) {
		return ß("");
	} else {
		let symbols = [];
		const element = Ω(`span`);
		let i = 0;
		for (const symbol in evaluation) {
			if (evaluation[symbol] !== 1 || symbol === "1") {
				element.addText(evaluation[symbol]);
			}
			if (symbol !== "1") {
				for (const match of symbol.match(/([a-zA-Z])(\1)*/g)) {
					element.addText(match[0]);
					if (match.length > 1) {
						element.append(Ω(`sup`).withText(match.length));
					}
				}
			}
			if (++ i < Object.keys(evaluation).length) {
				element.addText(" + ");
			}
		}
		if (evaluation.length === 0) {
			element.addText("0");
		}
		return element;
	}
}

function mathsTreeLaTeXRepresentation (node) {
	let output = "";
	let operationCommand;
	if (node.operation === null) {
		output += "\\_";
	} else if (node.operation === "value") {
		output += `{${node.data}}`;
	} else if (node.operation === "symbol") {
		let formattedSymbols = node.data.replace(/([a-zA-Z])\1+/g, match => {
			return `${match[0] !== "1" ? match[0] : ""}^{${match.length}}`;
		});
		if (/^1[a-zA-Z]/.test(formattedSymbols)) {
			formattedSymbols = formattedSymbols.slice(1);
		}
		output += `{${formattedSymbols}}`;
	} else if (node.operation === "+") {
		operationCommand = "+";
	} else if (node.operation === "*") {
		operationCommand = "\\times";
	} else if (node.operation === "^") {
		operationCommand = "^";
	}
	let i = 0;
	for (const child of node.children) {
		output += mathsTreeLaTeXRepresentation(child);
		if (++ i < node.children.length) {
			output += operationCommand;
		}
	}
	return output;
}
const MathsTreeLaTeXRepresentation = {};
MathsTreeLaTeXRepresentation.evaluatedString = mathsTree => {
	const evaluation = mathsTree.evaluate();
	if (evaluation === null) {
		return "";
	} else {
		let symbols = [];
		let string = "";
		let i = 0;
		for (const symbol in evaluation) {
			if (evaluation[symbol] !== 1 || symbol === "1") {
				string += evaluation[symbol];
			}
			if (symbol !== "1") {
				for (const match of symbol.match(/([a-zA-Z])(\1)*/g)) {
					string += match[0];
					if (match.length > 1) {
						string += `^${match.length}`;
					}
				}
			}
			if (++ i < Object.keys(evaluation).length) {
				string += " + ";
			}
		}
		if (evaluation.length === 0) {
			string += "0";
		}
		return string;
	}
};