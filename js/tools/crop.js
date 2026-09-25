/**
 * Crop IMAGE Tool — Precision Interactive Single-Canvas Editor
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
  dragHandle: null, // 'move', 'nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w', 'create'
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
        <div class="dropzone-desc">Drag the crop box, use corner/edge handles, or type exact pixel dimensions</div>
        <button type="button" class="dropzone-btn"><i data-lucide="upload" style="width: 18px; height: 18px;"></i> Select Image</button>
      </div>

      <!-- Editor Layout -->
      <div id="crop-workspace" class="editor-layout" style="display:none;">
        <div class="viewport-card" style="align-items: center; justify-content: center; user-select: none;">
          <div id="crop-canvas-wrapper" style="position: relative; display: inline-block; max-width: 100%;">
            <canvas id="crop-canvas" style="display: block; max-width: 100%; max-height: 520px; border-radius: var(--radius-md); box-shadow: 0 4px 20px rgba(0,0,0,0.08);"></canvas>
          </div>
          <div style="margin-top: 0.75rem; font-size: 0.8rem; color: var(--text-muted); text-align: center;">
            Drag inside box to move • Drag handles to resize • Drag outside to draw a new crop box
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
                <input type="number" id="crop-w-input" class="text-input" value="400" min="20">
              </div>
              <div class="control-row">
                <label class="control-label">Height (px)</label>
                <input type="number" id="crop-h-input" class="text-input" value="300" min="20">
              </div>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; margin-top: 0.5rem;">
              <div class="control-row">
                <label class="control-label">Pos X (px)</label>
                <input type="number" id="crop-x-input" class="text-input" value="50" min="0">
              </div>
              <div class="control-row">
                <label class="control-label">Pos Y (px)</label>
                <input type="number" id="crop-y-input" class="text-input" value="50" min="0">
              </div>
            </div>
          </div>

          <div class="settings-group">
            <button id="crop-center-btn" class="btn-secondary" style="width: 100%; justify-content: center; margin-bottom: 0.5rem;">
              <i data-lucide="crosshair" style="width: 15px; height: 15px;"></i> Center Selection
            </button>
            <button id="crop-maximize-btn" class="btn-secondary" style="width: 100%; justify-content: center;">
              <i data-lucide="maximize" style="width: 15px; height: 15px;"></i> Select Entire Image
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
    const maxBtn = container.querySelector('#crop-maximize-btn');
    const canvas = container.querySelector('#crop-canvas');

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
        this.clampCropRect();
        this.drawCanvas(container);
        this.updateInputs(container);
      });
    });

    [inpW, inpH, inpX, inpY].forEach(inp => {
      inp.addEventListener('input', () => {
        if (!this.imageItem) return;
        const w = Math.max(20, Math.min(this.imageItem.width, parseInt(inpW.value) || 20));
        const h = Math.max(20, Math.min(this.imageItem.height, parseInt(inpH.value) || 20));
        const x = Math.max(0, Math.min(this.imageItem.width - w, parseInt(inpX.value) || 0));
        const y = Math.max(0, Math.min(this.imageItem.height - h, parseInt(inpY.value) || 0));

        this.cropRect = { x, y, w, h };
        if (this.aspectRatioPreset !== 'free') {
          this.applyAspectRatio();
        }
        this.clampCropRect();
        this.drawCanvas(container);
      });
    });

    centerBtn.addEventListener('click', () => {
      if (!this.imageItem) return;
      this.cropRect.x = Math.round((this.imageItem.width - this.cropRect.w) / 2);
      this.cropRect.y = Math.round((this.imageItem.height - this.cropRect.h) / 2);
      this.clampCropRect();
      this.drawCanvas(container);
      this.updateInputs(container);
    });

    maxBtn.addEventListener('click', () => {
      if (!this.imageItem) return;
      this.cropRect = {
        x: 0,
        y: 0,
        w: this.imageItem.width,
        h: this.imageItem.height
      };
      if (this.aspectRatioPreset !== 'free') {
        this.applyAspectRatio();
      }
      this.clampCropRect();
      this.drawCanvas(container);
      this.updateInputs(container);
    });

    this.setupPointerEvents(canvas, container);

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

    const canvas = container.querySelector('#crop-canvas');
    canvas.width = this.imageItem.width;
    canvas.height = this.imageItem.height;

    // Initial crop rect: 75% centered
    const cw = Math.round(this.imageItem.width * 0.75);
    const ch = Math.round(this.imageItem.height * 0.75);
    this.cropRect = {
      w: cw,
      h: ch,
      x: Math.round((this.imageItem.width - cw) / 2),
      y: Math.round((this.imageItem.height - ch) / 2)
    };

    if (this.aspectRatioPreset !== 'free') {
      this.applyAspectRatio();
    }
    this.clampCropRect();

    this.drawCanvas(container);
    this.updateInputs(container);
  },

  applyAspectRatio() {
    if (this.aspectRatioPreset === 'free' || !this.imageItem) return;
    const [rw, rh] = this.aspectRatioPreset.split(':').map(Number);
    const targetRatio = rw / rh;

    let newH = Math.round(this.cropRect.w / targetRatio);
    if (newH > this.imageItem.height) {
      newH = this.imageItem.height;
      this.cropRect.w = Math.round(newH * targetRatio);
    }
    this.cropRect.h = newH;
  },

  clampCropRect() {
    if (!this.imageItem) return;
    const r = this.cropRect;
    r.w = Math.max(20, Math.min(this.imageItem.width, r.w));
    r.h = Math.max(20, Math.min(this.imageItem.height, r.h));
    r.x = Math.max(0, Math.min(this.imageItem.width - r.w, r.x));
    r.y = Math.max(0, Math.min(this.imageItem.height - r.h, r.y));
  },

  updateInputs(container) {
    container.querySelector('#crop-w-input').value = Math.round(this.cropRect.w);
    container.querySelector('#crop-h-input').value = Math.round(this.cropRect.h);
    container.querySelector('#crop-x-input').value = Math.round(this.cropRect.x);
    container.querySelector('#crop-y-input').value = Math.round(this.cropRect.y);
  },

  drawCanvas(container) {
    const canvas = container.querySelector('#crop-canvas');
    if (!canvas || !this.imageItem) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;

    // 1. Draw base image
    ctx.drawImage(this.imageItem.imgElement, 0, 0);

    // 2. Draw darkened overlay outside crop area
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(0, 0, w, h);

    const r = this.cropRect;

    // 3. Clear crop window and redraw the crisp unmasked original image inside
    ctx.save();
    ctx.beginPath();
    ctx.rect(r.x, r.y, r.w, r.h);
    ctx.clip();
    ctx.drawImage(this.imageItem.imgElement, 0, 0);
    ctx.restore();

    // 4. Crop boundary stroke
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = Math.max(2, Math.round(Math.min(w, h) * 0.003));
    ctx.strokeRect(r.x, r.y, r.w, r.h);

    // 5. Rule of thirds grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
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

    // 6. Draw 8 Handles (Corners + Midpoints)
    const handleSize = Math.max(12, Math.round(Math.min(w, h) * 0.016));
    ctx.fillStyle = '#3b82f6';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;

    const handles = [
      [r.x, r.y],                             // nw
      [r.x + r.w / 2, r.y],                   // n
      [r.x + r.w, r.y],                       // ne
      [r.x + r.w, r.y + r.h / 2],             // e
      [r.x + r.w, r.y + r.h],                 // se
      [r.x + r.w / 2, r.y + r.h],             // s
      [r.x, r.y + r.h],                       // sw
      [r.x, r.y + r.h / 2]                    // w
    ];

    handles.forEach(([hx, hy]) => {
      ctx.fillRect(hx - handleSize / 2, hy - handleSize / 2, handleSize, handleSize);
      ctx.strokeRect(hx - handleSize / 2, hy - handleSize / 2, handleSize, handleSize);
    });
  },

  setupPointerEvents(canvas, container) {
    const getCanvasPos = (e) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY
      };
    };

    const getHandle = (x, y) => {
      const r = this.cropRect;
      const rect = canvas.getBoundingClientRect();
      // Tolerance in screen pixels converted to canvas scale
      const tol = Math.max(16, (canvas.width / rect.width) * 16);

      // Corners
      if (Math.hypot(x - r.x, y - r.y) < tol) return 'nw';
      if (Math.hypot(x - (r.x + r.w), y - r.y) < tol) return 'ne';
      if (Math.hypot(x - r.x, y - (r.y + r.h)) < tol) return 'sw';
      if (Math.hypot(x - (r.x + r.w), y - (r.y + r.h)) < tol) return 'se';

      // Edges
      if (Math.hypot(x - (r.x + r.w / 2), y - r.y) < tol) return 'n';
      if (Math.hypot(x - (r.x + r.w / 2), y - (r.y + r.h)) < tol) return 's';
      if (Math.hypot(x - r.x, y - (r.y + r.h / 2)) < tol) return 'w';
      if (Math.hypot(x - (r.x + r.w), y - (r.y + r.h / 2)) < tol) return 'e';

      // Move inside
      if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return 'move';

      return 'create';
    };

    const updateCursor = (handle) => {
      const cursorMap = {
        'nw': 'nwse-resize', 'se': 'nwse-resize',
        'ne': 'nesw-resize', 'sw': 'nesw-resize',
        'n': 'ns-resize', 's': 'ns-resize',
        'e': 'ew-resize', 'w': 'ew-resize',
        'move': 'move',
        'create': 'crosshair'
      };
      canvas.style.cursor = cursorMap[handle] || 'default';
    };

    canvas.addEventListener('pointerdown', (e) => {
      if (!this.imageItem) return;
      const pos = getCanvasPos(e);
      const handle = getHandle(pos.x, pos.y);

      this.isDragging = true;
      this.dragHandle = handle;
      this.dragStart = pos;
      this.rectStart = { ...this.cropRect };

      if (handle === 'create') {
        this.cropRect = { x: pos.x, y: pos.y, w: 1, h: 1 };
      }

      canvas.setPointerCapture(e.pointerId);
      updateCursor(handle);
    });

    canvas.addEventListener('pointermove', (e) => {
      if (!this.imageItem) return;
      const pos = getCanvasPos(e);

      if (!this.isDragging) {
        const handle = getHandle(pos.x, pos.y);
        updateCursor(handle);
        return;
      }

      const dx = pos.x - this.dragStart.x;
      const dy = pos.y - this.dragStart.y;
      const imgW = this.imageItem.width;
      const imgH = this.imageItem.height;

      if (this.dragHandle === 'move') {
        this.cropRect.x = Math.max(0, Math.min(imgW - this.rectStart.w, this.rectStart.x + dx));
        this.cropRect.y = Math.max(0, Math.min(imgH - this.rectStart.h, this.rectStart.y + dy));
      } else if (this.dragHandle === 'create') {
        const x1 = Math.max(0, Math.min(imgW, Math.min(this.dragStart.x, pos.x)));
        const y1 = Math.max(0, Math.min(imgH, Math.min(this.dragStart.y, pos.y)));
        const x2 = Math.max(0, Math.min(imgW, Math.max(this.dragStart.x, pos.x)));
        const y2 = Math.max(0, Math.min(imgH, Math.max(this.dragStart.y, pos.y)));
        this.cropRect.x = Math.round(x1);
        this.cropRect.y = Math.round(y1);
        this.cropRect.w = Math.max(20, Math.round(x2 - x1));
        this.cropRect.h = Math.max(20, Math.round(y2 - y1));
        if (this.aspectRatioPreset !== 'free') {
          this.applyAspectRatio();
        }
      } else {
        // Resizing handles
        let { x, y, w, h } = this.rectStart;

        if (this.dragHandle.includes('e')) {
          w = Math.max(20, Math.min(imgW - x, this.rectStart.w + dx));
        }
        if (this.dragHandle.includes('s')) {
          h = Math.max(20, Math.min(imgH - y, this.rectStart.h + dy));
        }
        if (this.dragHandle.includes('w')) {
          const maxLeftShift = this.rectStart.w - 20;
          const shift = Math.max(-this.rectStart.x, Math.min(maxLeftShift, dx));
          x = this.rectStart.x + shift;
          w = this.rectStart.w - shift;
        }
        if (this.dragHandle.includes('n')) {
          const maxTopShift = this.rectStart.h - 20;
          const shift = Math.max(-this.rectStart.y, Math.min(maxTopShift, dy));
          y = this.rectStart.y + shift;
          h = this.rectStart.h - shift;
        }

        this.cropRect = { x, y, w, h };
        if (this.aspectRatioPreset !== 'free') {
          this.applyAspectRatio();
        }
      }

      this.clampCropRect();
      this.drawCanvas(container);
      this.updateInputs(container);
    });

    const endDrag = (e) => {
      if (this.isDragging) {
        this.isDragging = false;
        this.dragHandle = null;
        try { canvas.releasePointerCapture(e.pointerId); } catch (_) {}
        this.clampCropRect();
        this.drawCanvas(container);
        this.updateInputs(container);
      }
    };

    canvas.addEventListener('pointerup', endDrag);
    canvas.addEventListener('pointercancel', endDrag);
  },

  async executeCrop() {
    if (!this.imageItem) return;
    const r = this.cropRect;
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(r.w);
    canvas.height = Math.round(r.h);
    const ctx = canvas.getContext('2d');

    // Crop precisely from natural image coordinates
    ctx.drawImage(
      this.imageItem.imgElement,
      Math.round(r.x),
      Math.round(r.y),
      Math.round(r.w),
      Math.round(r.h),
      0,
      0,
      Math.round(r.w),
      Math.round(r.h)
    );

    const outType = this.imageItem.type === 'image/png' ? 'image/png' : 'image/jpeg';
    const blob = await canvasToBlob(canvas, outType, 0.95);
    downloadBlob(blob, `cropped_${this.imageItem.name}`);
    Toast.success('Cropped image saved successfully!');
  }
};
