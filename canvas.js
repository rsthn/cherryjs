/*
**	@rsthn/cherry/canvas
**
**	Copyright (c) 2016-2020, RedStar Technologies, All rights reserved.
**	https://www.rsthn.com/
**
**	THIS LIBRARY IS PROVIDED BY REDSTAR TECHNOLOGIES "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES,
**	INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A 
**	PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL REDSTAR TECHNOLOGIES BE LIABLE FOR ANY
**	DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT 
**	NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; 
**	OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, 
**	STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE
**	USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/

const Rin = require('@rsthn/rin/alpha');
const Matrix = require('./Matrix');

/**
**	Constructs a canvas object. If the Canvas DOM element is not provided a new element will be created and attached to the page.
**
**	>> Canvas __constructor (CanvasElement elem = null[, Object opts = null]);
*/
const Canvas = module.exports = function (elem, opts)
{
	// Create canvas element if required.
	if (elem == null)
	{
		this.ui = globalThis.document ? globalThis.document.createElement ("canvas") : Rin.clone(Canvas.passThruCanvas);

		if (globalThis.document && opts && opts.hidden != true)
			globalThis.document.body.appendChild (this.ui);
	}
	else
	{
		this.ui = elem;
	}

	if (!this.ui.getContext) return;

	this.context = this.ui.getContext ("2d");

	this.antialias = opts && opts.antialias === false ? false : true;
	this.setBackground (opts && opts.background != null ? opts.background : "#000");

	// State stack support.
	this.matrixStack = [];
	this.alphaStack = [];
	this.matr = new Matrix ();

	// Default alpha value.
	this._alpha = 1.0;
	this._globalScale = 1.0;

	// Set initial transformation matrix.
	this.matr.identity();
	this.transform();

	this.strokeStyle("#fff");
	this.fillStyle("#fff");

	this.width = this.ui.width;
	this.height = this.ui.height;
	this.applyConfig();
};

Canvas.passThruCanvas = 
{
	parentNode: null,

	imageSmoothingEnabled: true,

	style: {
	},

	width: 950,
	height: 540,

	getContext: function (renderingContext) {
		return this;
	},

	save: function() {
	},

	restore: function() {
	},

	scale: function (sx, sy) {
	},

	rotate: function (angle) {
	},

	translate: function (x, y) {
	},

	setTransform: function (a, b, c, d, e, f) {
	},

	transform: function (a, b, c, d, e, f) {
	},

	toDataURL: function (mime, params) {
		return '';
	},

	beginPath: function () {
	},

	moveTo: function (x, y) {
	},

	closePath: function() {
	},

	lineTo: function() {
	},

	rect: function(x, y, w, h) {
	},

	fill: function() {
	},

	stroke: function() {
	},

	fillRect: function(x, y, w, h) {
	},

	strokeRect: function(x, y, w, h) {
	},

	clip: function() {
	},

	quadraticCurveTo: function (cpx, cpy, x, y) {
	},

	bezierCurveTo: function (cx1, cy1, cx2, cy2, x, y) {
	},

	arc: function (x, y, r, sA, eA, cw) {
	},

	arcTo: function (x1, y1, x2, y2, r) {
	},

	fillText: function (text, x, y, maxWidth) {
	},

	strokeText: function (text, x, y, maxWidth) {
	},

	measureText: function (text) {
		return { width: 0 };
	},

	createImageData: function (w, h) {
		return { width: w, height: h };
	},

	getImageData: function (x, y, w, h) {
		return { width: w, height: h, data: [] };
	},

	putImageData: function (data, x, y) {
	},

	drawImage: function (...args) {
	},

	getBoundingClientRect: function () {
		return { left: 0, top: 0 };
	}
};


/**
**	Applies the current config to the canvas (usually called after a reset on the canvas).
**
**	>> void applyConfig();
*/

Canvas.prototype.applyConfig = function ()
{
	if (this.antialias == false)
	{
		this.context.imageSmoothingEnabled = false;
		this.ui.style.imageRendering = "crisp-edges";
	}
};


/**
**	Disposes the resources used by the canvas. The DOMElement will also be removed.
**
**	>> void dispose();
*/

