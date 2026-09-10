/**
 * Blur IMAGE Tool — Whole Image & Custom Brush Blur
 */
import { setupDropzone, loadImageFromFile, downloadBlob } from '../utils/file-loader.js';
import { canvasToBlob } from '../utils/canvas-helper.js';
import { Toast } from '../utils/toast.js';

export const BlurImageTool = {
  id: 'blur-image',
  name: 'Blur IMAGE',
  category: 'edit',
  description: 'Blur whole images or paint custom blur with an interactive brush and adjustable intensity.',

  imageItem: null,
  mode: 'whole', // 'whole' or 'brush'
  brushTool: 'blur', // 'blur' or 'eraser'
  blurIntensity: 18,
  brushSize: 45,
  invertMask: false,

  // Canvases
  displayCanvas: null,
  maskCanvas: null,
  blurCanvas: null,
  isPainting: false,
  lastPos: null,

  render(container) {
    container.innerHTML = `
      <div class="workspace-header">
        <div class="workspace-header-left">
          <a href="#/" class="back-btn"><i data-lucide="arrow-left" style="width: 16px; height: 16px;"></i> All Tools</a>
          <div class="workspace-title-wrap">
            <h2>Blur IMAGE</h2>
            <span class="tool-badge-new">New!</span>
          </div>
        </div>
        <div class="workspace-header-right">
          <button id="blurimg-reset-btn" class="btn-secondary" style="display:none;"><i data-lucide="refresh-cw" style="width: 15px; height: 15px;"></i> New Image</button>
          <button id="blurimg-download-btn" class="btn-primary btn-emerald" disabled><i data-lucide="download" style="width: 16px; height: 16px;"></i> Save Blurred Image</button>
        </div>
      </div>

      <!-- Dropzone -->
      <div id="blurimg-dropzone" class="dropzone-container">
        <div class="dropzone-icon" style="background: var(--accent-cyan-bg); color: var(--accent-cyan);">
          <i data-lucide="brush" style="width: 32px; height: 32px;"></i>
        </div>
        <div class="dropzone-title">Select Image to Blur</div>
        <div class="dropzone-desc">Blur the entire photo or paint selective blur with a custom brush</div>
        <button type="button" class="dropzone-btn" style="background: var(--accent-cyan);"><i data-lucide="upload" style="width: 18px; height: 18px;"></i> Select Image</button>
        <div class="dropzone-formats">Supports: Whole-image blur, selective brush, and background defocus</div>
      </div>

      <!-- Workspace Layout -->
      <div id="blurimg-workspace" class="editor-layout" style="display:none;">
        <div class="viewport-card" style="align-items: center; justify-content: center;">
          <div id="blurimg-canvas-wrapper" style="position: relative; display: inline-block; cursor: crosshair; max-width: 100%;">
            <canvas id="blurimg-display-canvas" style="display: block; max-width: 100%; max-height: 520px;"></canvas>
            <canvas id="blurimg-cursor-canvas" style="position: absolute; top: 0; left: 0; pointer-events: none;"></canvas>
          </div>
          <div id="blurimg-hint" style="margin-top: 0.75rem; font-size: 0.8rem; color: var(--text-muted); text-align: center;">
            Adjust the blur intensity slider to blur the whole image.
          </div>
        </div>

        <div class="settings-panel">
          <!-- Blur Target Mode -->
          <div class="settings-group">
            <h4>Blur Mode</h4>
            <div class="chip-group" id="blurimg-mode-chips">
              <button class="chip-btn active" data-mode="whole">
                <i data-lucide="maximize" style="width: 14px; height: 14px; display: inline-block; vertical-align: middle;"></i> Whole Image
              </button>
              <button class="chip-btn" data-mode="brush">
                <i data-lucide="brush" style="width: 14px; height: 14px; display: inline-block; vertical-align: middle;"></i> Custom Brush
              </button>
            </div>
          </div>

          <!-- Blur Intensity -->
          <div class="settings-group">
            <div class="control-row">
              <div class="control-label">
                <span>Blur Intensity</span>
                <span id="blurimg-intensity-val" class="control-val">18px</span>
              </div>
              <input type="range" id="blurimg-intensity-slider" class="range-slider" min="1" max="60" value="18">
            </div>

            <!-- Intensity Presets -->
            <div class="chip-group" id="blurimg-intensity-presets" style="margin-top: 0.4rem;">
              <button class="chip-btn" data-intensity="6">Subtle (6px)</button>
              <button class="chip-btn active" data-intensity="18">Medium (18px)</button>
              <button class="chip-btn" data-intensity="35">Heavy (35px)</button>
              <button class="chip-btn" data-intensity="55">Max (55px)</button>
            </div>
          </div>

          <!-- Brush Options (visible in brush mode) -->
          <div id="blurimg-brush-panel" class="settings-group" style="display:none;">
            <h4>Brush Controls</h4>
            <div class="chip-group" id="blurimg-brush-tools">
              <button class="chip-btn active" data-tool="blur">
                <i data-lucide="brush" style="width:13px;height:13px;display:inline-block;vertical-align:middle;"></i> Blur Brush
              </button>
              <button class="chip-btn" data-tool="eraser">
                <i data-lucide="eraser" style="width:13px;height:13px;display:inline-block;vertical-align:middle;"></i> Eraser (Unblur)
              </button>
            </div>

            <div class="control-row" style="margin-top: 0.5rem;">
              <div class="control-label">
                <span>Brush Size</span>
                <span id="blurimg-size-val" class="control-val">45px</span>
              </div>
              <input type="range" id="blurimg-size-slider" class="range-slider" min="10" max="150" value="45">
            </div>

            <label style="display: flex; align-items: center; gap: 8px; font-size: 0.85rem; font-weight: 600; cursor: pointer; margin-top: 0.5rem;">
              <input type="checkbox" id="blurimg-invert-check"> Invert (Blur background, keep subject sharp)
            </label>

            <button id="blurimg-clear-brush-btn" class="btn-secondary" style="margin-top: 0.5rem; justify-content: center; width: 100%;">
              <i data-lucide="trash-2" style="width: 14px; height: 14px;"></i> Clear Brush Strokes
            </button>
          </div>
        </div>
      </div>
    `;

    if (window.lucide) window.lucide.createIcons({ root: container });
    this.initEvents(container);
  },

  initEvents(container) {
    const dropzone = container.querySelector('#blurimg-dropzone');
    const resetBtn = container.querySelector('#blurimg-reset-btn');
    const downloadBtn = container.querySelector('#blurimg-download-btn');
    const modeChips = container.querySelectorAll('#blurimg-mode-chips .chip-btn');
    const intensitySlider = container.querySelector('#blurimg-intensity-slider');
    const intensityVal = container.querySelector('#blurimg-intensity-val');
    const intensityPresets = container.querySelectorAll('#blurimg-intensity-presets .chip-btn');
    const brushPanel = container.querySelector('#blurimg-brush-panel');
    const brushTools = container.querySelectorAll('#blurimg-brush-tools .chip-btn');
    const sizeSlider = container.querySelector('#blurimg-size-slider');
    const sizeVal = container.querySelector('#blurimg-size-val');
    const invertCheck = container.querySelector('#blurimg-invert-check');
    const clearBrushBtn = container.querySelector('#blurimg-clear-brush-btn');
    const hint = container.querySelector('#blurimg-hint');

    setupDropzone(dropzone, async (files) => {
      if (!files.length) return;
      try {
        const item = await loadImageFromFile(files[0]);
        this.imageItem = item;
        container.querySelector('#blurimg-dropzone').style.display = 'none';
        container.querySelector('#blurimg-workspace').style.display = 'grid';
        container.querySelector('#blurimg-reset-btn').style.display = 'inline-flex';
        container.querySelector('#blurimg-download-btn').disabled = false;

        this.setupCanvases(container);
      } catch (err) {
        Toast.error('Could not load image');
      }
    });

    modeChips.forEach(btn => {
      btn.addEventListener('click', () => {
        modeChips.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.mode = btn.dataset.mode;

        if (this.mode === 'brush') {
          brushPanel.style.display = 'flex';
          hint.textContent = 'Click & drag the brush over the image to selectively paint blur.';
        } else {
          brushPanel.style.display = 'none';
          hint.textContent = 'Adjust the blur intensity slider to blur the whole image.';
        }
        this.renderComposite(container);
      });
    });

    intensitySlider.addEventListener('input', (e) => {
      this.blurIntensity = parseInt(e.target.value);
      intensityVal.textContent = `${this.blurIntensity}px`;
      intensityPresets.forEach(b => b.classList.remove('active'));
      this.updateBlurredBuffer();
      this.renderComposite(container);
    });

    intensityPresets.forEach(btn => {
      btn.addEventListener('click', () => {
        intensityPresets.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const val = parseInt(btn.dataset.intensity);
        this.blurIntensity = val;
        intensitySlider.value = val;
        intensityVal.textContent = `${val}px`;
        this.updateBlurredBuffer();
        this.renderComposite(container);
      });
    });

    brushTools.forEach(btn => {
      btn.addEventListener('click', () => {
        brushTools.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.brushTool = btn.dataset.tool;
      });
    });

    sizeSlider.addEventListener('input', (e) => {
      this.brushSize = parseInt(e.target.value);
      sizeVal.textContent = `${this.brushSize}px`;
    });

    invertCheck.addEventListener('change', (e) => {
      this.invertMask = e.target.checked;
      this.renderComposite(container);
    });

    clearBrushBtn.addEventListener('click', () => {
      if (this.maskCanvas) {
        const mCtx = this.maskCanvas.getContext('2d');
        mCtx.clearRect(0, 0, this.maskCanvas.width, this.maskCanvas.height);
        this.renderComposite(container);
        Toast.info('Brush strokes cleared');
      }
    });

    downloadBtn.addEventListener('click', async () => {
      if (!this.displayCanvas) return;
      const blob = await canvasToBlob(this.displayCanvas, 'image/png', 0.95);
      downloadBlob(blob, `blurred_${this.imageItem.baseName}.png`);
      Toast.success('Blurred image saved!');
    });

    resetBtn.addEventListener('click', () => {
      this.imageItem = null;
      this.maskCanvas = null;
      this.blurCanvas = null;
      this.render(container);
    });

    this.setupPaintingEvents(container);
  },

  setupCanvases(container) {
    const w = this.imageItem.width;
    const h = this.imageItem.height;

    // Display Canvas
    this.displayCanvas = container.querySelector('#blurimg-display-canvas');
    this.displayCanvas.width = w;
    this.displayCanvas.height = h;

    // Cursor Canvas
    const cursorC = container.querySelector('#blurimg-cursor-canvas');
    cursorC.width = w;
    cursorC.height = h;

    // Mask Canvas (for selective brush)
    this.maskCanvas = document.createElement('canvas');
    this.maskCanvas.width = w;
    this.maskCanvas.height = h;

    // Blur Buffer Canvas
    this.blurCanvas = document.createElement('canvas');
    this.blurCanvas.width = w;
    this.blurCanvas.height = h;

    this.updateBlurredBuffer();
    this.renderComposite(container);
  },

  updateBlurredBuffer() {
    if (!this.imageItem || !this.blurCanvas) return;
    const bCtx = this.blurCanvas.getContext('2d');
    bCtx.clearRect(0, 0, this.blurCanvas.width, this.blurCanvas.height);
    bCtx.filter = `blur(${this.blurIntensity}px)`;
    bCtx.drawImage(this.imageItem.imgElement, 0, 0);
    bCtx.filter = 'none';
  },

  renderComposite(container) {
    if (!this.displayCanvas || !this.imageItem) return;
    const ctx = this.displayCanvas.getContext('2d');
    const w = this.displayCanvas.width;
    const h = this.displayCanvas.height;

    ctx.clearRect(0, 0, w, h);

    if (this.mode === 'whole') {
      // 1. Draw blurred version across whole image
      ctx.drawImage(this.blurCanvas, 0, 0);
    } else {
      // Custom Brush Mode
      if (!this.invertMask) {
        // Base is sharp, brushed areas are blurred
        ctx.drawImage(this.imageItem.imgElement, 0, 0);

        // Draw blurred layer masked by maskCanvas
        const tempC = document.createElement('canvas');
        tempC.width = w;
        tempC.height = h;
        const tCtx = tempC.getContext('2d');
        tCtx.drawImage(this.blurCanvas, 0, 0);
        tCtx.globalCompositeOperation = 'destination-in';
        tCtx.drawImage(this.maskCanvas, 0, 0);

        ctx.drawImage(tempC, 0, 0);
      } else {
        // Inverted: Base is blurred, brushed areas remain sharp (background defocus)
        ctx.drawImage(this.blurCanvas, 0, 0);

        const tempC = document.createElement('canvas');
        tempC.width = w;
        tempC.height = h;
        const tCtx = tempC.getContext('2d');
        tCtx.drawImage(this.imageItem.imgElement, 0, 0);
        tCtx.globalCompositeOperation = 'destination-in';
        tCtx.drawImage(this.maskCanvas, 0, 0);

        ctx.drawImage(tempC, 0, 0);
      }
    }
  },

  setupPaintingEvents(container) {
    const displayC = container.querySelector('#blurimg-display-canvas');
    const cursorC = container.querySelector('#blurimg-cursor-canvas');

    const getPos = (e) => {
      const rect = displayC.getBoundingClientRect();
      const scaleX = displayC.width / rect.width;
      const scaleY = displayC.height / rect.height;
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY
      };
    };

    const drawBrushCursor = (pos) => {
      if (!cursorC || this.mode !== 'brush') return;
      const cCtx = cursorC.getContext('2d');
      cCtx.clearRect(0, 0, cursorC.width, cursorC.height);
      if (!pos) return;

      cCtx.save();
      cCtx.beginPath();
      cCtx.arc(pos.x, pos.y, this.brushSize / 2, 0, Math.PI * 2);
      cCtx.strokeStyle = this.brushTool === 'blur' ? '#06b6d4' : '#ef4444';
      cCtx.lineWidth = 2;
      cCtx.stroke();
      cCtx.restore();
    };

    const paintStroke = (pos) => {
      if (!this.maskCanvas || this.mode !== 'brush') return;
      const mCtx = this.maskCanvas.getContext('2d');
      mCtx.save();
      mCtx.lineCap = 'round';
      mCtx.lineJoin = 'round';
      mCtx.lineWidth = this.brushSize;

      if (this.brushTool === 'blur') {
        mCtx.globalCompositeOperation = 'source-over';
        mCtx.strokeStyle = '#ffffff';
        mCtx.fillStyle = '#ffffff';
      } else {
        mCtx.globalCompositeOperation = 'destination-out';
      }

      if (this.lastPos) {
        mCtx.beginPath();
        mCtx.moveTo(this.lastPos.x, this.lastPos.y);
        mCtx.lineTo(pos.x, pos.y);
        mCtx.stroke();
      } else {
        mCtx.beginPath();
        mCtx.arc(pos.x, pos.y, this.brushSize / 2, 0, Math.PI * 2);
        mCtx.fill();
      }
      mCtx.restore();
      this.lastPos = pos;
      this.renderComposite(container);
    };

    displayC.addEventListener('mousedown', (e) => {
      if (this.mode !== 'brush') return;
      this.isPainting = true;
      const pos = getPos(e);
      paintStroke(pos);
    });

    window.addEventListener('mousemove', (e) => {
      if (!displayC) return;
      const pos = getPos(e);
      drawBrushCursor(pos);

      if (this.isPainting && this.mode === 'brush') {
        paintStroke(pos);
      }
    });

    window.addEventListener('mouseup', () => {
      this.isPainting = false;
      this.lastPos = null;
    });

    displayC.addEventListener('mouseleave', () => {
      drawBrushCursor(null);
    });
  }
};
