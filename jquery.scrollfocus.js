(function($, undefined) {

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
			extendedRange.setStart(extendedRange.endContainer, extendedRange.endOffset - 1);
			bounds = extendedRange.getBoundingClientRect();
		}

		// Go right until the rect is valid
		while (isInvalidRect(bounds)) {
			if (isTextNode(extendedRange.endContainer) && extendedRange.endOffset < extendedRange.endContainer.length) {
				extendedRange.setEnd(extendedRange.endContainer, extendedRange.endOffset + 1);
			} else if (isElement(extendedRange.endContainer) && extendedRange.endOffset < extendedRange.endContainer.childNodes.length) {
				var nextChild = extendedRange.endContainer.childNodes[extendedRange.endOffset];
				// Only enter text nodes or child elements
				if (isTextNode(nextChild) || isElement(nextChild)) {
					extendedRange.setEnd(nextChild, 0);
				} else {
					extendedRange.setEnd(extendedRange.endContainer, extendedRange.endOffset + 1);
				}
			} else if (isTextNode(extendedRange.endContainer)) {
				extendedRange.setEndAfter(extendedRange.endContainer);
			} else {
				// Just select the entire parent
				extendedRange.selectNode(extendedRange.endContainer);
			}
			bounds = extendedRange.getBoundingClientRect();
		}

		extendedRange.detach();

		return bounds;
	}

	function isRange(obj) {
		return !!obj.startContainer;
	}

	var defaultOptions = {
		point: 'left top'
	};

	function completeBox(box, element) {
		if (box.width === undefined) {
			if (box.right === undefined) {
				box.width = element.width();
			} else {
				box.width = box.right - box.left;
			}
		}
		if (box.right === undefined) {
			box.right = box.left + box.width;
		}

		if (box.height === undefined) {
			if (box.bottom === undefined) {
				box.height = element.height();
			} else {
				box.height = box.bottom - box.top;
			}
		}
		if (box.bottom === undefined) {
			box.bottom = box.top + box.height;
		}
	}

	function insetBox(box, padding) {
		if (!padding)
			return;

		box.top += padding;
		box.left += padding;
		box.bottom -= padding;
		box.right -= padding;
		box.width -= 2 * padding;
		box.height -= 2 * padding;
	}

	function reduceBox(box, pointSpec) {
		if (!pointSpec)
			return;

		var pointParts = pointSpec.split(/\s+/);
		for (var i = pointParts.length - 1; i >= 0; --i) {
			switch (pointParts[i].toLowerCase()) {
				case 'left':
					box.right = box.left;
					box.width = 0;
					break;

				case 'right':
					box.left = box.right;
					box.width = 0;
					break;

				case 'top':
					box.bottom = box.top;
					box.height = 0;
					break;

				case 'bottom':
					box.top = box.bottom;
					box.height = 0;
					break;
			}
		}
	}

	function computeScrollOffset(targetBox, viewportBox) {
		// Determine minimal offset from viewport to target
		var deltaX = targetBox.left < viewportBox.left ?
				targetBox.right - viewportBox.left :
				targetBox.left - viewportBox.right,
			deltaY = targetBox.top < viewportBox.top ?
				targetBox.bottom - viewportBox.top :
				targetBox.top - viewportBox.bottom;

		return {
			left: targetBox.left < viewportBox.left ?
				Math.min(deltaX, 0) :
				Math.max(deltaX, 0),
			top: targetBox.top < viewportBox.top ?
				Math.min(deltaY, 0) :
				Math.max(deltaY, 0)
		};
	}

	$.fn.scrollFocus = function(options) {
		var target = options && options.target;
		if (!target) {
			target = options;
			options = {};
		}

		if (!target || (target.jquery && !target.length))
			return;

		// Apply defaults
		options = $.extend({}, defaultOptions, options);

		// Scroll elements
		$(this.get().reverse()).each(function() {
			var scrollable = $(this),
				document = this.ownerDocument || this,
				window = $.isWindow(this) ? this : document.defaultView,
				pageXOffset = window.pageXOffset,
				pageYOffset = window.pageYOffset;

			// Determine target relative to document
			var targetBox;
			if (isRange(target)) {
				var viewportRelativeBounds = getRangeBounds(target);
				targetBox = {
					left:   viewportRelativeBounds.left   + pageXOffset,
					right:  viewportRelativeBounds.right  + pageXOffset,
					top:    viewportRelativeBounds.top    + pageYOffset,
					bottom: viewportRelativeBounds.bottom + pageYOffset
				};
			} else {
				if (!target.jquery)
					target = $(target);
				targetBox = target.offset();
			}
			completeBox(targetBox, target);

			// Determine viewport box (scrollable dimensions)
			var viewportBox = options.viewport;
			if (viewportBox) {
				completeBox(viewportBox, $(window));
				// Make viewport relative to document
				viewportBox.left += pageXOffset;
				viewportBox.right += pageXOffset;
				viewportBox.top += pageYOffset;
				viewportBox.bottom += pageYOffset;
			} else {
				// Default to full context object area
				if ($.isWindow(this)) {
					viewportBox = {
						left: window.pageXOffset,
						top: window.pageYOffset
					};
				} else {
					viewportBox = scrollable.offset();
				}
			}
			completeBox(viewportBox, scrollable);

			// Apply options
			insetBox(viewportBox, options.padding);
			reduceBox(targetBox, options.point);
			reduceBox(viewportBox, options.toPoint);

			// Determine amount to scroll
			var scrollOffset = computeScrollOffset(targetBox, viewportBox, options);
			console.log('scrolling', targetBox, 'into', viewportBox, 'by', scrollOffset);
			scrollable.scrollLeft(scrollable.scrollLeft() + scrollOffset.left);
			scrollable.scrollTop(scrollable.scrollTop() + scrollOffset.top);
		});
	};

	// Expose getRangeBounds
	$.fn.scrollFocus.getRangeBounds = getRangeBounds;

})(jQuery);