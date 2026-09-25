/**
 * Rotate IMAGE Tool — Interactive Visual Playground
 */
import { setupDropzone, loadImageFromFile, downloadBlob } from '../utils/file-loader.js';
import { canvasToBlob } from '../utils/canvas-helper.js';
import { exportFilesAsZip } from '../utils/zip-export.js';
import { Toast } from '../utils/toast.js';

export const RotateTool = {
  id: 'rotate',
  name: 'Rotate IMAGE',
  category: 'edit',
  description: 'Rotate many images JPG, PNG or GIF at same time. Choose to rotate only landscape or portrait images!',

  files: [],
  currentIndex: 0,
  angle: 0, // 0 to 360 or -180 to 180
  flipH: false,
  flipV: false,
  applyToAll: true,
  rotatedResults: [],

  render(container) {
    container.innerHTML = `
      <div class="workspace-header">
        <div class="workspace-header-left">
          <a href="#/" class="back-btn"><i data-lucide="arrow-left" style="width: 16px; height: 16px;"></i> All Tools</a>
          <div class="workspace-title-wrap">
            <h2>Rotate IMAGE</h2>
            <span id="rotate-count-badge" class="brand-badge" style="display:none;">0 images</span>
          </div>
        </div>
        <div class="workspace-header-right">
          <button id="rotate-reset-btn" class="btn-secondary" style="display:none;"><i data-lucide="refresh-cw" style="width: 15px; height: 15px;"></i> Clear</button>
          <button id="rotate-exec-btn" class="btn-primary btn-emerald" disabled><i data-lucide="download" style="width: 16px; height: 16px;"></i> Save Rotated</button>
          <button id="rotate-download-zip-btn" class="btn-primary btn-emerald" style="display:none;"><i data-lucide="download" style="width: 16px; height: 16px;"></i> Download All (ZIP)</button>
        </div>
      </div>

      <!-- Dropzone -->
      <div id="rotate-dropzone" class="dropzone-container">
        <div class="dropzone-icon" style="background: var(--accent-sky); color: #0284c7;">
          <i data-lucide="rotate-cw" style="width: 32px; height: 32px;"></i>
        </div>
        <div class="dropzone-title">Select Images to Rotate</div>
        <div class="dropzone-desc">Interactive visual playground to rotate 90°, 180°, custom angles, or flip horizontally & vertically</div>
        <button type="button" class="dropzone-btn" style="background: #0284c7;"><i data-lucide="upload" style="width: 18px; height: 18px;"></i> Select Images</button>
        <div class="dropzone-formats">Supports: JPG, PNG, WebP, GIF, SVG • Real-time live rotation playground</div>
      </div>

      <!-- Workspace -->
      <div id="rotate-workspace" class="editor-layout" style="display:none;">
        <div class="viewport-card" style="align-items: center; justify-content: center;">
          <div style="display: flex; justify-content: space-between; align-items: center; width: 100%; margin-bottom: 0.75rem;">
            <div style="font-size: 0.85rem; font-weight: 600; color: var(--text-primary);">
              Interactive Playground: <span id="rotate-active-name" style="color: var(--accent-blue);">image.jpg</span>
            </div>
            <span id="rotate-dims-badge" style="font-family: var(--font-mono); font-size: 0.8rem; background: var(--bg-subtle); padding: 3px 8px; border-radius: 4px; border: 1px solid var(--border-color);">1920 × 1080</span>
          </div>

          <div class="canvas-wrapper" style="position: relative; max-width: 100%; overflow: hidden; display: flex; justify-content: center; align-items: center; background: repeating-conic-gradient(#eee 0% 25%, #fff 0% 50%) 50% / 16px 16px; border-radius: var(--radius-md); padding: 1rem; border: 1px solid var(--border-color);">
            <canvas id="rotate-canvas" style="display: block; max-width: 100%; max-height: 480px; box-shadow: 0 4px 20px rgba(0,0,0,0.15); border-radius: 4px; transition: transform 0.1s ease-out;"></canvas>
          </div>

          <!-- Thumbnails Strip (if multiple files loaded) -->
          <div id="rotate-thumb-strip" style="display: none; width: 100%; margin-top: 1rem; overflow-x: auto; gap: 0.5rem; padding-bottom: 4px;"></div>
        </div>

        <div class="settings-panel">
          <!-- 1. Quick 90 Degree Rotations -->
          <div class="settings-group">
            <h4>Quick Rotate</h4>
            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 0.5rem;">
              <button id="btn-rot-ccw" class="btn-secondary" style="justify-content: center; padding: 0.6rem 0.4rem; font-size: 0.8rem;">
                <i data-lucide="rotate-ccw" style="width:15px;height:15px;"></i> 90° Left
              </button>
              <button id="btn-rot-cw" class="btn-secondary" style="justify-content: center; padding: 0.6rem 0.4rem; font-size: 0.8rem;">
                <i data-lucide="rotate-cw" style="width:15px;height:15px;"></i> 90° Right
              </button>
              <button id="btn-rot-180" class="btn-secondary" style="justify-content: center; padding: 0.6rem 0.4rem; font-size: 0.8rem;">
                <i data-lucide="refresh-cw" style="width:15px;height:15px;"></i> 180°
              </button>
            </div>
          </div>

          <!-- 2. Flip Horizontally / Vertically -->
          <div class="settings-group">
            <h4>Flip Orientation</h4>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem;">
              <button id="flip-h-btn" class="chip-btn" style="justify-content: center;">
                <i data-lucide="flip-horizontal" style="width:15px;height:15px;"></i> Flip Horizontal
              </button>
              <button id="flip-v-btn" class="chip-btn" style="justify-content: center;">
                <i data-lucide="flip-vertical" style="width:15px;height:15px;"></i> Flip Vertical
              </button>
            </div>
          </div>

          <!-- 3. Fine Angle Slider -->
          <div class="settings-group">
            <div class="control-row">
              <div class="control-label">
                <span>Free Rotation Angle</span>
                <span id="rotate-angle-val" class="control-val">0°</span>
              </div>
              <input type="range" id="rotate-angle-slider" class="range-slider" min="-180" max="180" value="0">
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 0.5rem;">
              <span style="font-size: 0.75rem; color: var(--text-muted);">-180° to +180°</span>
              <button id="btn-reset-angle" style="font-size: 0.75rem; color: var(--accent-blue); text-decoration: underline; cursor: pointer;">
                Reset to 0°
              </button>
            </div>
          </div>

          <!-- 4. Batch Settings (if multiple files) -->
          <div id="rotate-batch-settings" class="settings-group" style="display: none;">
            <h4>Batch Settings</h4>
            <label style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.85rem; cursor: pointer;">
              <input type="checkbox" id="rotate-apply-all-checkbox" checked style="cursor: pointer; width: 16px; height: 16px;">
              <span>Apply this rotation to all <strong id="rotate-batch-total">0</strong> images</span>
            </label>
          </div>
        </div>
      </div>
    `;

    if (window.lucide) window.lucide.createIcons({ root: container });
    this.initEvents(container);
  },

  initEvents(container) {
    const dropzone = container.querySelector('#rotate-dropzone');
    const resetBtn = container.querySelector('#rotate-reset-btn');
    const execBtn = container.querySelector('#rotate-exec-btn');
    const zipBtn = container.querySelector('#rotate-download-zip-btn');

    const btnCcw = container.querySelector('#btn-rot-ccw');
    const btnCw = container.querySelector('#btn-rot-cw');
    const btn180 = container.querySelector('#btn-rot-180');
    const flipHBtn = container.querySelector('#flip-h-btn');
    const flipVBtn = container.querySelector('#flip-v-btn');
    const angleSlider = container.querySelector('#rotate-angle-slider');
    const angleVal = container.querySelector('#rotate-angle-val');
    const resetAngleBtn = container.querySelector('#btn-reset-angle');
    const applyAllCheckbox = container.querySelector('#rotate-apply-all-checkbox');

    setupDropzone(dropzone, async (files) => {
      for (const f of files) {
        if (!f.type.startsWith('image/')) continue;
        try {
          const item = await loadImageFromFile(f);
          this.files.push(item);
        } catch (err) {
          Toast.error(`Could not load ${f.name}`);
        }
      }

      if (this.files.length > 0) {
        container.querySelector('#rotate-dropzone').style.display = 'none';
        container.querySelector('#rotate-workspace').style.display = 'grid';
        container.querySelector('#rotate-reset-btn').style.display = 'inline-flex';
        container.querySelector('#rotate-count-badge').style.display = 'inline-block';
        container.querySelector('#rotate-count-badge').textContent = `${this.files.length} images`;
        container.querySelector('#rotate-exec-btn').disabled = false;

        if (this.files.length > 1) {
          container.querySelector('#rotate-batch-settings').style.display = 'block';
          container.querySelector('#rotate-batch-total').textContent = this.files.length;
          container.querySelector('#rotate-thumb-strip').style.display = 'flex';
          zipBtn.style.display = 'inline-flex';
        }

        this.renderThumbStrip(container);
        this.drawPlayground(container);
      }
    });

    btnCcw.addEventListener('click', () => {
      this.angle = (this.angle - 90) % 360;
      if (this.angle < -180) this.angle += 360;
      angleSlider.value = this.angle;
      angleVal.textContent = `${this.angle}°`;
      this.drawPlayground(container);
    });

    btnCw.addEventListener('click', () => {
      this.angle = (this.angle + 90) % 360;
      if (this.angle > 180) this.angle -= 360;
      angleSlider.value = this.angle;
      angleVal.textContent = `${this.angle}°`;
      this.drawPlayground(container);
    });

    btn180.addEventListener('click', () => {
      this.angle = (this.angle + 180) % 360;
      if (this.angle > 180) this.angle -= 360;
      angleSlider.value = this.angle;
      angleVal.textContent = `${this.angle}°`;
      this.drawPlayground(container);
    });

    flipHBtn.addEventListener('click', () => {
      this.flipH = !this.flipH;
      flipHBtn.classList.toggle('active', this.flipH);
      this.drawPlayground(container);
    });

    flipVBtn.addEventListener('click', () => {
      this.flipV = !this.flipV;
      flipVBtn.classList.toggle('active', this.flipV);
      this.drawPlayground(container);
    });

    angleSlider.addEventListener('input', (e) => {
      this.angle = parseInt(e.target.value);
      angleVal.textContent = `${this.angle}°`;
      this.drawPlayground(container);
    });

    resetAngleBtn.addEventListener('click', () => {
      this.angle = 0;
      this.flipH = false;
      this.flipV = false;
      angleSlider.value = 0;
      angleVal.textContent = '0°';
      flipHBtn.classList.remove('active');
      flipVBtn.classList.remove('active');
      this.drawPlayground(container);
    });

    if (applyAllCheckbox) {
      applyAllCheckbox.addEventListener('change', (e) => {
        this.applyToAll = e.target.checked;
      });
    }

    execBtn.addEventListener('click', () => this.executeRotate(container));
    zipBtn.addEventListener('click', () => this.downloadAllZip());
    resetBtn.addEventListener('click', () => this.reset(container));
  },

  renderThumbStrip(container) {
    const strip = container.querySelector('#rotate-thumb-strip');
    strip.innerHTML = '';

    this.files.forEach((file, idx) => {
      const thumb = document.createElement('div');
      thumb.style.cssText = `
        flex-shrink: 0;
        width: 60px;
        height: 60px;
        border-radius: 6px;
        overflow: hidden;
        border: 2px solid ${idx === this.currentIndex ? 'var(--accent-blue)' : 'var(--border-color)'};
        cursor: pointer;
        opacity: ${idx === this.currentIndex ? '1' : '0.6'};
        transition: all 0.15s ease;
      `;
      thumb.innerHTML = `<img src="${file.dataUrl}" style="width:100%; height:100%; object-fit:cover;">`;
      thumb.addEventListener('click', () => {
        this.currentIndex = idx;
        this.renderThumbStrip(container);
        this.drawPlayground(container);
      });
      strip.appendChild(thumb);
    });
  },

  drawPlayground(container) {
    if (!this.files.length) return;
    const item = this.files[this.currentIndex];
    const canvas = container.querySelector('#rotate-canvas');
    if (!item || !canvas) return;

    container.querySelector('#rotate-active-name').textContent = item.name;

    const rad = (this.angle * Math.PI) / 180;
    const sin = Math.abs(Math.sin(rad));
    const cos = Math.abs(Math.cos(rad));

    // Calculate bounding box so entire rotated image fits without clipping
    const targetW = Math.round(item.width * cos + item.height * sin);
    const targetH = Math.round(item.width * sin + item.height * cos);

    canvas.width = targetW;
    canvas.height = targetH;
    container.querySelector('#rotate-dims-badge').textContent = `${targetW} × ${targetH}`;

    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    ctx.save();
    ctx.translate(targetW / 2, targetH / 2);
    ctx.rotate(rad);
    ctx.scale(this.flipH ? -1 : 1, this.flipV ? -1 : 1);
    ctx.drawImage(item.imgElement, -item.width / 2, -item.height / 2, item.width, item.height);
    ctx.restore();
  },

  async renderRotatedCanvas(item) {
    const rad = (this.angle * Math.PI) / 180;
    const sin = Math.abs(Math.sin(rad));
    const cos = Math.abs(Math.cos(rad));

    const targetW = Math.round(item.width * cos + item.height * sin);
    const targetH = Math.round(item.width * sin + item.height * cos);

    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    ctx.save();
    ctx.translate(targetW / 2, targetH / 2);
    ctx.rotate(rad);
    ctx.scale(this.flipH ? -1 : 1, this.flipV ? -1 : 1);
    ctx.drawImage(item.imgElement, -item.width / 2, -item.height / 2, item.width, item.height);
    ctx.restore();

    const outType = item.type === 'image/png' ? 'image/png' : 'image/jpeg';
    return await canvasToBlob(canvas, outType, 0.95);
  },

  async executeRotate(container) {
    const execBtn = container.querySelector('#rotate-exec-btn');
    execBtn.disabled = true;

    if (this.files.length === 1 || !this.applyToAll) {
      const item = this.files[this.currentIndex];
      const blob = await this.renderRotatedCanvas(item);
      downloadBlob(blob, `rotated_${item.name}`);
      Toast.success('Saved rotated image!');
    } else {
      await this.downloadAllZip();
    }

    execBtn.disabled = false;
  },

  async downloadAllZip() {
    Toast.info(`Processing ${this.files.length} images...`);
    const results = [];
    for (const item of this.files) {
      const blob = await this.renderRotatedCanvas(item);
      results.push({
        name: `rotated_${item.name}`,
        blob
      });
    }
    await exportFilesAsZip(results, 'rotated_images.zip');
    Toast.success('Downloaded all rotated images!');
  },

  reset(container) {
    this.files = [];
    this.currentIndex = 0;
    this.angle = 0;
    this.flipH = false;
    this.flipV = false;
    this.render(container);
  }
};
