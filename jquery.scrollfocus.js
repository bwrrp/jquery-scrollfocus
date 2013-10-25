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
		box.top += padding;
		box.left += padding;
		box.bottom -= padding;
		box.right -= padding;
		box.width -= 2 * padding;
		box.height -= 2 * padding;
	}

	function computeScrollOffset(targetBox, viewportBox, options) {
		// TODO: determine amount to scroll based on options
		return {
			left: targetBox.left - viewportBox.left,
			top: targetBox.top - viewportBox.top
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

			// Apply padding
			if (options.padding) {
				insetBox(viewportBox, options.padding);
			}

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