Canvas.prototype.dispose = function ()
{
	if (this.ui.parentNode)
		this.ui.parentNode.removeChild (this.ui);

	this.matrixStack = null;
	this.alphaStack = null;
	this.matr = null;
	this.context = null;
	this.ui = null;
};


/**
**	Sets the default background color of the canvas. Does not cause a canvas clear.
**
**	>> void setBackground (string color);
*/

Canvas.prototype.setBackground = function (color, canvasColor)
{
	this.ui.style.background = color;
	this.backgroundColor = canvasColor ? canvasColor : color;
};


/**
**	Sets the canvas size.
**
**	>> Canvas resize (float width, float height);
*/

Canvas.prototype.resize = function (width, height)
{
	this.ui.width = width;
	this.ui.height = height;

	this.width = this.ui.width;
	this.height = this.ui.height;

	this._width = ~~(this.width / this._globalScale);
	this._height = ~~(this.height / this._globalScale);

	this.applyConfig();
	return this;
};


/**
**	Sets the global canvas scale. Loads identity matrix.
**
**	>> Canvas globalScale (float value);
*/

Canvas.prototype.globalScale = function (value)
{
	this._globalScale = value;

	this._width = ~~(this.width / this._globalScale);
	this._height = ~~(this.height / this._globalScale);

	this.loadIdentity();
	this.scale(value, value);

	return this;
};


/**
**	Indicates if the canvas was flipped (i.e. xy is now yx).
**
**	>> Canvas flipped (bool value);
*/

Canvas.prototype.flipped = function (value)
{
	if (value)
	{
		this._width = ~~(this.height / this._globalScale);
		this._height = ~~(this.width / this._globalScale);
	}
	else
	{
		this._width = ~~(this.width / this._globalScale);
		this._height = ~~(this.height / this._globalScale);
	}

	return this;
};


/**
**	Saves the state of the canvas context.
**
**	>> Canvas save();
*/

Canvas.prototype.save = function ()
{
	this.context.save();
	return this;
};


/**
**	Restores the state of the canvas context.
**
**	>> Canvas restore();
*/

Canvas.prototype.restore = function ()
{
	this.context.restore();
	return this;
};


/**
**	Returns the image on the canvas as a string in DATA-URI format.
**
**	>> string toDataUrl (string name);
*/

Canvas.prototype.toDataUrl = function (mime, params)
{
	return this.ui.toDataURL (mime, params);
};


/**
**	Returns the image as a Base-64 encoded PNG string.
**
**	>> string toPng64();
*/

Canvas.prototype.toPng64 = function ()
{
	return this.ui.toDataURL ("image/png").substr(22);
};


/**
**	Sets or returns an attribute of the canvas context.
**
**	>> Canvas _contextAttribute (string name);
**	>> Canvas _contextAttribute (string name, string value);
*/

Canvas.prototype._contextAttribute = function (name, value)
{
	if (value !== undefined)
	{
		this.context[name] = value;
		return this;
	}

	return this.context[name];
};


/**
**	Sets or returns the current fill style (default black).
**
**	>> Canvas fillStyle (string value);
*/

Canvas.prototype.fillStyle = function (value)
{
	return this._contextAttribute ("fillStyle", value);
};


/**
**	Sets or returns the current stroke style (default black).
**
**	>> Canvas strokeStyle (string value);
*/

Canvas.prototype.strokeStyle = function (value)
{
	return this._contextAttribute ("strokeStyle", value);
};


/**
**	Sets or returns the current line cap style (butt, round, square. butt is default).
**
**	>> Canvas lineCap (string value);
**	>> string lineCap ();
*/

Canvas.prototype.lineCap = function (value)
{
	return this._contextAttribute ("lineCap", value);
};


/**
**	Sets or returns the current line join style (bevel, round, miter. miter is default).
**
**	>> Canvas lineJoin (string value);
**	>> string lineJoin ();
*/

Canvas.prototype.lineJoin = function (value)
{
	return this._contextAttribute ("lineJoin", value);
};


/**
**	Sets or returns the current line width value (default 1).
**
**	>> Canvas lineWidth (float value);
**	>> float lineWidth ();
*/

Canvas.prototype.lineWidth = function (value)
{
	return this._contextAttribute ("lineWidth", value);
};


/**
**	Sets or returns the current miter limit value (default 10).
**
**	>> Canvas miterLimit (float value);
**	>> float miterLimit ();
*/

