/**
 * Rotate IMAGE Tool
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
  angle: 90, // 90, 180, 270
  flipH: false,
  flipV: false,
  filterOrientation: 'all', // 'all', 'landscape', 'portrait'
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
          <button id="rotate-exec-btn" class="btn-primary" disabled><i data-lucide="rotate-cw" style="width: 16px; height: 16px;"></i> Rotate Images</button>
          <button id="rotate-download-btn" class="btn-primary btn-emerald" style="display:none;"><i data-lucide="download" style="width: 16px; height: 16px;"></i> Download All (ZIP)</button>
        </div>
      </div>

      <!-- Dropzone -->
      <div id="rotate-dropzone" class="dropzone-container">
        <div class="dropzone-icon" style="background: var(--accent-sky); color: #0284c7;">
          <i data-lucide="rotate-cw" style="width: 32px; height: 32px;"></i>
        </div>
        <div class="dropzone-title">Select Images to Rotate</div>
        <div class="dropzone-desc">Batch rotate 90°, 180°, 270° or flip images horizontally and vertically</div>
        <button type="button" class="dropzone-btn" style="background: #0284c7;"><i data-lucide="upload" style="width: 18px; height: 18px;"></i> Select Images</button>
      </div>

      <!-- Workspace -->
      <div id="rotate-workspace" class="editor-layout" style="display:none;">
        <div class="viewport-card">
          <h3 style="font-size: 1.1rem; font-weight: 700; margin-bottom: 1rem;">Loaded Images</h3>
          <div id="rotate-queue-grid" class="batch-grid" style="max-height: 440px;"></div>
        </div>

        <div class="settings-panel">
          <div class="settings-group">
            <h4>Rotation Angle</h4>
            <div class="chip-group" id="rotate-angles">
              <button class="chip-btn active" data-angle="90">Rotate 90° CW</button>
              <button class="chip-btn" data-angle="180">Rotate 180°</button>
              <button class="chip-btn" data-angle="270">Rotate 90° CCW</button>
            </div>
          </div>

          <div class="settings-group">
            <h4>Flip Orientation</h4>
            <div style="display: flex; gap: 0.5rem;">
              <button id="flip-h-btn" class="chip-btn" style="flex:1; justify-content: center;"><i data-lucide="flip-horizontal" style="width:14px;height:14px;"></i> Flip H</button>
              <button id="flip-v-btn" class="chip-btn" style="flex:1; justify-content: center;"><i data-lucide="flip-vertical" style="width:14px;height:14px;"></i> Flip V</button>
            </div>
          </div>

          <div class="settings-group">
            <h4>Target Scope</h4>
            <div class="chip-group" id="rotate-scope">
              <button class="chip-btn active" data-scope="all">All Images</button>
              <button class="chip-btn" data-scope="landscape">Landscape Only</button>
              <button class="chip-btn" data-scope="portrait">Portrait Only</button>
            </div>
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
    const downloadBtn = container.querySelector('#rotate-download-btn');
    const angles = container.querySelectorAll('#rotate-angles .chip-btn');
    const scopes = container.querySelectorAll('#rotate-scope .chip-btn');
    const flipHBtn = container.querySelector('#flip-h-btn');
    const flipVBtn = container.querySelector('#flip-v-btn');

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
        this.renderQueue(container);
      }
    });

    angles.forEach(btn => {
      btn.addEventListener('click', () => {
        angles.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.angle = parseInt(btn.dataset.angle);
      });
    });

    scopes.forEach(btn => {
      btn.addEventListener('click', () => {
        scopes.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.filterOrientation = btn.dataset.scope;
      });
    });

    flipHBtn.addEventListener('click', () => {
      this.flipH = !this.flipH;
      flipHBtn.classList.toggle('active', this.flipH);
    });

    flipVBtn.addEventListener('click', () => {
      this.flipV = !this.flipV;
      flipVBtn.classList.toggle('active', this.flipV);
    });

    execBtn.addEventListener('click', () => this.processRotate(container));
    downloadBtn.addEventListener('click', () => this.downloadAll());
    resetBtn.addEventListener('click', () => this.reset(container));
  },

  renderQueue(container) {
    const grid = container.querySelector('#rotate-queue-grid');
    grid.innerHTML = '';

    this.files.forEach((item, idx) => {
      const isLandscape = item.width > item.height;
      const res = this.rotatedResults[idx];
      const card = document.createElement('div');
      card.className = 'batch-card';
      card.innerHTML = `
        <img class="batch-thumb" src="${item.dataUrl}" alt="${item.name}">
        <div class="batch-info">
          <div class="batch-name" title="${item.name}">${item.name}</div>
          <div class="batch-meta">${isLandscape ? 'Landscape' : 'Portrait'} • ${item.width} × ${item.height}</div>
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
        const res = this.rotatedResults[idx];
        if (res) downloadBlob(res.blob, res.name);
      });
    });
  },

  async processRotate(container) {
    const execBtn = container.querySelector('#rotate-exec-btn');
    const downloadBtn = container.querySelector('#rotate-download-btn');
    execBtn.disabled = true;

    this.rotatedResults = [];

    for (let i = 0; i < this.files.length; i++) {
      const item = this.files[i];
      const isLandscape = item.width > item.height;

      // Check orientation filter
      let shouldRotate = true;
      if (this.filterOrientation === 'landscape' && !isLandscape) shouldRotate = false;
      if (this.filterOrientation === 'portrait' && isLandscape) shouldRotate = false;

      const angle = shouldRotate ? this.angle : 0;
      const rad = (angle * Math.PI) / 180;
      const isQuarterTurn = angle === 90 || angle === 270;

      const canvas = document.createElement('canvas');
      canvas.width = isQuarterTurn ? item.height : item.width;
      canvas.height = isQuarterTurn ? item.width : item.height;

      const ctx = canvas.getContext('2d');
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate(rad);
      ctx.scale(this.flipH ? -1 : 1, this.flipV ? -1 : 1);
      ctx.drawImage(item.imgElement, -item.width / 2, -item.height / 2);

      const outType = item.type === 'image/png' ? 'image/png' : 'image/jpeg';
      const blob = await canvasToBlob(canvas, outType, 0.95);
      this.rotatedResults.push({
        blob,
        name: `rotated_${item.name}`
      });
    }

    this.renderQueue(container);
    execBtn.disabled = false;
    downloadBtn.style.display = 'inline-flex';
    Toast.success(`Rotated ${this.files.length} images!`);
  },

  async downloadAll() {
    if (!this.rotatedResults.length) return;
    const entries = this.rotatedResults.map(r => ({
      name: r.name,
      blob: r.blob
    }));
    await exportFilesAsZip(entries, 'rotated_images.zip');
  },

  reset(container) {
    this.files = [];
    this.rotatedResults = [];
    this.render(container);
  }
};
