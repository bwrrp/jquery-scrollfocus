(function($) {

	function Point(left, top, offsetParent) {
		if (!arguments.length)
			return;

		this.left = left;
		this.top  = top;

		this.offsetParent = offsetParent;
	}

	Point.prototype.absolute = function() {
		if (!this.offsetParent)
			return this;

		var origin = this.offsetParent.absolute();

		return new Point(
			origin.left + this.left,
			origin.top  + this.top,
			null);
	};

	Point.prototype.relativeTo = function(point) {
		var newOrigin = point ? point.absolute() : {left: 0, top: 0},
			self = this.absolute();
		return new Point(
			self.left - newOrigin.left,
			self.top  - newOrigin.top,
			point);
	};

	Point.prototype.toString = function() {
		var repr = '<' + this.left + ',' + this.top + '>';
		if (this.offsetParent) {
			repr += ' (absolute ' + this.absolute().toString() + ', origin ' + this.offsetParent.toString() + ')';
		}
		return repr;
	};

	function Box(left, top, width, height, parentBox) {
		if (!arguments.length)
			return;

		this.origin = new Point(left, top, parentBox && parentBox.origin);

		this.width  = width;
		this.height = height;

		this.parentBox = parentBox;
	}

	Box.prototype.topLeft = function() {
		return this.origin;
	};

	Box.prototype.bottomRight = function() {
		return new Point(this.width, this.height, this.origin);
	};

	Box.prototype.relativeTo = function(box) {
		var newOrigin = this.origin.relativeTo(box && box.origin);
		return new Box(newOrigin.left, newOrigin.top, this.width, this.height, box);
	};

	Box.prototype.toString = function() {
		var repr = 'BOX (' + this.origin.toString() + ' ' + this.width + 'x' + this.height + ')';
		if (!this.parentBox) {
			return repr + ' IN VIEWPORT';
		}

		return repr + ' IN [' + this.parentBox.toString() + ']';
	};

	function ScrollBox(element) {
		Box.call(this, 0, 0, 0, 0, new OffsetBox(element));

		this.element = element;
		this.refresh();
	}
	ScrollBox.prototype = new Box();
	ScrollBox.prototype.constructor = ScrollBox;

	ScrollBox.prototype.refresh = function() {
		this.origin.left = -this.element.scrollLeft;
		this.origin.top  = -this.element.scrollTop;
		this.width  = this.element.scrollWidth;
		this.height = this.element.scrollHeight;
	};

	ScrollBox.prototype.scrollTo = function(left, top) {
		console.log('scrolling', this.element, 'from', -this.origin.left, -this.origin.top, 'to', left, top);
		this.element.scrollTop = top;
		this.element.scrollLeft = left;
		this.refresh();
	};

	function OffsetBox(element) {
		var offsetParentBox = element.offsetParent && element.offsetParent !== element.ownerDocument.body ?
			new ScrollBox(element.offsetParent) :
			new WindowBox(element.ownerDocument);

		Box.call(this,
			element.offsetLeft,
			element.offsetTop,
			element.offsetWidth,
			element.offsetHeight,
			offsetParentBox);

		this.element = element;
	}
	OffsetBox.prototype = new Box();
	OffsetBox.prototype.constructor = OffsetBox;

	function WindowBox(document) {
		Box.call(this, 0, 0, 0, 0, null);

		this.document = document;
		this.refresh();
	}
	WindowBox.prototype = new Box();
	WindowBox.prototype.constructor = WindowBox;

	WindowBox.prototype.refresh = function() {
		var window = this.document.defaultView,
			documentElement = this.document.documentElement;
		this.origin.left = -window.pageXOffset;
		this.origin.top  = -window.pageYOffset;
		this.width  = documentElement.offsetWidth;
		this.height = documentElement.offsetHeight;
	};

	WindowBox.prototype.scrollTo = function(left, top) {
		var window = this.document.defaultView;
		console.log('scrolling', window, 'from', -this.origin.left, -this.origin.top, 'to', left, top);
		window.scrollTo(left, top);
		this.refresh();
	};

	function isInvalidRect(bounds) {
		return bounds.left === 0 && bounds.top === 0 && bounds.right === 0 && bounds.bottom === 0;
	}

	function isTextNode(node) {
		return node.nodeType === 3 || node.nodeType === 4;
	}

	function isElement(node) {
		return node.nodeType === 1;
	}

	function getRangeBounds(range) {
		var bounds = range.getBoundingClientRect();
		if (!isInvalidRect(bounds))
			return bounds;

		var extendedRange = range.cloneRange();

		// Try going left once
		if (isTextNode(extendedRange.endContainer) && extendedRange.endOffset === extendedRange.endContainer.length && extendedRange.endContainer.length) {
			extendedRange.setEnd(extendedRange.endContainer, extendedRange.endOffset - 1);
			bounds = extendedRange.getBoundingClientRect();
		}

		// Go right until the rect is valid
		while (isInvalidRect(bounds)) {
			if (isTextNode(extendedRange.endContainer) && extendedRange.endOffset < extendedRange.endContainer.length) {
				extendedRange.setEnd(extendedRange.endContainer, extendedRange.endOffset + 1);
			} else if (isElement(extendedRange.endContainer) && extendedRange.endOffset < extendedRange.endContainer.childNodes.length) {
				extendedRange.setEnd(extendedRange.endContainer.childNodes[extendedRange.endOffset], 0);
			} else {
				extendedRange.setEndAfter(extendedRange.endContainer);
			}
			bounds = extendedRange.getBoundingClientRect();
		}

		extendedRange.detach();

		return bounds;
	}

	function getRangeBox(range) {
		var bounds = getRangeBounds(range),
			container = range.commonAncestorContainer;
		if (isInvalidRect(bounds)) {
			// Probably a collapsed range, use the startContainer instead
			var extendedRange = range.cloneRange();
			while (isInvalidRect(bounds)) {
				extendRight(extendedRange);
				bounds = extendedRange.getBoundingClientRect();
			}
			extendedRange.detach();
		}
		console.log(bounds);
		if (container.nodeType !== 1)
			container = container.parentNode;
		return new Box(
				bounds.left,
				bounds.top,
				bounds.right - bounds.left,
				bounds.bottom - bounds.top,
				null)
			.relativeTo(new ScrollBox(container));
	}

	function getOffsetFromBox(point, box) {
		var offset = point.relativeTo(box.origin);
		if (offset.left >= 0 && offset.left < box.width)
			offset.left = 0;
		if (offset.top >= 0 && offset.top < box.height)
			offset.top = 0;
		if (offset.left >= box.width)
			offset.left -= box.width;
		if (offset.top >= box.height)
			offset.top -= box.height;

		return offset;
	}

	function isRange(obj) {
		return !!obj.startContainer;
	}

	var defaultOptions = {
		point: 'left top'
	};

	$.fn.scrollFocus = function(options) {
		$(this).each(function() {
			var target = options.target;
			if (isRange(options) || isElement(options)) {
				target = options;
				options = {};
			}
			options = $.extend({}, defaultOptions, options);

			var targetBox = isRange(target) ? getRangeBox(target) : new OffsetBox(target),
				scrollable = isElement(this) ? new ScrollBox(this) : new WindowBox(this.document),
				viewportBox = scrollable.parentBox;

			// Determine viewport box
			if (options.viewport) {
				var padding = options.viewport.padding || 0,
					width = options.viewport.width || (viewportBox ? viewportBox.width : scrollable.width),
					height = options.viewport.height || (viewportBox ? viewportBox.height : scrollable.height);
				viewportBox = new Box(
					(options.viewport.left + padding) || 0,
					(options.viewport.top  + padding) || 0,
					width - 2 * padding,
					height - 2 * padding,
					viewportBox);
			}

			// Determine target point
			var origin = targetBox.origin,
				targetPoint = new Point(0, 0, origin);
			if (typeof options.point === 'string') {
				var parts = options.point.split(/\s+/);
				while (parts.length) {
					var part = parts.pop();
					switch (part.toLowerCase()) {
						case 'left':
							targetPoint.left = 0;
							break;
						case 'top':
							targetPoint.top = 0;
							break;
						case 'right':
							targetPoint.left = targetBox.width;
							break;
						case 'bottom':
							targetPoint.top = targetBox.height;
							break;
						case 'center':
							targetPoint.left = targetBox.width / 2;
							break;
						case 'middle':
							targetPoint.top = targetBox.height / 2;
							break;
					}
				}
			}

			console.log('scrolling', targetPoint.toString(), 'into', viewportBox.toString());

			// Get offset
			var offset = getOffsetFromBox(targetPoint, viewportBox);

			console.log('offset', offset.toString());

			// Scroll element
			scrollable.scrollTo(
				-scrollable.origin.left + offset.left,
				-scrollable.origin.top  + offset.top);
		});
	};

})(jQuery);