jquery.scrollFocus
==================

Powerful programmable scrolling - scroll elements, DOM ranges or arbitrary points into configurable viewports.

Release notes
-------------

**1.0.0** Initial release


How to use
----------

*Short form*: 

	$(selector).scrollFocus(target);

Assuming `selector` matches a scrollable element, scrolls that element to bring target's top left corner within the element's bounds (or as close as possible).

*Long form*:

	$(selector).scrollFocus({
		target: target,
		viewport: {
			top    : ...,
			left   : ...,
			width  : ...,
			height : ...,
			padding: ...
		},
		point: 'left top',
		toPoint: 'left top'
	});

Allows configuring custom viewports (all values default to the scrollable element, except padding which defaults to `0`), target points (use `point` for target and `toPoint` for viewport, both are optional) (use any combination of `left` / `center` / `right` and `top` / `middle` / `bottom`.

Target can be either an element or a range (such as the current selection - `document.getSelection().getRangeAt(0)`).
