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
			top: -element.scrollTop,
			bottom: -element.scrollTop + element.scrollHeight,
			left: -element.scrollLeft,
			right: -element.scrollLeft + element.scrollWidth
		}, new OffsetBox(element));

		this.element = element;
	}
	ScrollBox.prototype = new Box();
	ScrollBox.prototype.constructor = ScrollBox;

	ScrollBox.prototype.scrollTo = function(left, top) {
		console.log('scrolling', this.element, 'from', this.left, this.top, 'to', left, top);
		this.element.scrollTop = top;
		this.top = -this.element.scrollTop;
		this.element.scrollLeft = left;
		this.left = -this.element.scrollLeft;
	};

	function OffsetBox(element) {
		var offsetParentBox = element.offsetParent ? new ScrollBox(element.offsetParent) : null;

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

	function getRangeBox(range) {
		var bounds = range.getBoundingClientRect(),
			container = range.commonAncestorContainer;
		if (container.nodeType !== 1)
			container = container.parentNode;
		return new Box(bounds, null).relativeTo(new ScrollBox(container));
	}

	function scrollerize(target, box, until) {
		if (box.parentBox) {
			if (box.parentBox.scrollTo) {
				var relativeTarget = target.relativeTo(box.parentBox);
				box.parentBox.scrollTo(relativeTarget.left, relativeTarget.top);

				if (box.parentBox.element === until || $.contains(box.parentBox.element, until))
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