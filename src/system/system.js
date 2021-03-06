/*
**	system/system.js
**
**	Copyright (c) 2016-2021, RedStar Technologies, All rights reserved.
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

import KeyCodes from './keycodes.js';
import List from '../utils/list.js';
import Linkable from '../utils/linkable.js';
import Timer from './timer.js';
import Canvas from './canvas.js';

/*
**	System object.
*/

const System =
{
	/*
	**	System flags.
	*/
	flags:
	{
		renderingEnabled: false,
		renderingPaused: false
	},

	/*
	**	Event codes.
	*/
	EVT_KEY_DOWN:			0x001,
	EVT_KEY_UP:				0x002,

	EVT_POINTER_DOWN: 		0x010,
	EVT_POINTER_UP: 		0x011,
	EVT_POINTER_MOVE: 		0x012,
	EVT_POINTER_DRAG_START:	0x013,
	EVT_POINTER_DRAG_MOVE:	0x014,
	EVT_POINTER_DRAG_STOP:	0x015,

	/*
	**	Display orientations.
	*/
	DEFAULT:	0,
	LANDSCAPE:	1,
	PORTRAIT:	2,
	AUTOMATIC:	3,

	/*
	**	Default options of the rendering system.
	*/
	defaultOptions:
	{
		background: "#000",
		gl: false,

		canvas: null,
		canvas2: null,

		fps: 144,
		minFps: 15,

		context: null,
		antialias: true,

		screenWidth: null,
		screenHeight: null,

		orientation: 0,

		extraScaleFactor: 1,
		fullscreen: false
	},

	/*
	**	Screen resolution, obtained automatically when the system is initialized.
	*/
	screenWidth: 0, screenHeight: 0,

	/*
	**	Current screen orientation.
	*/
	orientation: 0,

	/*
	**	Coordinates of the screen's offset (for letter-box effect when the screen does not fit tightly).
	*/
	offsX: 0, offsY: 0,

	/*
	**	Device pixel ratio, canvas backing store ratio and resulting canvas ratio (devicePixelRatio / backingStoreRatio).
	*/
	devicePixelRatio: 1, backingStoreRatio: 1, canvasPixelRatio: 1, canvasScaleFactor: 1, scaleFactor: 1,

	/*
	**	Initial transformation matrix. Should be used (if needed) instead of loadIdentity() since the System does some transformations first.
	*/
	initialMatrix: null,

	/*
	**	Display buffer for the renderer (either 2d or webgl).
	*/
	displayBuffer: null,

	/*
	**	Secondry display buffer (always 2d).
	*/
	displayBuffer2: null,

	/*
	**	Small (320x240) temporal display buffer.
	*/
	tempDisplayBuffer: null,

	/*
	**	Map with the status of all keys (along with other flags).
	*/
	keyState: { time: 0, shift: false, ctrl: false, alt: false, keyCode: 0 },

	/*
	**	Current status of all pointers. The related object is known as the Pointer State, and has the following fields:
	**	id, isActive, isDragging, sx, sy, x, y, dx, dy, button
	*/
	pointerState: { },

	/*
	**	The update method of all objects will be executed when the system update() method is called.
	*/
	updateQueue: null, /*List*/

	/*
	**	The draw method of all objects will be executed when the system draw() method is called.
	*/
	drawQueue: null, /*List*/

	/*
	**	Time scale, the frame delta is multiplied by this value before each system cycle.
	*/
	timeScale: 1,

	/*
	**	Frame interval in milliseconds.
	*/
	frameInterval: 0,

	/*
	**	Fixed frame interval in milliseconds, when set to non-zero value the frame delta will be set to this value.
	*/
	fixedFrameInterval: 0,

	/*
	**	Maximum frame interval in milliseconds, if the frameDelta exceeds this it will be truncated to this value.
	*/
	maxFrameInterval: 0,

	/*
	**	Last frame delta in seconds and milliseconds (float, int).
	*/
	frameDelta: 0,
	frameDeltaMillis: 0,

	/*
	**	Logical system time (updated on each cycle by the calculated frameDelta).
	*/
	frameTime: 0,
	frameTimeMillis: 0,

	/*
	**	Current frame number.
	*/
	frameNumber: 0,

	/*
	**	Indicates if the drawing or update process is taking place.
	*/
	frameUpdateInProgress: false,
	frameDrawInProgress: false,

	/*
	**	Rendering time data.
	*/
	perf:
	{
		/*
		**	Time of the first frame drawn.
		*/
		startTime: 0,

		/*
		**	Time of the last frame drawn.
		*/
		lastTime: 0,

		/*
		**	Number of frames drawn in total since startTime.
		*/
		numFrames: 0,

		/*
		**	Total time accumulated in each update and draw operation.
		*/
		updateTime: 0,
		drawTime: 0,

		/*
		**	Count of samples in current perf data.
		*/
		numSamples: 0,

		/*
		**	Number of samples to accumulate (report window size).
		*/
		windowSize: 500,

		/*
		**	Snapshot data updated when numSamples is windowSize.
		*/
		snapStartTime: 0,
		snapNumFrames: 0,
		snapUpdateTime: 0,
		snapDrawTime: 0
	},

	/*
	**	Initializes the system with the specified configuration.
	*/
	init: function (opts)
	{
		// Load options from defaults and from the specified ones.
		var o = { };

		Object.assign(o, this.defaultOptions);
		if (opts) Object.assign(o, opts);

		this.options = o;

		// Set default orientation if both target sizes were specified.
		if (o.screenWidth && o.screenHeight && o.orientation == System.DEFAULT)
		{
			o.orientation = o.screenWidth > o.screenHeight ? System.LANDSCAPE : System.PORTRAIT;
		}

		this.orientation = o.orientation;

		this.updateQueue = new List();
		this.drawQueue = new List();

		// Attach frame event handlers.
		this.frameInterval = int(1000 / o.fps);
		this.maxFrameInterval = int(1000 / o.minFps);

		global.onresize = this.onWindowResized.bind(this);

		this.frameTimer = new Timer (this.frameInterval, this.onFrame.bind(this), true);

		// Setup canvas buffer.
		this.displayBuffer = new Canvas ({ gl: o.gl, elem: o.canvas, absolute: true, hidden: false, antialias: o.antialias, background: o.background });
		this.displayBuffer2 = new Canvas ({ gl: false, elem: o.canvas2, absolute: true, hidden: false, antialias: o.antialias, background: 'none' });

		this.displayBuffer2.elem.style.pointerEvents = 'none';

		this.tempDisplayBuffer = new Canvas ({ hidden: true, antialias: o.antialias }).resize(320, 240);

		var display0 = this.displayBuffer.elem;

		// Obtain device display ratios.
		this.devicePixelRatio = global.devicePixelRatio || 1;

		this.backingStoreRatio = o.gl == true ? 1 : (this.displayBuffer.context.webkitBackingStorePixelRatio ||
									this.displayBuffer.context.mozBackingStorePixelRatio ||
									this.displayBuffer.context.msBackingStorePixelRatio ||
									this.displayBuffer.context.oBackingStorePixelRatio ||
									this.displayBuffer.context.backingStorePixelRatio || 1);

		this.canvasPixelRatio = this.devicePixelRatio / this.backingStoreRatio;

		System.onWindowResized (true);

		// Attach keyboard event handlers.
		var _this = this;

		global.onkeydown = function (evt)
		{
			if (evt.target !== global.document.body)
				return;

			if (_this.keyState[evt.keyCode])
				return false;

			_this.keyState[evt.keyCode] = true;

			_this.keyState.keyCode = evt.keyCode;
			_this.keyState.startTime = System.now(true);

			switch (evt.keyCode)
			{
				case 16: // SHIFT
					_this.keyState.shift = true;
					break;

				case 17: // CTRL
					_this.keyState.ctrl = true;
					break;

				case 18: // ALT
					_this.keyState.alt = true;
					break;
			}

			// CTRL+TAB should always be handled by the browser.
			if (_this.keyState.ctrl && evt.keyCode == KeyCodes.TAB)
			{
				_this.keyState[evt.keyCode] = false;
				return true;
			}

			if (_this.onKeyboardEvent (_this.EVT_KEY_DOWN, evt.keyCode, _this.keyState) === false)
				return false;
		};

		global.onkeyup = function (evt)
		{
			if (evt.target !== global.document.body)
				return;

			if (!_this.keyState[evt.keyCode])
				return false;

			_this.keyState[evt.keyCode] = false;
			_this.keyState.endTime = System.now(true);
			_this.keyState.keyCode = evt.keyCode;

			switch (evt.keyCode)
			{
				case 16: // SHIFT
					_this.keyState.shift = false;
					break;

				case 17: // CTRL
					_this.keyState.ctrl = false;
					break;

				case 18: // ALT
					_this.keyState.alt = false;
					break;
			}

			if (_this.onKeyboardEvent (_this.EVT_KEY_UP, evt.keyCode, _this.keyState) === false)
				return false;
		};

		// Converts pointer coordinates from physical space to screen space.

		const pointerConvX = function (x, y)
		{
			return System.reverseRender ? ~~(System.screenWidth-1 - (y-System.offsY)/System.canvasScaleFactor) : ~~((x-System.offsX)/System.canvasScaleFactor);
		};

		const pointerConvY = function (x, y)
		{
			return System.reverseRender ? ~~((x-System.offsX)/System.canvasScaleFactor) : ~~((y-System.offsY)/System.canvasScaleFactor);
		};

		// Attach pointer event handlers if pointer-events are available.
		if ("ontouchstart" in global)
		{
			display0.ontouchstart = function (evt)
			{
				evt.preventDefault();

				var touches = evt.changedTouches;

				for (var i = 0; i < touches.length; i++)
				{
					if (!System.pointerState[touches[i].identifier])
					{
						System.pointerState[touches[i].identifier] = {
								id: touches[i].identifier, isActive: false, isDragging: false,
								sx: 0, sy: 0, x: 0, y: 0, dx: 0, dy: 0, button: 0
							};
					}

					var p = System.pointerState[touches[i].identifier];

					p.isActive = true;
					p.isDragging = false;
					p.button = 1;

					p.startTime = System.now(true);

					p.x = p.sx = pointerConvX(touches[i].clientX, touches[i].clientY);
					p.y = p.sy = pointerConvY(touches[i].clientX, touches[i].clientY);

					System.onPointerEvent (System.EVT_POINTER_DOWN, p, System.pointerState);
				}

				return false;
			};

			display0.ontouchend = function (evt)
			{
				evt.preventDefault();

				var touches = evt.changedTouches;

				for (var i = 0; i < touches.length; i++)
				{
					if (!System.pointerState[touches[i].identifier])
						continue;

					var p = System.pointerState[touches[i].identifier];

					p.endTime = System.now(true);
					p.deltaTime = p.endTime - p.startTime;

					p.x = pointerConvX(touches[i].clientX, touches[i].clientY)
					p.y = pointerConvY(touches[i].clientX, touches[i].clientY)

					if (p.isDragging)
						System.onPointerEvent (System.EVT_POINTER_DRAG_STOP, p, System.pointerState);

					System.onPointerEvent (System.EVT_POINTER_UP, p, System.pointerState);

					p.isActive = false;
					p.isDragging = false;

					p.button = 0;
				}

				return false;
			};

			display0.ontouchcancel = function (evt)
			{
				evt.preventDefault();

				var touches = evt.changedTouches;

				for (var i = 0; i < touches.length; i++)
				{
					if (!System.pointerState[touches[i].identifier])
						continue;

					var p = System.pointerState[touches[i].identifier];

					p.x = pointerConvX(touches[i].clientX, touches[i].clientY);
					p.y = pointerConvY(touches[i].clientX, touches[i].clientY);

					System.onPointerEvent (p.isDragging ? System.EVT_POINTER_DRAG_STOP : System.EVT_POINTER_UP, p, System.pointerState);

					p.isActive = false;
					p.isDragging = false;

					p.button = 0;
				}

				return false;
			};

			display0.ontouchmove = function (evt)
			{
				evt.preventDefault();

				var touches = evt.changedTouches;

				for (var i = 0; i < touches.length; i++)
				{
					if (!System.pointerState[touches[i].identifier])
						continue;

					var p = System.pointerState[touches[i].identifier];

					if (p.isActive && !p.isDragging)
					{
						System.onPointerEvent (System.EVT_POINTER_DRAG_START, p, System.pointerState);
						p.isDragging = true;
					}

					p.x = pointerConvX(touches[i].clientX, touches[i].clientY);
					p.y = pointerConvY(touches[i].clientX, touches[i].clientY);

					p.dx = p.x - p.sx;
					p.dy = p.y - p.sy;

					System.onPointerEvent (p.isDragging ? System.EVT_POINTER_DRAG_MOVE : System.EVT_POINTER_MOVE, p, System.pointerState);
				}

				return false;
			};
		}
		// Attach mouse event handlers when pointer-events are not available.
		else
		{
			display0.onmousedown = function (evt)
			{
				evt.preventDefault();

				if (!System.pointerState[0])
				{
					System.pointerState[0] = {
							id: 0, isActive: false, isDragging: false, button: 0,
							sx: 0, sy: 0, x: 0, y: 0, dx: 0, dy: 0,
						};
				}

				var p = System.pointerState[0];

				p.isActive = true;
				p.isDragging = false;
				p.button = evt.which;

				p.x = p.sx = pointerConvX(evt.clientX, evt.clientY);
				p.y = p.sy = pointerConvY(evt.clientX, evt.clientY);

				System.onPointerEvent (System.EVT_POINTER_DOWN, p, System.pointerState);
				return false;
			};

			display0.onmouseup = function (evt)
			{
				evt.preventDefault();

				if (!System.pointerState[0])
					return false;

				var p = System.pointerState[0];

				p.x = pointerConvX(evt.clientX, evt.clientY);
				p.y = pointerConvY(evt.clientX, evt.clientY);

				if (p.isDragging)
					System.onPointerEvent (System.EVT_POINTER_DRAG_STOP, p, System.pointerState);

				System.onPointerEvent (System.EVT_POINTER_UP, p, System.pointerState);

				p.isActive = false;
				p.isDragging = false;

				p.button = 0;
			};

			display0.onmousemove = function (evt)
			{
				evt.preventDefault();

				if (!System.pointerState[0])
					return false;

				var p = System.pointerState[0];

				if (p.isActive && !p.isDragging)
				{
					System.onPointerEvent (System.EVT_POINTER_DRAG_START, p, System.pointerState);
					p.isDragging = true;
				}

				p.x = pointerConvX(evt.clientX, evt.clientY);
				p.y = pointerConvY(evt.clientX, evt.clientY);

				p.dx = p.x - p.sx;
				p.dy = p.y - p.sy;

				System.onPointerEvent (p.isDragging ? System.EVT_POINTER_DRAG_MOVE : System.EVT_POINTER_MOVE, p, System.pointerState);
				return false;
			};
		}
	},

	/*
	**	Returns the current time in milliseconds or seconds if asSeconds is set to true.
	*/
	now: function(asSeconds)
	{
		var value = hrnow();
		return asSeconds ? (value / 1000) : value;
	},

	/*
	**	Returns the current logical time in seconds (same as reading System.frameTime).
	*/
	time: function()
	{
		return this.frameTime;
	},

	/*
	**	Starts the system and enables rendering and updates.
	*/
	start: function()
	{
		this.onWindowResized();

		this.flags.renderingPaused = false;
		this.frameTimer.start();
	},

	/*
	**	Stops the system by disabling both rendering and updates.
	*/
	stop: function()
	{
		this.flags.renderingPaused = true;
		this.frameTimer.stop();
	},

	/*
	**	Disables updates, but continues to render.
	*/
	pause: function()
	{
		this.flags.renderingPaused = true;
	},

	/*
	**	Resumes updates if previously stopped with `pause()`.
	*/
	resume: function()
	{
		this.flags.renderingPaused = false;
		this.resetPerf();
	},

	/*
	**	Executed when a frame needs to be rendered to the display buffer.
	*/
	onFrame: function(delta, timer)
	{
		var now = this.now();
		var tmp;

		if (delta > this.maxFrameInterval)
			delta = this.maxFrameInterval;

		if (this.fixedFrameInterval != 0)
			delta = this.fixedFrameInterval;

		if (!this.flags.renderingEnabled || this.flags.renderingPaused)
		{
			this.frameDrawInProgress = true;
			try {
				this.displayBuffer.clear();
				this.draw (this.displayBuffer, this.displayBuffer2);
			}
			catch (e) {
				console.error("DRAW ERROR: \n" + e + "\n" + e.stack);
			}	
			this.frameDrawInProgress = false;
			return;
		}

		if (this.perf.numFrames == 0)
		{
			this.perf.startTime = now - this.frameInterval;
			this.perf.lastTime = now;
		}

		delta *= this.timeScale;

		this.frameDeltaMillis = delta;
		this.frameDelta = delta / 1000.0;
		this.frameTimeMillis += this.frameDeltaMillis;
		this.frameTime += this.frameDelta;
		this.frameNumber++;

		/* ~ */
		this.frameUpdateInProgress = true;
		tmp = hrnow();
		try {
			this.update (this.frameDelta, this.frameDeltaMillis);
		}
		catch (e) {
			System.stop();
			throw e;
		}
		this.perf.updateTime += hrnow() - tmp;
		this.frameUpdateInProgress = false;

		/* ~ */
		this.frameDrawInProgress = true;
		tmp = hrnow();
		try {
			this.displayBuffer.clear();
			this.draw (this.displayBuffer, this.displayBuffer2);
		}
		catch (e) {
			System.stop();
			throw e;
		}	
		this.perf.drawTime += hrnow() - tmp;
		this.frameDrawInProgress = false;

		this.perf.lastTime = now;
		this.perf.numFrames++;

		/*
		this.perf.numSamples++;

		if (this.perf.numSamples == this.perf.windowSize)
		{
			this.perf.snapStartTime = this.perf.lastTime;
			this.perf.snapNumFrames = this.perf.numFrames;
			this.perf.snapUpdateTime = this.perf.updateTime;
			this.perf.snapDrawTime = this.perf.drawTime;
		}

		if (this.perf.numSamples == 2*this.perf.windowSize)
		{
			this.perf.startTime = this.perf.snapStartTime;
			this.perf.numFrames -= this.perf.snapNumFrames;
			this.perf.updateTime -= this.perf.snapUpdateTime;
			this.perf.drawTime -= this.perf.snapDrawTime;

			this.perf.numSamples = 0;
		}
		*/
	},

	/*
	**	Executed when the size of the window has changed. Will cause a full buffer rendering.
	*/
	onWindowResized: function(notRendering=false)
	{
		if ('document' in global)
		{
			if (this.options.fullscreen)
			{
				this._screenWidth = int(global.screen.width);
				this._screenHeight = int(global.screen.height);
			}
			else
			{
				this._screenWidth = global.innerWidth;
				this._screenHeight = global.innerHeight;
			}
		}
		else
		{
			this._screenWidth = this.options.screenWidth;
			this._screenHeight = this.options.screenHeight;

			if (this.options.screenWidth == null && this.options.screenHeight == null)
				throw new Error ('At least one screen dimension must be specified in headless mode.');
		}

		if ((this._screenWidth < this._screenHeight && this.orientation == System.LANDSCAPE) || (this._screenWidth > this._screenHeight && this.orientation == System.PORTRAIT))
		{
			this.screenWidth = this._screenHeight;
			this.screenHeight = this._screenWidth;

			this.reverseRender = true;
		}
		else
		{
			this.screenWidth = this._screenWidth;
			this.screenHeight = this._screenHeight;

			this.reverseRender = false;
		}

		// ***
		let targetScreenWidth = this.options.screenWidth;
		let targetScreenHeight = this.options.screenHeight;

		if (targetScreenWidth == null || targetScreenHeight == null)
		{
			if (targetScreenWidth == null)
			{
				targetScreenWidth = int(this.screenWidth * (this.options.screenHeight / this.screenHeight));
			}
			else if (targetScreenHeight == null)
			{
				targetScreenHeight = int(this.screenHeight * (this.options.screenWidth / this.screenWidth));
			}
		}

		// ***
		let screenWidth = targetScreenWidth;
		let screenHeight = targetScreenHeight;

		if (this.orientation == System.AUTOMATIC && screenWidth && screenHeight)
		{
			if ((screenWidth > screenHeight && this.screenWidth < this.screenHeight) || (screenWidth < screenHeight && this.screenWidth > this.screenHeight))
			{
				screenWidth = screenHeight;
				screenHeight = targetScreenWidth;
			}
		}

		// ***
		this.canvasScaleFactor = 1;

		if (screenWidth && screenHeight)
		{
			this.canvasScaleFactor = Math.min (this.screenWidth / screenWidth, this.screenHeight / screenHeight);
		}
		else if (screenWidth)
		{
			this.canvasScaleFactor = this.screenWidth / screenWidth;
		}
		else if (screenHeight)
		{
			this.canvasScaleFactor = this.screenHeight / screenHeight;
		}

		// ***
		let _screenWidth = this.screenWidth;
		let _screenHeight = this.screenHeight;

		if (screenWidth) this.screenWidth = screenWidth;
		if (screenHeight) this.screenHeight = screenHeight;

		this.offsX = int((_screenWidth - this.screenWidth*this.canvasScaleFactor)*0.5);
		this.offsY = int((_screenHeight - this.screenHeight*this.canvasScaleFactor)*0.5);

		if (this.reverseRender)
		{
			let tmp = this.offsX;
			this.offsX = this.offsY;
			this.offsY = tmp;
		}

		this.scaleFactor = this.canvasScaleFactor * this.canvasPixelRatio;
		this.scaleFactor = ~~(0.7 + this.scaleFactor);

		this.flags.renderingEnabled = false;

		if ('document' in global)
			global.document.body.style.backgroundColor = this.displayBuffer.backgroundColor;

		if (!this.reverseRender)
		{
			this.displayBuffer.resize (this.screenWidth*this.scaleFactor, this.screenHeight*this.scaleFactor);
			this.displayBuffer.elem.style.width = (this.screenWidth*this.canvasScaleFactor) + "px";
			this.displayBuffer.elem.style.height = (this.screenHeight*this.canvasScaleFactor) + "px";

			this.displayBuffer2.resize (this.screenWidth*this.scaleFactor, this.screenHeight*this.scaleFactor);
			this.displayBuffer2.elem.style.width = (this.screenWidth*this.canvasScaleFactor) + "px";
			this.displayBuffer2.elem.style.height = (this.screenHeight*this.canvasScaleFactor) + "px";
		}
		else
		{
			this.displayBuffer.resize (this.screenHeight*this.scaleFactor, this.screenWidth*this.scaleFactor);
			this.displayBuffer.elem.style.width = (this.screenHeight*this.canvasScaleFactor) + "px";
			this.displayBuffer.elem.style.height = (this.screenWidth*this.canvasScaleFactor) + "px";

			this.displayBuffer2.resize (this.screenHeight*this.scaleFactor, this.screenWidth*this.scaleFactor);
			this.displayBuffer2.elem.style.width = (this.screenHeight*this.canvasScaleFactor) + "px";
			this.displayBuffer2.elem.style.height = (this.screenWidth*this.canvasScaleFactor) + "px";
		}

		this.displayBuffer.elem.style.marginLeft = this.offsX + "px";
		this.displayBuffer.elem.style.marginTop = this.offsY + "px";

		this.displayBuffer2.elem.style.marginLeft = this.offsX + "px";
		this.displayBuffer2.elem.style.marginTop = this.offsY + "px";

		this.displayBuffer.loadIdentity();
		this.displayBuffer2.loadIdentity();

		if (this.scaleFactor != 1) {
			this.displayBuffer.globalScale(this.scaleFactor);
			this.displayBuffer2.globalScale(this.scaleFactor);
		}

		if (this.reverseRender)
		{
			this.displayBuffer.rotate(Math.PI/2);
			this.displayBuffer.translate(-this.screenWidth, 0);
			this.displayBuffer.flipped(true);

			this.displayBuffer2.rotate(Math.PI/2);
			this.displayBuffer2.translate(-this.screenWidth, 0);
			this.displayBuffer2.flipped(true);
		}
		else
		{
			this.displayBuffer.flipped(false);
			this.displayBuffer2.flipped(false);
		}

		/* *** */
		this.scaleFactor *= this.options.extraScaleFactor;

		this.integerScaleFactor = ~~(this.scaleFactor + 0.9);
		this.resetPerf();

		this.initialMatrix = this.displayBuffer.getMatrix();

		if (notRendering != true)
		{
			this.flags.renderingEnabled = true;
			this.onCanvasResized (this.screenWidth, this.screenHeight);
		}
	},

	/*
	**	Event triggered when the canvas was resized by the system.
	*/
	onCanvasResized: function (screenWidth, screenHeight)
	{
	},

	/*
	**	Resets the performance data.
	*/
	resetPerf: function()
	{
		this.perf.numFrames = 0;
	},

	/*
	**	Adds the specified handler to the update queue. Must have method update (deltaTime: int).
	*/
	updateQueueAdd: function (/*object*/handler)
	{
		this.updateQueue.push (handler);
		return this.updateQueue.bottom;
	},

	/*
	**	Removes the specified handler from the update queue.
	*/
	updateQueueRemove: function (/*object*/handler)
	{
		this.updateQueue.remove (handler instanceof Linkable ? handler : this.updateQueue.sgetNode(handler));
	},

	/*
	**	Adds the specified handler to the draw queue. Must have method draw (canvas: Canvas).
	*/
	drawQueueAdd: function (/*object*/handler)
	{
		this.drawQueue.push (handler);
		return this.drawQueue.bottom;
	},

	/*
	**	Removes the specified handler from the draw queue.
	*/
	drawQueueRemove: function (/*object*/handler)
	{
		this.drawQueue.remove (handler instanceof Linkable ? handler : this.drawQueue.sgetNode(handler));
	},

	/*
	**	Adds the specified handler to the update and draw queues. Must have both update (deltaTime: int) and draw (canvas: Canvas) methods. Returns `obj`.
	*/
	queueAdd: function (/*object*/handler)
	{
		this.updateQueue.push (handler);
		this.drawQueue.push (handler);
		return handler;
	},

	/*
	**	Removes the specified handler from the update and draw queues.
	*/
	queueRemove: function (/*object*/handler)
	{
		this.updateQueue.remove (this.updateQueue.sgetNode(handler));
		this.drawQueue.remove (this.drawQueue.sgetNode(handler));
	},

	/*
	**	Runs an update cycle, all objects in the updateQueue will be updated.
	*/
	update: function (dts, dtm)
	{
		var next;

		for (var elem = this.updateQueue.top; elem; elem = next)
		{
			next = elem.next;
			elem.value.update(dts, dtm);
		}
	},

	/*
	**	Runs a rendering cycle, all objects in the drawQueue will be drawn.
	*/
	draw: function (canvas, canvas2)
	{
		var next;

		for (var elem = this.drawQueue.top; elem; elem = next)
		{
			next = elem.next;
			elem.value.draw(canvas, canvas2);
		}
	},

	/*
	**	Interpolates numeric values between two objects (`src` and `dst`) using the specified `duration` and `easing` function. Note that all four parameters
	**	`src`, `dst`, `duration` and `easing` must be objects having the same number of values.
	*/
	interpolate: function (src, dst, duration, easing, callback/* function(data, isFinished) */)
	{
		let time = { };
		let data = { };
		let count = 0;

		for (let x in src)
		{
			time[x] = 0.0;
			data[x] = src[x]
			count++;
		}

		let interpolator =
		{
			update: function(dt)
			{
				for (let x in time)
				{
					if (time[x] == duration[x])
						continue;

					time[x] += dt;
					if (time[x] >= duration[x])
					{
						time[x] = duration[x];
						count--;
					}

					let t = easing[x] (time[x] / duration[x]);
					data[x] = (1-t)*src[x] + t*dst[x];
				}

				callback (data, count == 0);

				if (count == 0)
					System.updateQueueRemove(interpolator);
			}
		};

		System.updateQueueAdd(interpolator);
		interpolator.update(0);
	},

	/*
	**	Event triggered when a keyboard event is detected by the system, `action` is one of the EVT_KEY_* constants,
	**	`keyCode` is one of the `KeyCodes` constants and `keyState` a reference to `System.keyState`.
	*/
	onKeyboardEvent: function (action, keyCode, keyState)
	{
	},

	/*
	**	Event triggered when a pointer event is detected by the system, `action` is one of the EVT_POINTER_* constants,
	**	`pointer` contains the pointer state, and `pointers` a reference to `System.pointerState`.
	*/
	onPointerEvent: function (action, pointer, pointers)
	{
	}
};

export default System;
