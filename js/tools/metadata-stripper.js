/**
 * EXIF & Metadata Stripper Tool
 */
import { setupDropzone, loadImageFromFile, downloadBlob } from '../utils/file-loader.js';
import { canvasToBlob } from '../utils/canvas-helper.js';
import { exportFilesAsZip } from '../utils/zip-export.js';
import { Toast } from '../utils/toast.js';

export const MetadataStripperTool = {
  id: 'metadata-stripper',
  name: 'Strip Metadata (EXIF)',
  category: 'security',
  description: 'Clean photos of sensitive camera serials, GPS location coordinates, and timestamps before sharing online.',

  files: [],
  cleanedResults: [],

  render(container) {
    container.innerHTML = `
      <div class="workspace-header">
        <div class="workspace-header-left">
          <a href="#/" class="back-btn"><i data-lucide="arrow-left" style="width: 16px; height: 16px;"></i> All Tools</a>
          <div class="workspace-title-wrap">
            <h2>Strip Metadata (EXIF)</h2>
            <span id="exif-count-badge" class="brand-badge" style="display:none;">0 images</span>
          </div>
        </div>
        <div class="workspace-header-right">
          <button id="exif-reset-btn" class="btn-secondary" style="display:none;"><i data-lucide="refresh-cw" style="width: 15px; height: 15px;"></i> Clear</button>
          <button id="exif-exec-btn" class="btn-primary btn-emerald" disabled><i data-lucide="shield-check" style="width: 16px; height: 16px;"></i> Strip Metadata & Download</button>
        </div>
      </div>

      <!-- Dropzone -->
      <div id="exif-dropzone" class="dropzone-container">
        <div class="dropzone-icon" style="background: var(--accent-emerald-bg); color: var(--accent-emerald);">
          <i data-lucide="shield-check" style="width: 32px; height: 32px;"></i>
        </div>
        <div class="dropzone-title">Select Images to Sanitize</div>
        <div class="dropzone-desc">Removes GPS coordinates, camera model, date/time, and device serial numbers</div>
        <button type="button" class="dropzone-btn" style="background: var(--accent-emerald);"><i data-lucide="upload" style="width: 18px; height: 18px;"></i> Select Images</button>
        <div class="dropzone-formats">100% Client-Side • Guarantees Zero Location Leaks</div>
      </div>

      <!-- Workspace -->
      <div id="exif-workspace" class="editor-layout" style="display:none;">
        <div class="viewport-card">
          <h3 style="font-size: 1.1rem; font-weight: 700; margin-bottom: 1rem;">Images Ready for Sanitization</h3>
          <div id="exif-queue-grid" class="batch-grid" style="max-height: 440px;"></div>
        </div>

        <div class="settings-panel">
          <div class="settings-group">
            <h4>What Gets Cleaned?</h4>
            <div style="display: flex; flex-direction: column; gap: 8px; font-size: 0.85rem;">
              <div style="display: flex; align-items: center; gap: 8px; color: #059669; font-weight: 600;">
                <i data-lucide="check-circle" style="width:16px;height:16px;"></i> GPS & Geo-Coordinates (Latitude/Longitude)
              </div>
              <div style="display: flex; align-items: center; gap: 8px; color: #059669; font-weight: 600;">
                <i data-lucide="check-circle" style="width:16px;height:16px;"></i> Camera & Phone Model Name
              </div>
              <div style="display: flex; align-items: center; gap: 8px; color: #059669; font-weight: 600;">
                <i data-lucide="check-circle" style="width:16px;height:16px;"></i> Date, Timestamp & Timezone
              </div>
              <div style="display: flex; align-items: center; gap: 8px; color: #059669; font-weight: 600;">
                <i data-lucide="check-circle" style="width:16px;height:16px;"></i> Serial Numbers & Software History
              </div>
            </div>
          </div>
          <p style="font-size: 0.8rem; color: var(--text-muted); line-height: 1.4;">
            By redrawing the raw pixel buffer into an unpolluted canvas context, all non-visual metadata tags are permanently scrubbed.
          </p>
        </div>
      </div>
    `;

    if (window.lucide) window.lucide.createIcons({ root: container });
    this.initEvents(container);
  },

  initEvents(container) {
    const dropzone = container.querySelector('#exif-dropzone');
    const resetBtn = container.querySelector('#exif-reset-btn');
    const execBtn = container.querySelector('#exif-exec-btn');

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
        container.querySelector('#exif-dropzone').style.display = 'none';
        container.querySelector('#exif-workspace').style.display = 'grid';
        container.querySelector('#exif-reset-btn').style.display = 'inline-flex';
        container.querySelector('#exif-count-badge').style.display = 'inline-block';
        container.querySelector('#exif-count-badge').textContent = `${this.files.length} images`;
        container.querySelector('#exif-exec-btn').disabled = false;
        this.renderQueue(container);
      }
    });

    execBtn.addEventListener('click', () => this.processSanitization());
    resetBtn.addEventListener('click', () => this.reset(container));
  },

  renderQueue(container) {
    const grid = container.querySelector('#exif-queue-grid');
    grid.innerHTML = '';
    this.files.forEach(item => {
      const card = document.createElement('div');
      card.className = 'batch-card';
      card.innerHTML = `
        <img class="batch-thumb" src="${item.dataUrl}" alt="${item.name}">
        <div class="batch-info">
          <div class="batch-name" title="${item.name}">${item.name}</div>
          <div class="batch-meta">${item.width} × ${item.height} • ${item.formattedSize}</div>
        </div>
      `;
      grid.appendChild(card);
    });
  },

  async processSanitization() {
    this.cleanedResults = [];
    for (const item of this.files) {
      const canvas = document.createElement('canvas');
      canvas.width = item.width;
      canvas.height = item.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(item.imgElement, 0, 0);

      const outType = item.type === 'image/png' ? 'image/png' : 'image/jpeg';
      const blob = await canvasToBlob(canvas, outType, 0.98);
      this.cleanedResults.push({
        blob,
        name: `clean_${item.name}`
      });
    }

    if (this.cleanedResults.length === 1) {
      downloadBlob(this.cleanedResults[0].blob, this.cleanedResults[0].name);
    } else {
      await exportFilesAsZip(this.cleanedResults, 'sanitized_images.zip');
    }
    Toast.success('Sanitized images downloaded safely!');
  },

  reset(container) {
    this.files = [];
    this.cleanedResults = [];
    this.render(container);
  }
};
