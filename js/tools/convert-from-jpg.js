/**
 * Convert from JPG & GIF Maker Tool
 */
import { setupDropzone, loadImageFromFile, downloadBlob } from '../utils/file-loader.js';
import { canvasToBlob } from '../utils/canvas-helper.js';
import { exportFilesAsZip } from '../utils/zip-export.js';
import { Toast } from '../utils/toast.js';

export const ConvertFromJpgTool = {
  id: 'convert-from-jpg',
  name: 'Convert from JPG',
  category: 'convert',
  description: 'Turn JPG images to PNG, WEBP, or combine multiple JPGs to create an animated preview/GIF in seconds!',

  files: [],
  outputFormat: 'png', // 'png', 'webp', 'gif'
  gifDelayMs: 400,
  animationTimer: null,
  currentAnimFrame: 0,
  convertedResults: [],

  render(container) {
    container.innerHTML = `
      <div class="workspace-header">
        <div class="workspace-header-left">
          <a href="#/" class="back-btn"><i data-lucide="arrow-left" style="width: 16px; height: 16px;"></i> All Tools</a>
          <div class="workspace-title-wrap">
            <h2>Convert from JPG</h2>
            <span id="fromjpg-count-badge" class="brand-badge" style="display:none;">0 images</span>
          </div>
        </div>
        <div class="workspace-header-right">
          <button id="fromjpg-reset-btn" class="btn-secondary" style="display:none;"><i data-lucide="refresh-cw" style="width: 15px; height: 15px;"></i> Clear</button>
          <button id="fromjpg-exec-btn" class="btn-primary" disabled><i data-lucide="arrow-right-circle" style="width: 16px; height: 16px;"></i> Convert Images</button>
          <button id="fromjpg-download-btn" class="btn-primary btn-emerald" style="display:none;"><i data-lucide="download" style="width: 16px; height: 16px;"></i> Download All (ZIP)</button>
        </div>
      </div>

      <!-- Dropzone -->
      <div id="fromjpg-dropzone" class="dropzone-container">
        <div class="dropzone-icon" style="background: var(--accent-yellow); color: #854d0e;">
          <i data-lucide="image" style="width: 32px; height: 32px;"></i>
        </div>
        <div class="dropzone-title">Select JPG Images</div>
        <div class="dropzone-desc">Convert to PNG, WebP, or create an animated frame sequence / GIF</div>
        <button type="button" class="dropzone-btn" style="background: #ca8a04;"><i data-lucide="upload" style="width: 18px; height: 18px;"></i> Select JPGs</button>
      </div>

      <!-- Workspace -->
      <div id="fromjpg-workspace" class="editor-layout" style="display:none;">
        <div class="viewport-card">
          <div id="fromjpg-anim-container" style="display:none; text-align: center; margin-bottom: 1.5rem;">
            <h4 style="margin-bottom: 0.75rem; font-weight: 700;">Live Animated Sequence Preview</h4>
            <div class="canvas-wrapper" style="min-height: 280px; max-height: 380px;">
              <canvas id="fromjpg-anim-canvas"></canvas>
            </div>
          </div>
          <h3 style="font-size: 1.1rem; font-weight: 700; margin-bottom: 1rem;">Loaded Frames / Images</h3>
          <div id="fromjpg-queue-grid" class="batch-grid" style="max-height: 320px;"></div>
        </div>

        <div class="settings-panel">
          <div class="settings-group">
            <h4>Output Target</h4>
            <div class="chip-group" id="fromjpg-format-chips">
              <button class="chip-btn active" data-fmt="png">PNG (Lossless)</button>
              <button class="chip-btn" data-fmt="webp">WebP (Modern)</button>
              <button class="chip-btn" data-fmt="gif">Animated GIF Frames</button>
            </div>
          </div>

          <!-- GIF Options -->
          <div id="fromjpg-gif-options" class="settings-group" style="display:none;">
            <div class="control-row">
              <div class="control-label">
                <span>Frame Delay (Speed)</span>
                <span id="fromjpg-speed-val" class="control-val">400ms</span>
              </div>
              <input type="range" id="fromjpg-speed-slider" class="range-slider" min="100" max="1500" step="50" value="400">
            </div>
            <div style="font-size: 0.8rem; color: var(--text-muted);">
              Upload 2 or more JPGs to build a multi-frame animation sequence.
            </div>
          </div>
        </div>
      </div>
    `;

    if (window.lucide) window.lucide.createIcons({ root: container });
    this.initEvents(container);
  },

  initEvents(container) {
    const dropzone = container.querySelector('#fromjpg-dropzone');
    const resetBtn = container.querySelector('#fromjpg-reset-btn');
    const execBtn = container.querySelector('#fromjpg-exec-btn');
    const downloadBtn = container.querySelector('#fromjpg-download-btn');
    const formatChips = container.querySelectorAll('#fromjpg-format-chips .chip-btn');
    const gifOptions = container.querySelector('#fromjpg-gif-options');
    const animContainer = container.querySelector('#fromjpg-anim-container');
    const speedSlider = container.querySelector('#fromjpg-speed-slider');
    const speedVal = container.querySelector('#fromjpg-speed-val');

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
        container.querySelector('#fromjpg-dropzone').style.display = 'none';
        container.querySelector('#fromjpg-workspace').style.display = 'grid';
        container.querySelector('#fromjpg-reset-btn').style.display = 'inline-flex';
        container.querySelector('#fromjpg-count-badge').style.display = 'inline-block';
        container.querySelector('#fromjpg-count-badge').textContent = `${this.files.length} images`;
        container.querySelector('#fromjpg-exec-btn').disabled = false;
        this.renderQueue(container);
        if (this.outputFormat === 'gif' && this.files.length > 1) {
          this.startAnimation(container);
        }
      }
    });

    formatChips.forEach(btn => {
      btn.addEventListener('click', () => {
        formatChips.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.outputFormat = btn.dataset.fmt;
        if (this.outputFormat === 'gif') {
          gifOptions.style.display = 'flex';
          animContainer.style.display = 'block';
          this.startAnimation(container);
        } else {
          gifOptions.style.display = 'none';
          animContainer.style.display = 'none';
          this.stopAnimation();
        }
      });
    });

    speedSlider.addEventListener('input', (e) => {
      this.gifDelayMs = parseInt(e.target.value);
      speedVal.textContent = `${this.gifDelayMs}ms`;
      if (this.outputFormat === 'gif') {
        this.startAnimation(container);
      }
    });

    execBtn.addEventListener('click', () => this.processConversion(container));
    downloadBtn.addEventListener('click', () => this.downloadAll());
    resetBtn.addEventListener('click', () => this.reset(container));
  },

  startAnimation(container) {
    this.stopAnimation();
    if (this.files.length < 2) return;
    const canvas = container.querySelector('#fromjpg-anim-canvas');
    if (!canvas) return;

    const first = this.files[0];
    canvas.width = first.width;
    canvas.height = first.height;
    const ctx = canvas.getContext('2d');

    this.currentAnimFrame = 0;
    this.animationTimer = setInterval(() => {
      const frame = this.files[this.currentAnimFrame];
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(frame.imgElement, 0, 0, canvas.width, canvas.height);
      this.currentAnimFrame = (this.currentAnimFrame + 1) % this.files.length;
    }, this.gifDelayMs);
  },

  stopAnimation() {
    if (this.animationTimer) {
      clearInterval(this.animationTimer);
      this.animationTimer = null;
    }
  },

  renderQueue(container) {
    const grid = container.querySelector('#fromjpg-queue-grid');
    grid.innerHTML = '';

    this.files.forEach((item, idx) => {
      const res = this.convertedResults[idx];
      const card = document.createElement('div');
      card.className = 'batch-card';
      card.innerHTML = `
        <img class="batch-thumb" src="${item.dataUrl}" alt="${item.name}">
        <div class="batch-info">
          <div class="batch-name" title="${item.name}">${item.name}</div>
          <div class="batch-meta">${item.width} × ${item.height}</div>
        </div>
        ${res ? `
          <button class="btn-secondary" style="padding: 4px 8px; font-size: 0.775rem;" data-download-idx="${idx}">
            <i data-lucide="download" style="width: 12px; height: 12px;"></i> Download
          </button>
        ` : ''}
      `;
      grid.appendChild(card);
    });

    if (window.lucide) window.lucide.createIcons({ root: grid });

    grid.querySelectorAll('[data-download-idx]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(e.currentTarget.dataset.downloadIdx);
        const res = this.convertedResults[idx];
        if (res) downloadBlob(res.blob, res.name);
      });
    });
  },

  async processConversion(container) {
    const execBtn = container.querySelector('#fromjpg-exec-btn');
    const downloadBtn = container.querySelector('#fromjpg-download-btn');
    execBtn.disabled = true;

    this.convertedResults = [];

    const mimeType = this.outputFormat === 'webp' ? 'image/webp' : 'image/png';
    const ext = this.outputFormat === 'webp' ? 'webp' : 'png';

    for (let i = 0; i < this.files.length; i++) {
      const item = this.files[i];
      const canvas = document.createElement('canvas');
      canvas.width = item.width;
      canvas.height = item.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(item.imgElement, 0, 0);

      const blob = await canvasToBlob(canvas, mimeType, 0.95);
      this.convertedResults.push({
        blob,
        name: `${item.baseName}.${ext}`
      });
    }

    this.renderQueue(container);
    execBtn.disabled = false;
    downloadBtn.style.display = 'inline-flex';
    Toast.success(`Converted ${this.files.length} images to ${ext.toUpperCase()}!`);
  },

  async downloadAll() {
    if (!this.convertedResults.length) return;
    const entries = this.convertedResults.map(r => ({
      name: r.name,
      blob: r.blob
    }));
    await exportFilesAsZip(entries, `converted_${this.outputFormat}.zip`);
  },

  reset(container) {
    this.stopAnimation();
    this.files = [];
    this.convertedResults = [];
    this.render(container);
  }
};
