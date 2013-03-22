(function($) {

	function Box(bounds, parentBox) {
		if (!arguments.length)
			return;

		this.top = bounds.top;
		this.bottom = bounds.bottom;
		this.left = bounds.left;
		this.right = bounds.right;

		this.parentBox = parentBox;
	}

	Box.prototype.absolute = function() {
		if (!this.parentBox)
			return this;

		var origin = this.parentBox.absolute();

		return new Box({
			top   : origin.top  + this.top,
			bottom: origin.top  + this.bottom,
			left  : origin.left + this.left,
			right : origin.left + this.right
		}, null);
	};

	Box.prototype.relativeTo = function(box) {
		var newOrigin = box ? box.absolute() : {top: 0, left: 0},
			self = this.absolute();
		return new Box({
			top   : self.top    - newOrigin.top,
			bottom: self.bottom - newOrigin.top,
			left  : self.left   - newOrigin.left,
			right : self.right  - newOrigin.left
		}, box);
	};

	Box.prototype.toString = function() {
		var repr = 'BOX (' + this.top + ' ' + this.right + ' ' + this.bottom + ' ' + this.left + ')';
		if (!this.parentBox) {
			return repr + ' IN VIEWPORT';
		}

		return repr + '(ABSOLUTE: ' + this.absolute().toString() + ') IN [' + this.parentBox.toString() + ']';
	};

	function ScrollBox(element) {
		Box.call(this, {
			top: 0,
			bottom: 0,
			left: 0,
			right: 0
		}, new OffsetBox(element));

		this.element = element;
		this.refresh();
	}
	ScrollBox.prototype = new Box();
	ScrollBox.prototype.constructor = ScrollBox;

	ScrollBox.prototype.refresh = function() {
		this.top = -this.element.scrollTop;
		this.bottom = -this.element.scrollTop + this.element.scrollHeight;
		this.left = -this.element.scrollLeft;
		this.right = -this.element.scrollLeft + this.element.scrollWidth;
	};

	ScrollBox.prototype.scrollTo = function(left, top) {
		console.log('scrolling', this.element, 'from', -this.left, -this.top, 'to', left, top);
		this.element.scrollTop = top;
		this.element.scrollLeft = left;
		this.refresh();
	};

	function OffsetBox(element) {
		var offsetParentBox = element.offsetParent && element.offsetParent !== element.ownerDocument.body ?
			new ScrollBox(element.offsetParent) :
			new WindowBox(element.ownerDocument);

		Box.call(this, {
			top: element.offsetTop,
			bottom: element.offsetTop + element.offsetHeight,
			left: element.offsetLeft,
			right: element.offsetLeft + element.offsetWidth
		}, offsetParentBox);

		this.element = element;
	}
	OffsetBox.prototype = new Box();
	OffsetBox.prototype.constructor = OffsetBox;

	function WindowBox(document) {
		Box.call(this, {
			top: 0,
			bottom: 0,
			left: 0,
			right: 0
		});

		this.document = document;
		this.refresh();
	}
	WindowBox.prototype = new Box();
	WindowBox.prototype.constructor = WindowBox;

	WindowBox.prototype.refresh = function() {
		var window = this.document.defaultView,
			documentElement = this.document.documentElement;
		this.top = -window.pageYOffset;
		this.bottom = -window.pageYOffset + documentElement.offsetHeight;
		this.left = -window.pageXOffset;
		this.right = -window.pageXOffset + documentElement.offsetWidth;
	};

	WindowBox.prototype.scrollTo = function(left, top) {
		var window = this.document.defaultView;
		console.log('scrolling', window, 'from', -this.left, -this.top, 'to', left, top);
		window.scrollTo(left, top);
		this.refresh();
	};

	function getRangeBox(range) {
		var bounds = range.getBoundingClientRect(),
			container = range.commonAncestorContainer;
		if (container.nodeType !== 1)
			container = container.parentNode;
		return new Box(bounds, null).relativeTo(new ScrollBox(container));
	}

	function scrollerize(target, box, until) {
		if (box) {
			if (box.scrollTo) {
				var relativeTarget = target.relativeTo(box);
				box.scrollTo(relativeTarget.left, relativeTarget.top);

				if (box.element && (box.element === until || $.contains(box.element, until)))
					return;
			}
			scrollerize(target, box.parentBox, until);
		}
	}

	$.fn.scrollFocus = function(target) {
		$(this).each(function() {
			var box = target.startContainer ? getRangeBox(target) : new OffsetBox(target);
			console.log(box.toString());
			scrollerize(box, box, this);
		});
	};

})(jQuery);