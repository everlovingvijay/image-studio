/**
 * Convert to JPG Tool
 */
import { setupDropzone, loadImageFromFile, downloadBlob } from '../utils/file-loader.js';
import { canvasToBlob } from '../utils/canvas-helper.js';
import { exportFilesAsZip } from '../utils/zip-export.js';
import { Toast } from '../utils/toast.js';

export const ConvertToJpgTool = {
  id: 'convert-to-jpg',
  name: 'Convert to JPG',
  category: 'convert',
  description: 'Turn PNG, GIF, SVG, WEBP, and other format images to JPG in bulk with ease.',

  files: [],
  bgColor: '#ffffff',
  quality: 0.9,
  convertedResults: [],

  render(container) {
    container.innerHTML = `
      <div class="workspace-header">
        <div class="workspace-header-left">
          <a href="#/" class="back-btn"><i data-lucide="arrow-left" style="width: 16px; height: 16px;"></i> All Tools</a>
          <div class="workspace-title-wrap">
            <h2>Convert to JPG</h2>
            <span id="jpg-count-badge" class="brand-badge" style="display:none;">0 images</span>
          </div>
        </div>
        <div class="workspace-header-right">
          <button id="jpg-reset-btn" class="btn-secondary" style="display:none;"><i data-lucide="refresh-cw" style="width: 15px; height: 15px;"></i> Clear</button>
          <button id="jpg-exec-btn" class="btn-primary" disabled><i data-lucide="arrow-right-circle" style="width: 16px; height: 16px;"></i> Convert to JPG</button>
          <button id="jpg-download-btn" class="btn-primary btn-emerald" style="display:none;"><i data-lucide="download" style="width: 16px; height: 16px;"></i> Download All (ZIP)</button>
        </div>
      </div>

      <!-- Dropzone -->
      <div id="jpg-dropzone" class="dropzone-container">
        <div class="dropzone-icon" style="background: var(--accent-amber-bg); color: var(--accent-amber);">
          <i data-lucide="file-image" style="width: 32px; height: 32px;"></i>
        </div>
        <div class="dropzone-title">Select Images to Convert to JPG</div>
        <div class="dropzone-desc">Batch convert PNG, WebP, GIF, SVG, and BMP to high-quality JPG</div>
        <button type="button" class="dropzone-btn" style="background: var(--accent-amber);"><i data-lucide="upload" style="width: 18px; height: 18px;"></i> Select Images</button>
        <div class="dropzone-formats">Zero Server Uploads • Instant Browser Conversion</div>
      </div>

      <!-- Workspace -->
      <div id="jpg-workspace" class="editor-layout" style="display:none;">
        <div class="viewport-card">
          <h3 style="font-size: 1.1rem; font-weight: 700; margin-bottom: 1rem;">Images to Convert</h3>
          <div id="jpg-queue-grid" class="batch-grid" style="max-height: 440px;"></div>
        </div>

        <div class="settings-panel">
          <div class="settings-group">
            <h4>Background Fill Color</h4>
            <p style="font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 0.5rem;">
              Replaces transparent backgrounds in PNG/SVG images.
            </p>
            <div style="display: flex; align-items: center; gap: 0.75rem;">
              <input type="color" id="jpg-bg-color" value="#ffffff" style="width: 44px; height: 36px; border: 1px solid var(--border-color); border-radius: 6px; cursor: pointer; padding: 2px;">
              <span id="jpg-bg-hex" style="font-family: var(--font-mono); font-size: 0.85rem; font-weight: 600;">#ffffff (White)</span>
            </div>
          </div>

          <div class="settings-group">
            <div class="control-row">
              <div class="control-label">
                <span>JPEG Quality</span>
                <span id="jpg-qual-val" class="control-val">90%</span>
              </div>
              <input type="range" id="jpg-qual-slider" class="range-slider" min="30" max="100" value="90">
            </div>
          </div>
        </div>
      </div>
    `;

    if (window.lucide) window.lucide.createIcons({ root: container });
    this.initEvents(container);
  },

  initEvents(container) {
    const dropzone = container.querySelector('#jpg-dropzone');
    const resetBtn = container.querySelector('#jpg-reset-btn');
    const execBtn = container.querySelector('#jpg-exec-btn');
    const downloadBtn = container.querySelector('#jpg-download-btn');
    const colorPicker = container.querySelector('#jpg-bg-color');
    const colorHex = container.querySelector('#jpg-bg-hex');
    const slider = container.querySelector('#jpg-qual-slider');
    const qualVal = container.querySelector('#jpg-qual-val');

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
        container.querySelector('#jpg-dropzone').style.display = 'none';
        container.querySelector('#jpg-workspace').style.display = 'grid';
        container.querySelector('#jpg-reset-btn').style.display = 'inline-flex';
        container.querySelector('#jpg-count-badge').style.display = 'inline-block';
        container.querySelector('#jpg-count-badge').textContent = `${this.files.length} images`;
        container.querySelector('#jpg-exec-btn').disabled = false;
        this.renderQueue(container);
      }
    });

    colorPicker.addEventListener('input', (e) => {
      this.bgColor = e.target.value;
      colorHex.textContent = this.bgColor;
    });

    slider.addEventListener('input', (e) => {
      const val = parseInt(e.target.value);
      this.quality = val / 100;
      qualVal.textContent = `${val}%`;
    });

    execBtn.addEventListener('click', () => this.processConversion(container));
    downloadBtn.addEventListener('click', () => this.downloadAll());
    resetBtn.addEventListener('click', () => this.reset(container));
  },

  renderQueue(container) {
    const grid = container.querySelector('#jpg-queue-grid');
    grid.innerHTML = '';

    this.files.forEach((item, idx) => {
      const res = this.convertedResults[idx];
      const card = document.createElement('div');
      card.className = 'batch-card';
      card.innerHTML = `
        <img class="batch-thumb" src="${item.dataUrl}" alt="${item.name}">
        <div class="batch-info">
          <div class="batch-name" title="${item.name}">${item.name}</div>
          <div class="batch-meta">${item.width} × ${item.height} • ${item.formattedSize}</div>
        </div>
        ${res ? `
          <button class="btn-secondary" style="padding: 4px 8px; font-size: 0.775rem;" data-download-idx="${idx}">
            <i data-lucide="download" style="width: 12px; height: 12px;"></i> Download JPG
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
    const execBtn = container.querySelector('#jpg-exec-btn');
    const downloadBtn = container.querySelector('#jpg-download-btn');
    execBtn.disabled = true;
    execBtn.innerHTML = `<i data-lucide="loader-2" style="width: 16px; height: 16px; animation: spin 1s linear infinite;"></i> Converting...`;
    if (window.lucide) window.lucide.createIcons({ root: execBtn });

    this.convertedResults = [];

    for (let i = 0; i < this.files.length; i++) {
      const item = this.files[i];
      const canvas = document.createElement('canvas');
      canvas.width = item.width;
      canvas.height = item.height;
      const ctx = canvas.getContext('2d');

      // Fill background
      ctx.fillStyle = this.bgColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(item.imgElement, 0, 0);

      const blob = await canvasToBlob(canvas, 'image/jpeg', this.quality);
      this.convertedResults.push({
        blob,
        name: `${item.baseName}.jpg`
      });
    }

    this.renderQueue(container);
    execBtn.disabled = false;
    execBtn.innerHTML = `<i data-lucide="check" style="width: 16px; height: 16px;"></i> Done!`;
    downloadBtn.style.display = 'inline-flex';
    Toast.success(`Converted ${this.files.length} images to JPG!`);
  },

  async downloadAll() {
    if (!this.convertedResults.length) return;
    const entries = this.convertedResults.map(r => ({
      name: r.name,
      blob: r.blob
    }));
    await exportFilesAsZip(entries, 'converted_jpgs.zip');
  },

  reset(container) {
    this.files = [];
    this.convertedResults = [];
    this.render(container);
  }
};
