/**
 * Resize IMAGE Tool
 */
import { setupDropzone, loadImageFromFile, formatBytes, downloadBlob } from '../utils/file-loader.js';
import { resampleCanvas, canvasToBlob } from '../utils/canvas-helper.js';
import { exportFilesAsZip } from '../utils/zip-export.js';
import { Toast } from '../utils/toast.js';

export const ResizeTool = {
  id: 'resize',
  name: 'Resize IMAGE',
  category: 'edit',
  description: 'Define your dimensions, by percent or pixel, and resize your JPG, PNG, SVG, and GIF images.',

  files: [],
  mode: 'percent', // 'percent' or 'pixels'
  percent: 50,
  targetWidth: 1200,
  targetHeight: 800,
  maintainAspectRatio: true,
  resizedResults: [],

  render(container) {
    container.innerHTML = `
      <div class="workspace-header">
        <div class="workspace-header-left">
          <a href="#/" class="back-btn"><i data-lucide="arrow-left" style="width: 16px; height: 16px;"></i> All Tools</a>
          <div class="workspace-title-wrap">
            <h2>Resize IMAGE</h2>
            <span id="resize-count-badge" class="brand-badge" style="display:none;">0 images</span>
          </div>
        </div>
        <div class="workspace-header-right">
          <button id="resize-reset-btn" class="btn-secondary" style="display:none;"><i data-lucide="refresh-cw" style="width: 15px; height: 15px;"></i> Clear</button>
          <button id="resize-exec-btn" class="btn-primary" disabled><i data-lucide="scaling" style="width: 16px; height: 16px;"></i> Resize Images</button>
          <button id="resize-download-btn" class="btn-primary btn-emerald" style="display:none;"><i data-lucide="download" style="width: 16px; height: 16px;"></i> Download All (ZIP)</button>
        </div>
      </div>

      <!-- Initial Dropzone -->
      <div id="resize-dropzone" class="dropzone-container">
        <div class="dropzone-icon" style="background: var(--accent-cyan-bg); color: var(--accent-cyan);">
          <i data-lucide="scaling" style="width: 32px; height: 32px;"></i>
        </div>
        <div class="dropzone-title">Select or Drop Images to Resize</div>
        <div class="dropzone-desc">Resize multiple images at once by percentage or exact dimensions</div>
        <button type="button" class="dropzone-btn"><i data-lucide="upload" style="width: 18px; height: 18px;"></i> Select Images</button>
        <div class="dropzone-formats">Supports: JPG, PNG, WebP, SVG • High-Quality Resampling</div>
      </div>

      <!-- Main Editor Layout -->
      <div id="resize-workspace" class="editor-layout" style="display:none;">
        <div class="viewport-card">
          <h3 style="font-size: 1.1rem; font-weight: 700; margin-bottom: 1rem;">Resize Queue & Dimensions</h3>
          <div id="resize-list" class="batch-grid" style="max-height: 440px;"></div>
        </div>

        <div class="settings-panel">
          <div class="settings-group">
            <h4>Resize Mode</h4>
            <div class="chip-group">
              <button class="chip-btn active" id="mode-percent-btn">By Percentage</button>
              <button class="chip-btn" id="mode-pixels-btn">By Pixels</button>
            </div>
          </div>

          <!-- By Percentage Controls -->
          <div id="panel-percent" class="settings-group">
            <div class="chip-group" id="percent-presets">
              <button class="chip-btn" data-pct="25">25% Smaller</button>
              <button class="chip-btn active" data-pct="50">50%</button>
              <button class="chip-btn" data-pct="75">75%</button>
            </div>

            <div class="control-row" style="margin-top: 0.5rem;">
              <div class="control-label">
                <span>Custom Percentage</span>
                <span id="percent-val" class="control-val">50%</span>
              </div>
              <input type="range" id="percent-slider" class="range-slider" min="10" max="200" value="50">
            </div>
          </div>

          <!-- By Pixels Controls -->
          <div id="panel-pixels" class="settings-group" style="display:none;">
            <div class="control-row">
              <label class="control-label">Width (px)</label>
              <input type="number" id="input-width" class="text-input" value="1200" min="10" max="10000">
            </div>

            <div class="control-row">
              <label class="control-label">Height (px)</label>
              <input type="number" id="input-height" class="text-input" value="800" min="10" max="10000">
            </div>

            <label style="display: flex; align-items: center; gap: 8px; font-size: 0.85rem; font-weight: 600; cursor: pointer; margin-top: 0.25rem;">
              <input type="checkbox" id="check-ratio" checked> Maintain aspect ratio
            </label>
          </div>
        </div>
      </div>
    `;

    if (window.lucide) window.lucide.createIcons({ root: container });
    this.initEvents(container);
  },

  initEvents(container) {
    const dropzone = container.querySelector('#resize-dropzone');
    const resetBtn = container.querySelector('#resize-reset-btn');
    const execBtn = container.querySelector('#resize-exec-btn');
    const downloadBtn = container.querySelector('#resize-download-btn');
    const modePercentBtn = container.querySelector('#mode-percent-btn');
    const modePixelsBtn = container.querySelector('#mode-pixels-btn');
    const panelPercent = container.querySelector('#panel-percent');
    const panelPixels = container.querySelector('#panel-pixels');
    const percentSlider = container.querySelector('#percent-slider');
    const percentVal = container.querySelector('#percent-val');
    const percentPresets = container.querySelectorAll('#percent-presets .chip-btn');
    const inputW = container.querySelector('#input-width');
    const inputH = container.querySelector('#input-height');
    const checkRatio = container.querySelector('#check-ratio');

    setupDropzone(dropzone, async (files) => {
      await this.handleFiles(files, container);
    });

    modePercentBtn.addEventListener('click', () => {
      modePercentBtn.classList.add('active');
      modePixelsBtn.classList.remove('active');
      panelPercent.style.display = 'flex';
      panelPixels.style.display = 'none';
      this.mode = 'percent';
      this.renderList(container);
    });

    modePixelsBtn.addEventListener('click', () => {
      modePixelsBtn.classList.add('active');
      modePercentBtn.classList.remove('active');
      panelPixels.style.display = 'flex';
      panelPercent.style.display = 'none';
      this.mode = 'pixels';
      this.renderList(container);
    });

    percentPresets.forEach(btn => {
      btn.addEventListener('click', () => {
        percentPresets.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const pct = parseInt(btn.dataset.pct);
        this.percent = pct;
        percentSlider.value = pct;
        percentVal.textContent = `${pct}%`;
        this.renderList(container);
      });
    });

    percentSlider.addEventListener('input', (e) => {
      const val = parseInt(e.target.value);
      this.percent = val;
      percentVal.textContent = `${val}%`;
      percentPresets.forEach(b => b.classList.remove('active'));
      this.renderList(container);
    });

    inputW.addEventListener('input', (e) => {
      this.targetWidth = parseInt(e.target.value) || 100;
      if (checkRatio.checked && this.files.length > 0) {
        const ratio = this.files[0].aspectRatio;
        this.targetHeight = Math.round(this.targetWidth / ratio);
        inputH.value = this.targetHeight;
      }
      this.renderList(container);
    });

    inputH.addEventListener('input', (e) => {
      this.targetHeight = parseInt(e.target.value) || 100;
      if (checkRatio.checked && this.files.length > 0) {
        const ratio = this.files[0].aspectRatio;
        this.targetWidth = Math.round(this.targetHeight * ratio);
        inputW.value = this.targetWidth;
      }
      this.renderList(container);
    });

    checkRatio.addEventListener('change', (e) => {
      this.maintainAspectRatio = e.target.checked;
    });

    execBtn.addEventListener('click', () => this.processResize(container));
    downloadBtn.addEventListener('click', () => this.downloadAll());
    resetBtn.addEventListener('click', () => this.reset(container));
  },

  async handleFiles(files, container) {
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
      container.querySelector('#resize-dropzone').style.display = 'none';
      container.querySelector('#resize-workspace').style.display = 'grid';
      container.querySelector('#resize-reset-btn').style.display = 'inline-flex';
      container.querySelector('#resize-count-badge').style.display = 'inline-block';
      container.querySelector('#resize-count-badge').textContent = `${this.files.length} images`;
      container.querySelector('#resize-exec-btn').disabled = false;

      // Set initial dimensions from first image
      const first = this.files[0];
      this.targetWidth = Math.round(first.width * 0.5);
      this.targetHeight = Math.round(first.height * 0.5);
      container.querySelector('#input-width').value = this.targetWidth;
      container.querySelector('#input-height').value = this.targetHeight;

      this.renderList(container);
    }
  },

  renderList(container) {
    const list = container.querySelector('#resize-list');
    list.innerHTML = '';

    this.files.forEach((item, idx) => {
      let newW, newH;
      if (this.mode === 'percent') {
        newW = Math.round(item.width * (this.percent / 100));
        newH = Math.round(item.height * (this.percent / 100));
      } else {
        if (this.maintainAspectRatio) {
          newW = this.targetWidth;
          newH = Math.round(this.targetWidth / item.aspectRatio);
        } else {
          newW = this.targetWidth;
          newH = this.targetHeight;
        }
      }

      const res = this.resizedResults[idx];
      const card = document.createElement('div');
      card.className = 'batch-card';

      card.innerHTML = `
        <img class="batch-thumb" src="${item.dataUrl}" alt="${item.name}">
        <div class="batch-info">
          <div class="batch-name" title="${item.name}">${item.name}</div>
          <div class="batch-meta">Original: ${item.width} × ${item.height}</div>
          <div class="batch-meta" style="color: var(--accent-blue); font-weight: 600;">
            Target: ${newW} × ${newH}
          </div>
        </div>
        ${res ? `
          <button class="btn-secondary" style="padding: 4px 8px; font-size: 0.775rem; margin-top: 4px;" data-download-idx="${idx}">
            <i data-lucide="download" style="width: 12px; height: 12px;"></i> Download
          </button>
        ` : ''}
      `;
      list.appendChild(card);
    });

    if (window.lucide) window.lucide.createIcons({ root: list });

    list.querySelectorAll('[data-download-idx]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(e.currentTarget.dataset.downloadIdx);
        const res = this.resizedResults[idx];
        if (res) downloadBlob(res.blob, `resized_${res.originalName}`);
      });
    });
  },

  async processResize(container) {
    const execBtn = container.querySelector('#resize-exec-btn');
    const downloadBtn = container.querySelector('#resize-download-btn');
    execBtn.disabled = true;
    execBtn.innerHTML = `<i data-lucide="loader-2" style="width: 16px; height: 16px; animation: spin 1s linear infinite;"></i> Resizing...`;
    if (window.lucide) window.lucide.createIcons({ root: execBtn });

    this.resizedResults = [];

    for (let i = 0; i < this.files.length; i++) {
      const item = this.files[i];
      let newW, newH;
      if (this.mode === 'percent') {
        newW = Math.round(item.width * (this.percent / 100));
        newH = Math.round(item.height * (this.percent / 100));
      } else {
        if (this.maintainAspectRatio) {
          newW = this.targetWidth;
          newH = Math.round(this.targetWidth / item.aspectRatio);
        } else {
          newW = this.targetWidth;
          newH = this.targetHeight;
        }
      }

      const canvas = resampleCanvas(item.imgElement, newW, newH, true);
      const outType = item.type === 'image/png' ? 'image/png' : 'image/jpeg';
      const blob = await canvasToBlob(canvas, outType, 0.9);

      this.resizedResults.push({
        blob,
        originalName: item.name,
        width: newW,
        height: newH
      });
    }

    this.renderList(container);
    execBtn.disabled = false;
    execBtn.innerHTML = `<i data-lucide="check" style="width: 16px; height: 16px;"></i> Resized!`;
    downloadBtn.style.display = 'inline-flex';
    Toast.success(`Successfully resized ${this.files.length} images!`);
  },

  async downloadAll() {
    if (!this.resizedResults.length) return;
    const entries = this.resizedResults.map(r => ({
      name: `resized_${r.originalName}`,
      blob: r.blob
    }));
    await exportFilesAsZip(entries, 'resized_images.zip');
  },

  reset(container) {
    this.files = [];
    this.resizedResults = [];
    this.render(container);
  }
};
