/**
 * Compress IMAGE Tool
 */
import { setupDropzone, loadImageFromFile, formatBytes, downloadBlob } from '../utils/file-loader.js';
import { canvasToBlob } from '../utils/canvas-helper.js';
import { exportFilesAsZip } from '../utils/zip-export.js';
import { Toast } from '../utils/toast.js';

export const CompressTool = {
  id: 'compress',
  name: 'Compress IMAGE',
  category: 'optimize',
  description: 'Compress JPG, PNG, SVG, and GIFs while saving space and maintaining quality.',

  files: [],
  compressedResults: [],
  quality: 0.75,

  render(container) {
    container.innerHTML = `
      <div class="workspace-header">
        <div class="workspace-header-left">
          <a href="#/" class="back-btn"><i data-lucide="arrow-left" style="width: 16px; height: 16px;"></i> All Tools</a>
          <div class="workspace-title-wrap">
            <h2>Compress IMAGE</h2>
            <span id="compress-count-badge" class="brand-badge" style="display:none;">0 images</span>
          </div>
        </div>
        <div class="workspace-header-right">
          <button id="compress-reset-btn" class="btn-secondary" style="display:none;"><i data-lucide="refresh-cw" style="width: 15px; height: 15px;"></i> Clear</button>
          <button id="compress-exec-btn" class="btn-primary" disabled><i data-lucide="minimize-2" style="width: 16px; height: 16px;"></i> Compress Images</button>
          <button id="compress-download-btn" class="btn-primary btn-emerald" style="display:none;"><i data-lucide="download" style="width: 16px; height: 16px;"></i> Download All (ZIP)</button>
        </div>
      </div>

      <!-- Initial Dropzone -->
      <div id="compress-dropzone" class="dropzone-container">
        <div class="dropzone-icon">
          <i data-lucide="minimize-2" style="width: 32px; height: 32px;"></i>
        </div>
        <div class="dropzone-title">Select or Drop Images to Compress</div>
        <div class="dropzone-desc">Compress multiple JPG, PNG, WebP or SVG files at once</div>
        <button type="button" class="dropzone-btn"><i data-lucide="upload" style="width: 18px; height: 18px;"></i> Select Images</button>
        <div class="dropzone-formats">Supports: JPG, PNG, WebP, SVG • 100% Client-Side</div>
      </div>

      <!-- Main Editor Layout -->
      <div id="compress-workspace" class="editor-layout" style="display:none;">
        <div class="viewport-card">
          <h3 style="font-size: 1.1rem; font-weight: 700; margin-bottom: 1rem;">Compression Results & Savings</h3>
          <div id="compress-table-container" style="overflow-x: auto; width: 100%;">
            <table style="width: 100%; border-collapse: collapse; font-size: 0.875rem; text-align: left;">
              <thead>
                <tr style="border-bottom: 2px solid var(--border-color); color: var(--text-secondary);">
                  <th style="padding: 10px;">Preview</th>
                  <th style="padding: 10px;">File Name</th>
                  <th style="padding: 10px;">Original Size</th>
                  <th style="padding: 10px;">Compressed Size</th>
                  <th style="padding: 10px;">Savings</th>
                  <th style="padding: 10px; text-align: right;">Action</th>
                </tr>
              </thead>
              <tbody id="compress-table-body"></tbody>
            </table>
          </div>
        </div>

        <div class="settings-panel">
          <div class="settings-group">
            <h4>Compression Level</h4>
            <div class="chip-group" id="compress-presets">
              <button class="chip-btn" data-quality="0.9">Low (Best Quality)</button>
              <button class="chip-btn active" data-quality="0.75">Recommended</button>
              <button class="chip-btn" data-quality="0.5">High (Smallest Size)</button>
            </div>
          </div>

          <div class="settings-group">
            <div class="control-row">
              <div class="control-label">
                <span>Custom Quality</span>
                <span id="compress-quality-val" class="control-val">75%</span>
              </div>
              <input type="range" id="compress-quality-slider" class="range-slider" min="10" max="98" value="75">
            </div>
          </div>

          <div style="background: var(--bg-subtle); padding: 1rem; border-radius: var(--radius-md); font-size: 0.825rem; color: var(--text-secondary); border: 1px solid var(--border-color);">
            <div style="font-weight: 600; margin-bottom: 4px; color: var(--text-primary);"><i data-lucide="shield-check" style="width: 14px; height: 14px; display: inline-block; vertical-align: middle;"></i> Zero Server Uploads</div>
            All image compression is computed locally on your CPU/GPU using HTML5 Canvas. Your private photos never leave your device.
          </div>
        </div>
      </div>
    `;

    if (window.lucide) window.lucide.createIcons({ root: container });
    this.initEvents(container);
  },

  initEvents(container) {
    const dropzone = container.querySelector('#compress-dropzone');
    const resetBtn = container.querySelector('#compress-reset-btn');
    const execBtn = container.querySelector('#compress-exec-btn');
    const downloadBtn = container.querySelector('#compress-download-btn');
    const slider = container.querySelector('#compress-quality-slider');
    const qualityVal = container.querySelector('#compress-quality-val');
    const presets = container.querySelectorAll('#compress-presets .chip-btn');

    setupDropzone(dropzone, async (files) => {
      await this.handleFiles(files, container);
    });

    presets.forEach(btn => {
      btn.addEventListener('click', () => {
        presets.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const q = parseFloat(btn.dataset.quality);
        this.quality = q;
        slider.value = Math.round(q * 100);
        qualityVal.textContent = `${Math.round(q * 100)}%`;
      });
    });

    slider.addEventListener('input', (e) => {
      const val = parseInt(e.target.value);
      this.quality = val / 100;
      qualityVal.textContent = `${val}%`;
      presets.forEach(b => b.classList.remove('active'));
    });

    execBtn.addEventListener('click', () => this.processCompression(container));
    downloadBtn.addEventListener('click', () => this.downloadAll());
    resetBtn.addEventListener('click', () => this.reset(container));
  },

  async handleFiles(files, container) {
    if (!files.length) return;
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
      container.querySelector('#compress-dropzone').style.display = 'none';
      container.querySelector('#compress-workspace').style.display = 'grid';
      container.querySelector('#compress-reset-btn').style.display = 'inline-flex';
      container.querySelector('#compress-count-badge').style.display = 'inline-block';
      container.querySelector('#compress-count-badge').textContent = `${this.files.length} images`;
      container.querySelector('#compress-exec-btn').disabled = false;
      this.renderTable(container);
    }
  },

  renderTable(container) {
    const tbody = container.querySelector('#compress-table-body');
    tbody.innerHTML = '';

    this.files.forEach((fileItem, idx) => {
      const res = this.compressedResults[idx];
      const tr = document.createElement('tr');
      tr.style.borderBottom = '1px solid var(--border-color)';

      tr.innerHTML = `
        <td style="padding: 10px;">
          <img src="${fileItem.dataUrl}" style="width: 44px; height: 44px; object-fit: cover; border-radius: 6px; border: 1px solid var(--border-color);">
        </td>
        <td style="padding: 10px; font-weight: 600; max-width: 200px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${fileItem.name}">
          ${fileItem.name}
        </td>
        <td style="padding: 10px; color: var(--text-secondary);">${fileItem.formattedSize}</td>
        <td style="padding: 10px;">
          ${res ? `<strong style="color: var(--accent-emerald);">${formatBytes(res.blob.size)}</strong>` : '<span style="color: var(--text-muted);">-</span>'}
        </td>
        <td style="padding: 10px;">
          ${res ? `
            <span style="background: #ecfdf5; color: #059669; font-weight: 700; padding: 2px 8px; border-radius: 9999px; font-size: 0.75rem;">
              -${res.savingsPercent}%
            </span>
          ` : '<span style="color: var(--text-muted);">-</span>'}
        </td>
        <td style="padding: 10px; text-align: right;">
          ${res ? `
            <button class="btn-secondary" style="padding: 4px 10px; font-size: 0.8rem;" data-download-idx="${idx}">
              <i data-lucide="download" style="width: 14px; height: 14px;"></i> Save
            </button>
          ` : '<span style="font-size: 0.8rem; color: var(--text-muted);">Ready</span>'}
        </td>
      `;
      tbody.appendChild(tr);
    });

    if (window.lucide) window.lucide.createIcons({ root: tbody });

    tbody.querySelectorAll('[data-download-idx]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(e.currentTarget.dataset.downloadIdx);
        const res = this.compressedResults[idx];
        if (res) {
          downloadBlob(res.blob, `compressed_${res.originalName}`);
        }
      });
    });
  },

  async processCompression(container) {
    const execBtn = container.querySelector('#compress-exec-btn');
    const downloadBtn = container.querySelector('#compress-download-btn');
    execBtn.disabled = true;
    execBtn.innerHTML = `<i data-lucide="loader-2" style="width: 16px; height: 16px; animation: spin 1s linear infinite;"></i> Compressing...`;
    if (window.lucide) window.lucide.createIcons({ root: execBtn });

    this.compressedResults = [];

    for (let i = 0; i < this.files.length; i++) {
      const item = this.files[i];
      const canvas = document.createElement('canvas');
      canvas.width = item.width;
      canvas.height = item.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(item.imgElement, 0, 0);

      // Export format
      let outType = item.type;
      if (outType !== 'image/jpeg' && outType !== 'image/webp') {
        outType = 'image/jpeg';
      }

      const blob = await canvasToBlob(canvas, outType, this.quality);
      const savings = Math.max(0, Math.round(((item.size - blob.size) / item.size) * 100));

      this.compressedResults.push({
        blob,
        originalName: item.name,
        savingsPercent: savings
      });
    }

    this.renderTable(container);
    execBtn.disabled = false;
    execBtn.innerHTML = `<i data-lucide="check" style="width: 16px; height: 16px;"></i> Compressed!`;
    downloadBtn.style.display = 'inline-flex';
    Toast.success(`Successfully compressed ${this.files.length} images!`);
  },

  async downloadAll() {
    if (!this.compressedResults.length) return;
    const entries = this.compressedResults.map(r => ({
      name: `compressed_${r.originalName}`,
      blob: r.blob
    }));
    await exportFilesAsZip(entries, 'compressed_images.zip');
  },

  reset(container) {
    this.files = [];
    this.compressedResults = [];
    this.render(container);
  }
};