Canvas.prototype.miterLimit = function (value)
{
	return this._contextAttribute ("miterLimit", value);
};


/**
**	Sets or returns the current shadow color value (default black).
**
**	>> Canvas shadowColor (string value);
**	>> string shadowColor ();
*/

Canvas.prototype.shadowColor = function (value)
{
	return this._contextAttribute ("shadowColor", value);
};


/**
**	Sets or returns the current shadow X offset (default 0).
**
**	>> Canvas shadowOffsetX (float value);
**	>> float shadowOffsetX ();
*/

Canvas.prototype.shadowOffsetX = function (value)
{
	return this._contextAttribute ("shadowOffsetX", value);
};


/**
**	Sets or returns the current shadow Y offset (default 0).
**
**	>> Canvas shadowOffsetY (float value);
**	>> float shadowOffsetY ();
*/

Canvas.prototype.shadowOffsetY = function (value)
{
	return this._contextAttribute ("shadowOffsetY", value);
};


/**
**	Sets or returns the current shadow blue value (default 0).
**
**	>> Canvas shadowBlur (string value);
**	>> string shadowBlur ();
*/

Canvas.prototype.shadowBlur = function (value)
{
	return this._contextAttribute ("shadowBlur", value);
};


/**
**	Sets or returns the current font settings.
**
**	>> Canvas font (string value);
**	>> string font ();
*/

Canvas.prototype.font = function (value)
{
	return this._contextAttribute ("font", value);
};


/**
**	Sets or returns the current text align settings (start, end, left, right, center).
**
**	>> Canvas textAlign (string value);
**	>> string textAlign ();
*/

Canvas.prototype.textAlign = function (value)
{
	return this._contextAttribute ("textAlign", value);
};


/**
**	Sets or returns the current text base line settings (alphabetic, bottom, hanging, ideographic, middle, top. Alphabetic is default).
**
**	>> Canvas textBaseline (string value);
**	>> string textBaseline ();
*/

Canvas.prototype.textBaseline = function (value)
{
	return this._contextAttribute ("textBaseline", value);
};


/**
**	Sets or returns the current global alpha value.
**
**	>> Canvas globalAlpha (float value);
**	>> float globalAlpha ();
*/

Canvas.prototype.globalAlpha = function (value)
{
	if (value !== undefined)
		this._alpha = value;
	else
		return this._alpha;

	return this.alpha(1.0);
};


/**
**	Sets the relative alpha value for subsequent drawing operations.
**
**	>> Canvas alpha (float value);
**	>> float alpha ();
*/

Canvas.prototype.alpha = function (value)
{
	this._alpha *= value;
	this.context.globalAlpha = this._alpha;
	return this;
};


/**
**	Sets or returns the current global composite operation value (source-atop, source-in, source-out, source-over, destination-atop,
**	destination-in, destination-out, destination-over, lighter, copy, xor).
**
**	>> Canvas globalCompositeOperation (string value);
**	>> string globalCompositeOperation ();
*/

Canvas.prototype.globalCompositeOperation = function (value)
{
	return this._contextAttribute ("globalCompositeOperation", value);
};


/**
**	Transforms shape of subsequent drawings based on a matrix. The provided values represent a matrix and it will be multiplied
**	with the current transformation matrix. If no parameter is provided the active matrix will be used.
**
**	>> Canvas transform (float a, float b, float c, float d, float e, float f);
*/

Canvas.prototype.transform = function (a, b, c, d, e, f)
{
	if (!arguments.length)
	{
		this.context.setTransform (this.matr.data[0], this.matr.data[3], this.matr.data[1], this.matr.data[4], this.matr.data[2], this.matr.data[5]);
		return this;
	}

	this.context.transform (a, b, c, d, e, f);
	return this;
};


/**
**	Similar to transform() but this matrix is not multiplied by the active transformation matrix, instead it just comes the current matrix.
**
**	>> Canvas setTransform (float a, float b, float c, float d, float e, float f);
*/

Canvas.prototype.setTransform = function (a, b, c, d, e, f)
{
	this.context.setTransform (a, b, c, d, e, f);
	return this;
};


/**
**	Draws a filled rectangle on the canvas.
**
**	>> Canvas fillRect (float x, float y, float w, float h);
*/

