/**
 * Crop IMAGE Tool
 */
import { setupDropzone, loadImageFromFile, downloadBlob } from '../utils/file-loader.js';
import { canvasToBlob } from '../utils/canvas-helper.js';
import { Toast } from '../utils/toast.js';

export const CropTool = {
  id: 'crop',
  name: 'Crop IMAGE',
  category: 'edit',
  description: 'Crop JPG, PNG, or GIFs with ease; Choose pixels to define your rectangle or use our visual editor.',

  imageItem: null,
  cropRect: { x: 50, y: 50, w: 400, h: 300 },
  aspectRatioPreset: 'free', // 'free', '1:1', '4:3', '16:9', '9:16'
  isDragging: false,
  dragHandle: null, // 'move', 'nw', 'ne', 'sw', 'se'
  dragStart: { x: 0, y: 0 },
  rectStart: { x: 0, y: 0, w: 0, h: 0 },

  render(container) {
    container.innerHTML = `
      <div class="workspace-header">
        <div class="workspace-header-left">
          <a href="#/" class="back-btn"><i data-lucide="arrow-left" style="width: 16px; height: 16px;"></i> All Tools</a>
          <div class="workspace-title-wrap">
            <h2>Crop IMAGE</h2>
          </div>
        </div>
        <div class="workspace-header-right">
          <button id="crop-reset-btn" class="btn-secondary" style="display:none;"><i data-lucide="refresh-cw" style="width: 15px; height: 15px;"></i> New Image</button>
          <button id="crop-exec-btn" class="btn-primary btn-emerald" disabled><i data-lucide="crop" style="width: 16px; height: 16px;"></i> Crop & Download</button>
        </div>
      </div>

      <!-- Dropzone -->
      <div id="crop-dropzone" class="dropzone-container">
        <div class="dropzone-icon" style="background: var(--accent-blue-bg); color: var(--accent-blue);">
          <i data-lucide="crop" style="width: 32px; height: 32px;"></i>
        </div>
        <div class="dropzone-title">Select an Image to Crop</div>
        <div class="dropzone-desc">Choose pixels to define your rectangle or use the visual interactive editor</div>
        <button type="button" class="dropzone-btn"><i data-lucide="upload" style="width: 18px; height: 18px;"></i> Select Image</button>
      </div>

      <!-- Editor Layout -->
      <div id="crop-workspace" class="editor-layout" style="display:none;">
        <div class="viewport-card" style="align-items: center; justify-content: center; user-select: none;">
          <div id="crop-canvas-wrapper" style="position: relative; display: inline-block; cursor: crosshair; max-width: 100%;">
            <canvas id="crop-main-canvas" style="display: block; max-width: 100%; max-height: 520px;"></canvas>
            <canvas id="crop-overlay-canvas" style="position: absolute; top: 0; left: 0; pointer-events: auto;"></canvas>
          </div>
        </div>

        <div class="settings-panel">
          <div class="settings-group">
            <h4>Aspect Ratio</h4>
            <div class="chip-group" id="crop-ratios">
              <button class="chip-btn active" data-ratio="free">Freeform</button>
              <button class="chip-btn" data-ratio="1:1">1:1 (Square)</button>
              <button class="chip-btn" data-ratio="4:3">4:3</button>
              <button class="chip-btn" data-ratio="16:9">16:9</button>
              <button class="chip-btn" data-ratio="9:16">9:16 (Story)</button>
            </div>
          </div>

          <div class="settings-group">
            <h4>Crop Dimensions</h4>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem;">
              <div class="control-row">
                <label class="control-label">Width (px)</label>
                <input type="number" id="crop-w-input" class="text-input" value="400">
              </div>
              <div class="control-row">
                <label class="control-label">Height (px)</label>
                <input type="number" id="crop-h-input" class="text-input" value="300">
              </div>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem;">
              <div class="control-row">
                <label class="control-label">Pos X (px)</label>
                <input type="number" id="crop-x-input" class="text-input" value="50">
              </div>
              <div class="control-row">
                <label class="control-label">Pos Y (px)</label>
                <input type="number" id="crop-y-input" class="text-input" value="50">
              </div>
            </div>
          </div>

          <div class="settings-group">
            <button id="crop-center-btn" class="btn-secondary" style="width: 100%; justify-content: center;">
              <i data-lucide="crosshair" style="width: 15px; height: 15px;"></i> Center Selection
            </button>
          </div>
        </div>
      </div>
    `;

    if (window.lucide) window.lucide.createIcons({ root: container });
    this.initEvents(container);
  },

  initEvents(container) {
    const dropzone = container.querySelector('#crop-dropzone');
    const resetBtn = container.querySelector('#crop-reset-btn');
    const execBtn = container.querySelector('#crop-exec-btn');
    const ratioBtns = container.querySelectorAll('#crop-ratios .chip-btn');
    const centerBtn = container.querySelector('#crop-center-btn');
    const overlay = container.querySelector('#crop-overlay-canvas');

    const inpW = container.querySelector('#crop-w-input');
    const inpH = container.querySelector('#crop-h-input');
    const inpX = container.querySelector('#crop-x-input');
    const inpY = container.querySelector('#crop-y-input');

    setupDropzone(dropzone, async (files) => {
      if (!files.length) return;
      try {
        const item = await loadImageFromFile(files[0]);
        this.imageItem = item;
        this.setupCropWorkspace(container);
      } catch (err) {
        Toast.error('Could not load image');
      }
    });

    ratioBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        ratioBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.aspectRatioPreset = btn.dataset.ratio;
        this.applyAspectRatio();
        this.drawOverlay(container);
        this.updateInputs(container);
      });
    });

    [inpW, inpH, inpX, inpY].forEach(inp => {
      inp.addEventListener('input', () => {
        this.cropRect.w = parseInt(inpW.value) || 50;
        this.cropRect.h = parseInt(inpH.value) || 50;
        this.cropRect.x = parseInt(inpX.value) || 0;
        this.cropRect.y = parseInt(inpY.value) || 0;
        this.drawOverlay(container);
      });
    });

    centerBtn.addEventListener('click', () => {
      if (!this.imageItem) return;
      this.cropRect.x = Math.round((this.imageItem.width - this.cropRect.w) / 2);
      this.cropRect.y = Math.round((this.imageItem.height - this.cropRect.h) / 2);
      this.drawOverlay(container);
      this.updateInputs(container);
    });

    // Interactive mouse drag on overlay
    this.setupMouseEvents(overlay, container);

    execBtn.addEventListener('click', () => this.executeCrop());
    resetBtn.addEventListener('click', () => {
      this.imageItem = null;
      this.render(container);
    });
  },

  setupCropWorkspace(container) {
    container.querySelector('#crop-dropzone').style.display = 'none';
    container.querySelector('#crop-workspace').style.display = 'grid';
    container.querySelector('#crop-reset-btn').style.display = 'inline-flex';
    container.querySelector('#crop-exec-btn').disabled = false;

    const mainCanvas = container.querySelector('#crop-main-canvas');
    const overlayCanvas = container.querySelector('#crop-overlay-canvas');

    mainCanvas.width = this.imageItem.width;
    mainCanvas.height = this.imageItem.height;
    const ctx = mainCanvas.getContext('2d');
    ctx.drawImage(this.imageItem.imgElement, 0, 0);

    overlayCanvas.width = this.imageItem.width;
    overlayCanvas.height = this.imageItem.height;

    // Initial crop rect: 70% centered
    const cw = Math.round(this.imageItem.width * 0.7);
    const ch = Math.round(this.imageItem.height * 0.7);
    this.cropRect = {
      w: cw,
      h: ch,
      x: Math.round((this.imageItem.width - cw) / 2),
      y: Math.round((this.imageItem.height - ch) / 2)
    };

    this.drawOverlay(container);
    this.updateInputs(container);
  },

  applyAspectRatio() {
    if (this.aspectRatioPreset === 'free') return;
    const [rw, rh] = this.aspectRatioPreset.split(':').map(Number);
    const targetRatio = rw / rh;
    this.cropRect.h = Math.round(this.cropRect.w / targetRatio);
  },

  updateInputs(container) {
    container.querySelector('#crop-w-input').value = Math.round(this.cropRect.w);
    container.querySelector('#crop-h-input').value = Math.round(this.cropRect.h);
    container.querySelector('#crop-x-input').value = Math.round(this.cropRect.x);
    container.querySelector('#crop-y-input').value = Math.round(this.cropRect.y);
  },

  drawOverlay(container) {
    const overlay = container.querySelector('#crop-overlay-canvas');
    if (!overlay) return;
    const ctx = overlay.getContext('2d');
    const w = overlay.width;
    const h = overlay.height;

    ctx.clearRect(0, 0, w, h);

    // Dark semi-transparent mask outside crop area
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.fillRect(0, 0, w, h);

    const r = this.cropRect;
    // Clear crop window
    ctx.clearRect(r.x, r.y, r.w, r.h);

    // Border
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2;
    ctx.strokeRect(r.x, r.y, r.w, r.h);

    // Rule of thirds grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(r.x + r.w / 3, r.y);
    ctx.lineTo(r.x + r.w / 3, r.y + r.h);
    ctx.moveTo(r.x + (2 * r.w) / 3, r.y);
    ctx.lineTo(r.x + (2 * r.w) / 3, r.y + r.h);
    ctx.moveTo(r.x, r.y + r.h / 3);
    ctx.lineTo(r.x + r.w, r.y + r.h / 3);
    ctx.moveTo(r.x, r.y + (2 * r.h) / 3);
    ctx.lineTo(r.x + r.w, r.y + (2 * r.h) / 3);
    ctx.stroke();

    // Corner Handles
    const handleSize = 14;
    ctx.fillStyle = '#3b82f6';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;

    const corners = [
      [r.x, r.y],
      [r.x + r.w, r.y],
      [r.x, r.y + r.h],
      [r.x + r.w, r.y + r.h]
    ];

    corners.forEach(([cx, cy]) => {
      ctx.fillRect(cx - handleSize / 2, cy - handleSize / 2, handleSize, handleSize);
      ctx.strokeRect(cx - handleSize / 2, cy - handleSize / 2, handleSize, handleSize);
    });
  },

  setupMouseEvents(overlay, container) {
    const getCanvasPos = (e) => {
      const rect = overlay.getBoundingClientRect();
      const scaleX = overlay.width / rect.width;
      const scaleY = overlay.height / rect.height;
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY
      };
    };

    const getHandle = (x, y) => {
      const r = this.cropRect;
      const tol = 24;
      if (Math.hypot(x - r.x, y - r.y) < tol) return 'nw';
      if (Math.hypot(x - (r.x + r.w), y - r.y) < tol) return 'ne';
      if (Math.hypot(x - r.x, y - (r.y + r.h)) < tol) return 'sw';
      if (Math.hypot(x - (r.x + r.w), y - (r.y + r.h)) < tol) return 'se';
      if (x > r.x && x < r.x + r.w && y > r.y && y < r.y + r.h) return 'move';
      return null;
    };

    overlay.addEventListener('mousedown', (e) => {
      const pos = getCanvasPos(e);
      const handle = getHandle(pos.x, pos.y);
      if (handle) {
        this.isDragging = true;
        this.dragHandle = handle;
        this.dragStart = pos;
        this.rectStart = { ...this.cropRect };
      }
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.isDragging) return;
      const pos = getCanvasPos(e);
      const dx = pos.x - this.dragStart.x;
      const dy = pos.y - this.dragStart.y;

      if (this.dragHandle === 'move') {
        this.cropRect.x = Math.max(0, Math.min(overlay.width - this.cropRect.w, this.rectStart.x + dx));
        this.cropRect.y = Math.max(0, Math.min(overlay.height - this.cropRect.h, this.rectStart.y + dy));
      } else if (this.dragHandle === 'se') {
        this.cropRect.w = Math.max(40, Math.min(overlay.width - this.cropRect.x, this.rectStart.w + dx));
        if (this.aspectRatioPreset !== 'free') {
          this.applyAspectRatio();
        } else {
          this.cropRect.h = Math.max(40, Math.min(overlay.height - this.cropRect.y, this.rectStart.h + dy));
        }
      }

      this.drawOverlay(container);
      this.updateInputs(container);
    });

    window.addEventListener('mouseup', () => {
      this.isDragging = false;
      this.dragHandle = null;
    });
  },

  async executeCrop() {
    if (!this.imageItem) return;
    const r = this.cropRect;
    const canvas = document.createElement('canvas');
    canvas.width = r.w;
    canvas.height = r.h;
    const ctx = canvas.getContext('2d');

    ctx.drawImage(this.imageItem.imgElement, r.x, r.y, r.w, r.h, 0, 0, r.w, r.h);

    const outType = this.imageItem.type === 'image/png' ? 'image/png' : 'image/jpeg';
    const blob = await canvasToBlob(canvas, outType, 0.95);
    downloadBlob(blob, `cropped_${this.imageItem.name}`);
    Toast.success('Cropped image saved successfully!');
  }
};
