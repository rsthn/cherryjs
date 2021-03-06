/*
**	flow/viewport.js
**
**	Copyright (c) 2013-2021, RedStar Technologies, All rights reserved.
**	https://rsthn.com/
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

/**
**	Viewport class controls the current visible rectangle of the world.
*/

import Rect from '../math/rect.js';
import Log from '../system/log.js';
import { Class } from '@rsthn/rin';

export default Class.extend
({
	className: 'Viewport',

	/*
	**	Dimensions of the viewport.
	*/
	width: 0,
	height: 0,

	/*
	**	Position of the top-left corner of the viewport in screen space.
	*/
	sx: 0,
	sy: 0,

	/*
	**	Position of the center of the viewport in the world.
	*/
	x: 0,
	y: 0,

	/*
	**	Ratio for the viewport's center (value from -1 to 1), used when focusing to use a different focus point instead of the exact center.
	*/
	centerRatioX: 0,
	centerRatioY: 0,

	/*
	**	Position offsets, used to move the viewport around without affecting the focus point.
	*/
	dx: 0,
	dy: 0,

	/*
	**	Boundaries of the world (automatically calculated from the world dimensions).
	*/
	worldX1: 0,
	worldY1: 0,
	worldX2: 0,
	worldY2: 0,

	/*
	**	The focus factor determines the ratio of a smaller viewport on which the current focus point must 
	**	be contained. If the focus point is not inside the smaller viewport scrolling will be performed.
	*/
	focusFactorX: 0,
	focusFactorY: 0,

	/*
	**	Focus target rectangle and its offsets. When the viewport is updated it will automatically focus on this rect.
	*/
	focusRect: null,
	focusOffsX: 0,
	focusOffsY: 0,

	/*
	**	Indicates if the viewport is enabled.
	*/
	enabled: false,

	/*
	**	Viewport scale.
	*/
	scale: 1,

	/*
	**	Bounds of the viewport in world space. Used to determine which elements lie inside the viewport.
	*/
	bounds: null,

	/*
	**	Bounds of the focus area of the viewport in world space. When the focusRect moves outside this area the viewport will be
	**	panned to keep it inside these bounds.
	*/
	focusBounds: null,

	/*
	**	Bounds of the viewport in screen space for rendering.
	*/
	screenBounds: null,

	/**
	**	Constructs the viewport with the specified viewport and world dimensions. A focus factor can
	**	be specified as well, if none provided the default value is 0.4.
	*/
	__ctor: function (sx, sy, width, height, worldWidth, worldHeight, focusFactorX/*0.4*/, focusFactorY/*0.4*/)
	{
		this.focusFactorX = focusFactorX == undefined ? 0.4 : focusFactorX;
		this.focusFactorY = focusFactorY == undefined ? 0.4 : focusFactorY;

		this.focusRect = null;

		this.sx = sx;
		this.sy = sy;

		if (width > worldWidth) width = worldWidth;
		if (height > worldHeight) height = worldHeight;

		this.width = width;
		this.height = height;

		worldWidth >>= 1;
		worldHeight >>= 1;

		this.worldX1 = -worldWidth;
		this.worldY1 = -worldHeight;
		this.worldX2 = +worldWidth;
		this.worldY2 = +worldHeight;

		this.bounds = Rect.alloc();
		this.focusBounds = Rect.alloc();
		this.screenBounds = Rect.alloc();

		this.x = 0;
		this.y = 0;

		this.enabled = true;

		this.updateScreenBounds();
		this.updateBounds();
	},

	/*
	**	Returns the enabled flag of the viewport.
	*/
	isEnabled: function ()
	{
		return this.enabled;
	},

	/*
	**	Sets the enabled flag of the viewport.
	*/
	setEnabled: function (enabled)
	{
		this.enabled = enabled;
		return this;
	},

	/*
	**	Updates the bound rect of the viewport.
	*/
	updateBounds: function ()
	{
		let w = this.width >> 1;
		let h = this.height >> 1;

		this.bounds.set (this.x-(w/this.scale)+this.dx, this.y-(h/this.scale)+this.dy, this.x+(w/this.scale)+this.dx, this.y+(h/this.scale)+this.dy);

		this.focusBounds.set (
			this.x - (this.focusFactorX*w + this.centerRatioX*w)/this.scale, this.y - (this.focusFactorY*h + this.centerRatioY*h)/this.scale,
			this.x + (this.focusFactorX*w + this.centerRatioX*w)/this.scale, this.y + (this.focusFactorY*h + this.centerRatioY*h)/this.scale
		);
	},

	/*
	**	Updates the screen bound rect of the viewport.
	*/
	updateScreenBounds: function ()
	{
		this.screenBounds.set (this.sx, this.sy, this.sx + (this.width-1), this.sy + (this.height-1));
	},

	/*
	**	Sets the size of the viewport.
	*/
	resize: function (width, height)
	{
		this.width = width;
		this.height = height;

		this.updateScreenBounds();
		this.updateBounds();

		return this;
	},

	/*
	**	Sets the center position of the viewport within the world.
	*/
	setPosition: function (x, y)
	{
		this.x = x;
		this.y = y;

		this.dx = 0;
		this.dy = 0;

		this.updateBounds();
		return this;
	},

	/*
	**	Sets the position of the viewport relative to the current focus point.
	*/
	setOffsets: function (dx, dy)
	{
		this.dx = dx;
		this.dy = dy;

		this.updateBounds();
		return this;
	},

	/*
	**	Sets the scale of the viewport.
	*/
	setScale: function (value)
	{
		this.scale = value;

		this.updateScreenBounds();
		this.updateBounds();
		return this;
	},

	/*
	**	Sets the center ratio of the viewport.
	*/
	setCenter: function (rx, ry)
	{
		this.centerRatioX = rx;
		this.centerRatioY = ry;

		return this;
	},

	/*
	**	Moves the viewport in the world, relative to the current focus point.
	*/
	translate: function (dx, dy)
	{
		this.dx += dx;
		this.dy += dy;

		this.updateBounds();
		return this;
	},

	/*
	**	Sets the screen position of the viewport.
	*/
	setScreenPosition: function (sx, sy)
	{
		this.sx = sx;
		this.sy = sy;

		this.updateScreenBounds();
	},

	/*
	**	Returns the X position of the viewport inside the world. When `absolute` is true, the focus point X (without offset) will be returned.
	*/
	getX: function (absolute=false)
	{
		return this.x + (absolute ? 0 : this.dx);
	},

	/*
	**	Returns the Y position of the viewport inside the world. When `absolute` is true, the focus point Y (without offset) will be returned.
	*/
	getY: function (absolute=false)
	{
		return this.y + (absolute ? 0 : this.dy);
	},

	/*
	**	Returns the X position of the viewport inside the world relative to the current focus point.
	*/
	getPositionX: function ()
	{
		return this.dx;
	},

	/*
	**	Returns the Y position of the viewport inside the world relative to the current focus point.
	*/
	getPositionY: function ()
	{
		return this.dy;
	},

	/*
	**	Returns the width of the viewport.
	*/
	getWidth: function ()
	{
		return this.width;
	},

	/*
	**	Returns the height of the viewport.
	*/
	getHeight: function ()
	{
		return this.height;
	},

	/*
	**	Returns the bounds of the viewport in world-space.
	*/
	getBounds: function ()
	{
		return this.bounds;
	},

	/*
	**	Returns the bounds of the viewport in screens-space.
	*/
	getScreenBounds: function ()
	{
		return this.screenBounds;
	},

	/*
	**	Returns the bounds of the focus-area rectangle in world-space.
	*/
	getFocusBounds: function ()
	{
		return this.focusBounds;
	},

	/*
	**	Moves the viewport to focus on the specified rectangle or point. If (i1,j1) is not specified then the viewport will be point-focused
	**	to the given point (i0,j0). Also, if no focus factors are specified the default ones will be used.
	*/
	focusOn: function (i0, j0, i1=null, j1=null, kx=null, ky=null)
	{
		if (kx === null) kx = this.focusFactorX;
		if (ky === null) ky = this.focusFactorY;

		if (i1 === null) i1 = i0;
		if (j1 === null) j1 = j0;

		let w = this.width >> 1;
		let h = this.height >> 1;

		let x1 = this.x - (kx*w + this.centerRatioX*w)/this.scale;
		let x2 = this.x + (kx*w + this.centerRatioX*w)/this.scale;
		let y1 = this.y - (ky*h + this.centerRatioY*h)/this.scale;
		let y2 = this.y + (ky*h + this.centerRatioY*h)/this.scale;

		if (x1 == x2)
			i0 = i1 = (i0 + i1) / 2;

		if (y1 == y2)
			j0 = j1 = (j0 + j1) / 2;

		let nx = this.x;
		let ny = this.y;

		if (i0 < x1) nx += (i0 - x1);
		else if (i1 > x2) nx += (i1 - x2);

		if (j0 < y1) ny += (j0 - y1);
		else if (j1 > y2) ny += (j1 - y2);

		x1 = nx - w;
		x2 = nx + w;
		y1 = ny - h;
		y2 = ny + h;

		if (x1 < this.worldX1) nx = this.worldX1 + w;
		if (x2 > this.worldX2) nx = this.worldX2 - w;

		if (y1 < this.worldY1) ny = this.worldY1 + h;
		if (y2 > this.worldY2) ny = this.worldY2 - h;

		this.x = nx;
		this.y = ny;

		this.updateBounds();
	},

	/*
	**	Updates the viewport.
	*/
	update: function (dt)
	{
		if (this.focusRect != null)
			this.focusOn (this.focusRect.x1, this.focusRect.y1, this.focusRect.x2, this.focusRect.y2);
	},

	/*
	**	Tracks a specified rectangle by maintaining focus on it (a call to `update` must be made on every frame update).
	*/
	setFocusRect: function (/*Rect*/rect, offsX=0, offsY=0)
	{
		this.focusRect = rect;

		this.focusOffsX = offsX;
		this.focusOffsY = offsY;

		this.update(0);
		return this;
	},

	/*
	**	Sets the focus factor of the viewport.
	*/
	setFocusFactor: function (/*float*/valueX, /*float*/valueY)
	{
		this.focusFactorX = valueX;
		this.focusFactorY = valueY === undefined ? valueX : valueY;

		return this;
	},

	/*
	**	Applies the viewport transform to the specified display buffer.
	*/
	applyTransform: function (g)
	{
		g.translate (this.screenBounds.cx, this.screenBounds.cy);
		g.scale (this.scale, this.scale);
		g.translate (-this.getX(), -this.getY());

		g.matr.data[6] = ~~g.matr.data[6];
		g.matr.data[7] = ~~g.matr.data[7];
		g.updateTransform();
	},

	/*
	**	Converts a point from screen-space to world-space.
	*/
	toWorldSpace: function (x, y, floor=false)
	{
		if (floor) {
			x = ((x - ~~this.screenBounds.cx) / this.scale) + ~~this.getX();
			y = ((y - ~~this.screenBounds.cy) / this.scale) + ~~this.getY();
		}
		else {
			x = ((x - this.screenBounds.cx) / this.scale) + this.getX();
			y = ((y - this.screenBounds.cy) / this.scale) + this.getY();
		}

		return { x: x, y: y };
	},

	/*
	**	Converts a point from world-space to screen-space.
	*/
	toScreenSpace: function (x, y, floor=false)
	{
		if (floor) {
			x = (x - ~~this.getX()) * this.scale + ~~this.screenBounds.cx;
			y = (y - ~~this.getY()) * this.scale + ~~this.screenBounds.cy;
		}
		else {
			x = (x - this.getX()) * this.scale + this.screenBounds.cx;
			y = (y - this.getY()) * this.scale + this.screenBounds.cy;
		}

		return { x: x, y: y };
	},
});