Canvas.prototype.fillRect = function (x, y, w, h)
{
	this.context.fillRect (x, y, w, h);
	return this;
};


/**
**	Draws an stroked rectangle on the canvas.
**
**	>> Canvas strokeRect (float x, float y, float w, float h);
*/

Canvas.prototype.strokeRect = function (x, y, w, h)
{
	this.context.strokeRect (x, y, w, h);
	return this;
};


/**
**	Clears a rectangle on the canvas. All pixels will be erased.
**
**	>> Canvas clearRect (float x, float y, float w, float h);
*/

Canvas.prototype.clearRect = function (x, y, w, h)
{
	this.context.clearRect (x, y, w, h);
	return this;
};


/**
**	Starts a new path. Any previous path points will be cleared.
**
**	>> Canvas beginPath();
*/

Canvas.prototype.beginPath = function ()
{
	this.context.beginPath ();
	return this;
};


/**
**	Creates a new point in the current path.
**
**	>> Canvas moveTo (float x, float y);
*/

Canvas.prototype.moveTo = function (x, y)
{
	this.context.moveTo (x, y);
	return this;
};


/**
**	Creates a new point from the first path point to the last, and finishes the path.
**
**	>> Canvas closePath();
*/

Canvas.prototype.closePath = function ()
{
	this.context.closePath ();
	return this;
};


/**
**	Draws a line from the last point on the path to the given point.
**
**	>> Canvas lineTo (float x, float y);
*/

Canvas.prototype.lineTo = function (x, y)
{
	this.context.lineTo (x, y);
	return this;
};


/**
**	Creates a hollow rectangle path on the canvas for subsequent stroke or fill.
**
**	>> Canvas rect (float x, float y, float w, float h);
*/

Canvas.prototype.rect = function (x, y, w, h)
{
	this.context.rect (x, y, w, h);
	return this;
};


/**
**	Fills the active path with the current fill style or with the one given in the value parameter.
**
**	>> Canvas fill (string value);
**	>> Canvas fill ();
*/

Canvas.prototype.fill = function (value)
{
	if (value) this.fillStyle (value);
	this.context.fill ();
	return this;
};


/**
**	Strokes the active path with the current stroke style or with the one given in the value parameter.
**
**	>> Canvas stroke (string value);
**	>> Canvas stroke ();
*/

Canvas.prototype.stroke = function (value)
{
	if (value) this.strokeStyle (value);
	this.context.stroke ();
	return this;
};


/**
**	Creates a viewport with the active path. Only the viewport will be visible.
**
**	>> Canvas clip();
*/

Canvas.prototype.clip = function ()
{
	this.context.clip ();
	return this;
};


/**
**	Adds points of a quadratic curve to the active path. A control points and one reference point must be provided.
**
**	>> Canvas quadraticCurveTo (float cpx, float cpy, float x, float y);
*/

Canvas.prototype.quadraticCurveTo = function (cpx, cpy, x, y)
{
	this.context.quadraticCurveTo (cpx, cpy, x, y);
	return this;
};


/**
**	Adds points of a bezier curve to the active path. Two control points and one reference point must be provided.
**
**	>> Canvas bezierCurveTo (float cx1, float cy1, float cx2, float cy2, float x, float y);
*/

Canvas.prototype.bezierCurveTo = function (cx1, cy1, cx2, cy2, x, y)
{
	this.context.bezierCurveTo (cx1, cy1, cx2, cy2, x, y);
	return this;
};


/**
**	Adds points of an arc the the active path. Used to draw a circle of part of it.
**
**	>> Canvas arc (float x, float y, float r, float sA, float eA, float cw);
*/

Canvas.prototype.arc = function (x, y, r, sA, eA, cw)
{
	this.context.arc (x, y, r, sA, eA, cw);
	return this;
};


/**
**	Adds points of an arc to the active path. Used to create an arc between two points.
**
**	>> Canvas arcTo (float x1, float y1, float x2, float y2, float r);
*/

Canvas.prototype.arcTo = function (x1, y1, x2, y2, r)
{
	this.context.arcTo (x1, y1, x2, y2, r);
	return this;
};


/**
**	Draws filled text on the canvas with the active font, and fillStyle properties.
**
**	>> Canvas fillText (string text, float x, float y, float maxWidth=1000)
*/

