/**
 * Photo Editor Tool
 */
import { setupDropzone, loadImageFromFile, downloadBlob } from '../utils/file-loader.js';
import { canvasToBlob } from '../utils/canvas-helper.js';
import { Toast } from '../utils/toast.js';

export const PhotoEditorTool = {
  id: 'photo-editor',
  name: 'Photo editor',
  category: 'edit',
  description: 'Spice up your pictures with text, effects, frames or stickers. Simple editing tools for your image needs.',

  imageItem: null,
  filters: {
    brightness: 100,
    contrast: 100,
    saturate: 100,
    sepia: 0,
    grayscale: 0,
    hueRotate: 0,
    blur: 0
  },
  textOverlays: [],
  stickers: [],
  activeText: '',
  textColor: '#ffffff',
  textSize: 36,

  render(container) {
    container.innerHTML = `
      <div class="workspace-header">
        <div class="workspace-header-left">
          <a href="#/" class="back-btn"><i data-lucide="arrow-left" style="width: 16px; height: 16px;"></i> All Tools</a>
          <div class="workspace-title-wrap">
            <h2>Photo Editor</h2>
          </div>
        </div>
        <div class="workspace-header-right">
          <button id="editor-reset-btn" class="btn-secondary" style="display:none;"><i data-lucide="refresh-cw" style="width: 15px; height: 15px;"></i> New Image</button>
          <button id="editor-download-btn" class="btn-primary btn-emerald" disabled><i data-lucide="download" style="width: 16px; height: 16px;"></i> Save Image</button>
        </div>
      </div>

      <!-- Dropzone -->
      <div id="editor-dropzone" class="dropzone-container">
        <div class="dropzone-icon" style="background: var(--accent-purple-bg); color: var(--accent-purple);">
          <i data-lucide="edit-3" style="width: 32px; height: 32px;"></i>
        </div>
        <div class="dropzone-title">Select Photo to Edit</div>
        <div class="dropzone-desc">Apply color filters, add custom text captions, and place stickers</div>
        <button type="button" class="dropzone-btn" style="background: var(--accent-purple);"><i data-lucide="upload" style="width: 18px; height: 18px;"></i> Select Photo</button>
      </div>

      <!-- Workspace -->
      <div id="editor-workspace" class="editor-layout" style="display:none;">
        <div class="viewport-card">
          <div class="canvas-wrapper">
            <canvas id="photo-canvas"></canvas>
          </div>
        </div>

        <div class="settings-panel" style="max-height: 80vh; overflow-y: auto;">
          <!-- Filter Presets -->
          <div class="settings-group">
            <h4>Style Presets</h4>
            <div class="chip-group" id="editor-presets">
              <button class="chip-btn active" data-preset="normal">Normal</button>
              <button class="chip-btn" data-preset="vintage">Vintage</button>
              <button class="chip-btn" data-preset="noir">Noir B&W</button>
              <button class="chip-btn" data-preset="vibrant">Vibrant</button>
              <button class="chip-btn" data-preset="warm">Warm Glow</button>
              <button class="chip-btn" data-preset="cool">Cool Tone</button>
            </div>
          </div>

          <!-- Adjustments Sliders -->
          <div class="settings-group">
            <h4>Adjustments</h4>
            <div class="control-row">
              <div class="control-label"><span>Brightness</span><span id="val-bright" class="control-val">100%</span></div>
              <input type="range" id="slider-bright" class="range-slider" min="0" max="200" value="100">
            </div>

            <div class="control-row">
              <div class="control-label"><span>Contrast</span><span id="val-contrast" class="control-val">100%</span></div>
              <input type="range" id="slider-contrast" class="range-slider" min="0" max="200" value="100">
            </div>

            <div class="control-row">
              <div class="control-label"><span>Saturation</span><span id="val-saturate" class="control-val">100%</span></div>
              <input type="range" id="slider-saturate" class="range-slider" min="0" max="200" value="100">
            </div>

            <div class="control-row">
              <div class="control-label"><span>Sepia</span><span id="val-sepia" class="control-val">0%</span></div>
              <input type="range" id="slider-sepia" class="range-slider" min="0" max="100" value="0">
            </div>
          </div>

          <!-- Add Text Overlay -->
          <div class="settings-group">
            <h4>Add Text</h4>
            <div style="display: flex; gap: 0.5rem;">
              <input type="text" id="editor-text-input" class="text-input" placeholder="Type text...">
              <button id="add-text-btn" class="btn-primary" style="padding: 0.55rem 0.85rem;"><i data-lucide="plus" style="width: 14px; height: 14px;"></i></button>
            </div>
            <div style="display: flex; align-items: center; gap: 0.75rem; margin-top: 0.5rem;">
              <input type="color" id="editor-text-color" value="#ffffff" style="width: 38px; height: 32px; border-radius: 6px; cursor: pointer;">
              <input type="range" id="editor-text-size" class="range-slider" min="16" max="96" value="36" title="Font Size">
            </div>
          </div>

          <!-- Stickers -->
          <div class="settings-group">
            <h4>Add Stickers</h4>
            <div style="display: flex; gap: 0.5rem; font-size: 1.4rem; flex-wrap: wrap;" id="sticker-palette">
              <button class="chip-btn" data-emoji="🔥">🔥</button>
              <button class="chip-btn" data-emoji="⭐">⭐</button>
              <button class="chip-btn" data-emoji="❤️">❤️</button>
              <button class="chip-btn" data-emoji="🎉">🎉</button>
              <button class="chip-btn" data-emoji="✨">✨</button>
              <button class="chip-btn" data-emoji="🕶️">🕶️</button>
            </div>
          </div>

          <button id="editor-clear-overlays-btn" class="btn-secondary" style="width: 100%; justify-content: center;">
            <i data-lucide="trash-2" style="width: 14px; height: 14px;"></i> Clear Text & Stickers
          </button>
        </div>
      </div>
    `;

    if (window.lucide) window.lucide.createIcons({ root: container });
    this.initEvents(container);
  },

  initEvents(container) {
    const dropzone = container.querySelector('#editor-dropzone');
    const resetBtn = container.querySelector('#editor-reset-btn');
    const downloadBtn = container.querySelector('#editor-download-btn');
    const presetBtns = container.querySelectorAll('#editor-presets .chip-btn');

    const sBright = container.querySelector('#slider-bright');
    const sContrast = container.querySelector('#slider-contrast');
    const sSaturate = container.querySelector('#slider-saturate');
    const sSepia = container.querySelector('#slider-sepia');

    const txtInput = container.querySelector('#editor-text-input');
    const txtAddBtn = container.querySelector('#add-text-btn');
    const txtColor = container.querySelector('#editor-text-color');
    const txtSize = container.querySelector('#editor-text-size');
    const stickerBtns = container.querySelectorAll('#sticker-palette .chip-btn');
    const clearOverlaysBtn = container.querySelector('#editor-clear-overlays-btn');

    setupDropzone(dropzone, async (files) => {
      if (!files.length) return;
      try {
        const item = await loadImageFromFile(files[0]);
        this.imageItem = item;
        container.querySelector('#editor-dropzone').style.display = 'none';
        container.querySelector('#editor-workspace').style.display = 'grid';
        container.querySelector('#editor-reset-btn').style.display = 'inline-flex';
        container.querySelector('#editor-download-btn').disabled = false;
        this.drawCanvas(container);
      } catch (err) {
        Toast.error('Could not load image');
      }
    });

    // Preset handlers
    presetBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        presetBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const p = btn.dataset.preset;
        if (p === 'normal') {
          this.filters = { brightness: 100, contrast: 100, saturate: 100, sepia: 0, grayscale: 0, hueRotate: 0, blur: 0 };
        } else if (p === 'vintage') {
          this.filters = { brightness: 110, contrast: 90, saturate: 85, sepia: 40, grayscale: 0, hueRotate: 0, blur: 0 };
        } else if (p === 'noir') {
          this.filters = { brightness: 105, contrast: 125, saturate: 0, sepia: 0, grayscale: 100, hueRotate: 0, blur: 0 };
        } else if (p === 'vibrant') {
          this.filters = { brightness: 105, contrast: 115, saturate: 150, sepia: 0, grayscale: 0, hueRotate: 0, blur: 0 };
        } else if (p === 'warm') {
          this.filters = { brightness: 105, contrast: 100, saturate: 110, sepia: 25, grayscale: 0, hueRotate: 0, blur: 0 };
        } else if (p === 'cool') {
          this.filters = { brightness: 100, contrast: 105, saturate: 90, sepia: 0, grayscale: 0, hueRotate: 180, blur: 0 };
        }
        sBright.value = this.filters.brightness;
        sContrast.value = this.filters.contrast;
        sSaturate.value = this.filters.saturate;
        sSepia.value = this.filters.sepia;
        this.updateSliderLabels(container);
        this.drawCanvas(container);
      });
    });

    sBright.addEventListener('input', (e) => {
      this.filters.brightness = parseInt(e.target.value);
      container.querySelector('#val-bright').textContent = `${e.target.value}%`;
      this.drawCanvas(container);
    });

    sContrast.addEventListener('input', (e) => {
      this.filters.contrast = parseInt(e.target.value);
      container.querySelector('#val-contrast').textContent = `${e.target.value}%`;
      this.drawCanvas(container);
    });

    sSaturate.addEventListener('input', (e) => {
      this.filters.saturate = parseInt(e.target.value);
      container.querySelector('#val-saturate').textContent = `${e.target.value}%`;
      this.drawCanvas(container);
    });

    sSepia.addEventListener('input', (e) => {
      this.filters.sepia = parseInt(e.target.value);
      container.querySelector('#val-sepia').textContent = `${e.target.value}%`;
      this.drawCanvas(container);
    });

    txtAddBtn.addEventListener('click', () => {
      const text = txtInput.value.trim();
      if (!text || !this.imageItem) return;
      this.textOverlays.push({
        text,
        color: txtColor.value,
        size: parseInt(txtSize.value),
        x: this.imageItem.width / 2,
        y: this.imageItem.height / 2
      });
      txtInput.value = '';
      this.drawCanvas(container);
      Toast.success('Text added!');
    });

    stickerBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        if (!this.imageItem) return;
        this.stickers.push({
          emoji: btn.dataset.emoji,
          size: 64,
          x: this.imageItem.width / 2,
          y: this.imageItem.height / 2
        });
        this.drawCanvas(container);
        Toast.success('Sticker placed!');
      });
    });

    clearOverlaysBtn.addEventListener('click', () => {
      this.textOverlays = [];
      this.stickers = [];
      this.drawCanvas(container);
    });

    downloadBtn.addEventListener('click', async () => {
      const canvas = container.querySelector('#photo-canvas');
      const blob = await canvasToBlob(canvas, 'image/png', 0.95);
      downloadBlob(blob, `edited_${this.imageItem.baseName}.png`);
      Toast.success('Photo saved!');
    });

    resetBtn.addEventListener('click', () => {
      this.imageItem = null;
      this.textOverlays = [];
      this.stickers = [];
      this.render(container);
    });
  },

  updateSliderLabels(container) {
    container.querySelector('#val-bright').textContent = `${this.filters.brightness}%`;
    container.querySelector('#val-contrast').textContent = `${this.filters.contrast}%`;
    container.querySelector('#val-saturate').textContent = `${this.filters.saturate}%`;
    container.querySelector('#val-sepia').textContent = `${this.filters.sepia}%`;
  },

  drawCanvas(container) {
    if (!this.imageItem) return;
    const canvas = container.querySelector('#photo-canvas');
    canvas.width = this.imageItem.width;
    canvas.height = this.imageItem.height;
    const ctx = canvas.getContext('2d');

    // Apply CSS-like filter string onto Canvas 2D
    const f = this.filters;
    ctx.filter = `brightness(${f.brightness}%) contrast(${f.contrast}%) saturate(${f.saturate}%) sepia(${f.sepia}%) grayscale(${f.grayscale}%) hue-rotate(${f.hueRotate}deg)`;
    ctx.drawImage(this.imageItem.imgElement, 0, 0);

    // Reset filter for text and sticker overlays
    ctx.filter = 'none';

    // Draw text overlays
    this.textOverlays.forEach(t => {
      ctx.save();
      ctx.font = `bold ${t.size}px -apple-system, BlinkMacSystemFont, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = t.color;
      ctx.shadowColor = 'rgba(0,0,0,0.7)';
      ctx.shadowBlur = 8;
      ctx.fillText(t.text, t.x, t.y);
      ctx.restore();
    });

    // Draw stickers
    this.stickers.forEach(s => {
      ctx.save();
      ctx.font = `${s.size}px serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(s.emoji, s.x, s.y);
      ctx.restore();
    });
  }
};