Canvas.prototype.fillText = function (text, x, y, maxWidth)
{
	this.context.fillText (text, x, y, maxWidth ? maxWidth : 1000);
	return this;
};


/**
**	Draws stroked text on the canvas with the active font, and fillStyle properties.
**
**	>> Canvas strokeText (string text, float x, float y, float maxWidth=1000);
*/

Canvas.prototype.strokeText = function (text, x, y, maxWidth)
{
	this.context.strokeText (text, x, y, maxWidth ? maxWidth : 1000);
	return this;
};


/**
**	Measures the width of the given text using active font properties.
**
**	>> float measureText (string text);
*/

Canvas.prototype.measureText = function (text)
{
	return this.context.measureText (text).width;
};


/**
**	Returns a new image data object with the specified size.
**
**	>> ImageData createImageData (float w, float h);
*/

Canvas.prototype.createImageData = function (w, h)
{
	return this.context.createImageData (w, h);
};


/**
**	Returns an image data object with the pixels of a rectangular area of the canvas.
**
**	>> ImageData getImageData (float x, float y, float w, float h);
*/

Canvas.prototype.getImageData = function (x, y, w, h)
{
	return this.context.getImageData (x, y, w, h);
};


/**
**	Puts image data on the canvas at the specified location.
**
**	>> Canvas putImageData (ImageData data, float x, float y);
*/

Canvas.prototype.putImageData = function (data, x, y)
{
	this.context.putImageData (data, x, y);
	return this;
};


/**
**	Draws an image on the canvas.
**
**	Canvas drawImage (Image img, float x, float y);
**	Canvas drawImage (Image img, float x, float y, float w, float h);
**	Canvas drawImage (Image img, float sx, float sy, float sw, float sh, float dx, float dy, float dw, float dh);
*/

Canvas.prototype.drawImage = function (...args)
{
	if (args.length == 3)
	{
		this.context.drawImage (args[0], ~~args[1], ~~args[2]);
	}
	else if (args.length == 5)
	{
		this.context.drawImage (args[0], ~~args[1], ~~args[2], ~~args[3], ~~args[4]);
	}
	else if (args.length == 9)
	{
		var a3 = ~~args[3];
		var a4 = ~~args[4];
		if (!a3 || !a4) return this;

		var a7 = ~~args[7];
		var a8 = ~~args[8];
		if (!a7 || !a8) return this;

		this.context.drawImage (args[0], ~~args[1], ~~args[2], a3, a4, ~~args[5], ~~args[6], a7, a8);
	}

	return this;
};


/**
**	Clears the entire canvas. If the backgroundColor parameter is set the canvas will be cleared manually by using
**	the fillRect method.
**
**	>> Canvas clear (string backgroundColor);
**	>> Canvas clear ();
*/

Canvas.prototype.clear = function (backgroundColor)
{
	if (backgroundColor)
	{
		this.globalCompositeOperation("source-over").globalAlpha(1.0).fillStyle(backgroundColor !== true ? backgroundColor : this.backgroundColor).fillRect(0, 0, this._width, this._height);
	}
	else
	{
		this.ui.width = this.width;
		this.applyConfig();
	}

	this.transform();
	return this;
};


/**
**	Resets the context drawing properties to their initial values.
**
**	>> Canvas reset (bool clearPath);
**	>> Canvas reset ();
*/

Canvas.prototype.reset = function (clearPath)
{
	this.fillStyle("#000000").strokeStyle("#000000").lineCap("butt").lineJoin("miter")
	.lineWidth("1").miterLimit("10").shadowColor("#000000").shadowOffsetX("0")
	.shadowOffsetY("0").shadowBlur("0").globalAlpha("1.0").globalCompositeOperation("source-over");

	if (clearPath) this.beginPath().closePath();

	return this;
};


/**
**	Pushes the current transformation matrix into the matrix stack.
**
**	>> Canvas pushMatrix();
*/

Canvas.prototype.pushMatrix = function ()
{
	this.matrixStack.push (this.matr);
	this.matr = this.matr.clone();

	return this;
};


/**
**	Pops a matrix from the matrix stack into the transformation matrix.
**
**	>> Canvas popMatrix();
*/

Canvas.prototype.popMatrix = function ()
{
	this.matr = this.matrixStack.pop ();
	return this.transform ();
};


/**
**	Pushes the current global alpha into the stack.
**
**	>> Canvas pushAlpha();
*/

Canvas.prototype.pushAlpha = function ()
{
	this.alphaStack.push (this.globalAlpha());
	return this;
};


/**
**	Pops an alpha from the stack into the global alpha.
**
**	>> Canvas popAlpha();
*/

Canvas.prototype.popAlpha = function ()
{
	this.globalAlpha(this.alphaStack.pop());
	return this;
};


/**
**	Sets the transformation matrix to identity.
**
**	>> Canvas loadIdentity();
*/

Canvas.prototype.loadIdentity = function ()
{
	this.matr.identity ();
	return this.transform ();
};


/**
**	Sets the transformation matrix to the specified one.
**
**	>> Canvas loadMatrix (Matrix matr);
*/

Canvas.prototype.loadMatrix = function (matr)
{
	this.matr.identity ().append (matr);
	return this.transform ();
};


/**
**	Appends a matrix to the current transformation matrix.
**
**	>> Canvas appendMatrix (Matrix matr);
*/

Canvas.prototype.appendMatrix = function (matr)
{
	this.matr.append (matr);
	return this.transform ();
};


/**
**	Sets scaling factors for subsequent drawing operations. If the useNative is not set then scale with the current
**	transformation matrix will be performed.
**
**	>> Canvas scale (float sx, float sy, bool useNative=false);
*/

Canvas.prototype.scale = function (sx, sy, useNative)
{
	if (useNative) {
		this.context.scale (sx, sy);
		return this;
	}

	this.matr.scale (sx, sy);
	return this.transform();
};


/**
**	Sets rotation factor for subsequent drawing operations. The angle is in radians. If useNative is not set
**	then rotation with the transformation matrix will be used.
**
**	>> Canvas rotate (float angle, bool useNative=false);
*/

Canvas.prototype.rotate = function (angle, useNative)
{
	if (useNative) {
		this.context.rotate (angle);
		return this;
	}

	this.matr.rotate (angle);
	return this.transform ();
};


/**
**	Moves starting point to an specified location. If the useNative parameter is not set then translation with
**	the transformation matrix will be done.
**
**	>> Canvas translate (float x, float y, bool useNative=false);
*/

Canvas.prototype.translate = function (x, y, useNative)
{
	if (useNative) {
		this.context.translate (x, y);
		return this;
	}

	this.matr.translate (x, y);
	return this.transform ();
};


/**
**	Creates a hollow ellipse path on the canvas for subsequent stroke or fill.
**
**	>> Canvas ellipse (float x, float y, float w, float h);
*/

Canvas.prototype.ellipse = function (x, y, w, h)
{
	var ox = (w/2)*.5522848, oy = (h/2)*.5522848;
	var xe = x+w-1, ye = y+h-1, xm = x+w/2, ym = y+h/2;

	this.beginPath ().moveTo(x, ym);
	this.bezierCurveTo (x, ym - oy, xm - ox, y, xm, y);
	this.bezierCurveTo (xm + ox, y, xe, ym - oy, xe, ym);
	this.bezierCurveTo (xe, ym + oy, xm + ox, ye, xm, ye);
	this.bezierCurveTo (xm - ox, ye, x, ym + oy, x, ym);
	this.closePath ();

	return this;
};


/**
**	Creates a hollow circle path on the canvas for subsequent stroke or fill. If the stroke param is set the circle
**	will be drawn with the specified stroke color.
**
**	>> Canvas circle (float x, float y, float r, string strokeColor);
**	>> Canvas circle (float x, float y, float r);
*/

Canvas.prototype.circle = function (x, y, r, stroke)
{
	this.beginPath();
	this.arc(x, y, r, 0, 2*Math.PI);
	this.closePath();

	if (stroke) this.stroke(stroke);

	return this;
};


/**
**	Draws a line for subsequent stroke or fill. If the stroke param is set the line will be drawn with
**	the specified stroke color.
**
**	>> Canvas line (float x1, float y1, float x2, float y2, string strokeColor);
**	>> Canvas line (float x1, float y1, float x2, float y2);
*/

Canvas.prototype.line = function (x1, y1, x2, y2, stroke)
{
	this.beginPath();
	this.moveTo(x1, y1);
	this.lineTo(x2, y2);
	this.closePath();

	if (stroke) this.stroke(stroke);
	return this;
};


/**
**	Attaches internal listeners for mouse/pointer events on the canvas object, this is called automatically when
**	attaching handlers to the canvas. The actual handlers are added or removed using the addPointerHandler and
**	removePointerHandler respectively.
**
**	>> Canvas enablePointerEvents();
*/

Canvas.prototype.enablePointerEvents = function()
{
	if (this.pointerHandler) return this;

	this.pointerScale = { sx: 1, sy: 1 };

	var _ = this;

	var _evt =
	{
		action: '',
		buttons: 0, lbuttons: 0,
		x: 0, y: 0,

		containedBy: function (x, y, w, h) {
			return this.x >= x && this.x <= (x+w-1) && this.y >= y && this.y <= (y+h-1);
		}
	};

	this.pointerHandlers = [];

	this.pointerHandler = function (code, evt)
	{
		var rect = this.ui.getBoundingClientRect();

		_evt.action = code;
		_evt.buttons = evt.buttons;
		_evt.x = ~~(evt.clientX - rect.left - 1);
		_evt.y = ~~(evt.clientY - rect.top - 1);

		_evt.x = (_evt.x - 0.5*_.pointerScale.sx) / _.pointerScale.sx;
		_evt.y = (_evt.y - 0.5*_.pointerScale.sy) / _.pointerScale.sy;

		if (_evt.x < 0) _evt.x = 0;
		if (_evt.y < 0) _evt.y = 0;

		_evt.dragging = false;

		if (_evt.buttons && !_evt.lbuttons)
		{
			_evt.sx = _evt.x;
			_evt.sy = _evt.y;

			_evt.ldx = _evt.ldy = 0;
		}

		if (_evt.buttons && _evt.lbuttons)
		{
			_evt.dragging = true;

			_evt.dx = _evt.x - _evt.sx;
			_evt.dy = _evt.y - _evt.sy;
			
			_evt.ddx = _evt.dx - _evt.ldx;
			_evt.ddy = _evt.dy - _evt.ldy;

			_evt.ldx = _evt.dx;
			_evt.ldy = _evt.dy;
		}

		_evt.lbuttons = _evt.buttons;

		for (var i = 0; i < this.pointerHandlers.length; i++)
		{
			if (this.pointerHandlers[i][1].call(this.pointerHandlers[i][2], _evt) === false)
				break;
		}
	};

	this.ui.onmousedown = function(evt) {  _.pointerHandler('DOWN', evt); };
	this.ui.onmouseup = function(evt) { _.pointerHandler('UP', evt); };
	this.ui.onmousemove = function(evt) { _.pointerHandler('MOVE', evt); };

	return this;
};


/**
**	Sets the pointer scaling factors.
**
**	>> Canvas setPointerScale (float x, float y);
*/

Canvas.prototype.setPointerScale = function (sx, sy)
{
	this.pointerScale = { sx: sx, sy: sy };
	return this;
};


/**
**	Adds a pointer event handler, returns the handler reference id for later removal.
**
**	>> string addPointerHandler (function callback, object context);
**	>> string addPointerHandler (function callback);
*/

Canvas.prototype.addPointerHandler = function (callback, context)
{
	this.enablePointerEvents();

	this.pointerHandlers.push ([this.pointerHandlers.length+"_"+~~(Math.random()*1e6), callback, context]);

	return this.pointerHandlers[this.pointerHandlers.length-1][0];
};


/**
**	Removes a previously attached pointer event handler.
**
**	>> void removePointerHandler (string id);
*/

Canvas.prototype.removePointerHandler = function (id)
{
	if (!this.pointerHandlers) return;

	for (var i = 0; i < this.pointerHandlers.length; i++)
	{
		if (this.pointerHandlers[i][0] == id)
		{
			this.pointerHandlers.splice(i, 1);
			break;
		}
	}
};


/**
**	Draws an image resource on the canvas (as obtained by Resources.load).
**
**	>> Canvas drawImageEx (Resource image, float x, float y);
*/

Canvas.prototype.drawImageResource = function (image, x, y)
{
	return this.drawImage (image.data, 0, 0, image.data.width, image.data.height, x, y, image.width, image.height);
};