/**
 * Blur Face & Privacy Censor Tool (New!)
 */
import { setupDropzone, loadImageFromFile, downloadBlob } from '../utils/file-loader.js';
import { censorRegion, canvasToBlob } from '../utils/canvas-helper.js';
import { Toast } from '../utils/toast.js';

export const BlurFaceTool = {
  id: 'blur-face',
  name: 'Blur face',
  category: 'security',
  description: 'Easily blur out faces in photos. You can also blur licence plates and other objects to hide private information.',

  imageItem: null,
  mode: 'pixelate', // 'pixelate' or 'blur'
  intensity: 16,
  censorBoxes: [],
  isDrawing: false,
  drawStart: { x: 0, y: 0 },
  currentRect: null,

  render(container) {
    container.innerHTML = `
      <div class="workspace-header">
        <div class="workspace-header-left">
          <a href="#/" class="back-btn"><i data-lucide="arrow-left" style="width: 16px; height: 16px;"></i> All Tools</a>
          <div class="workspace-title-wrap">
            <h2>Blur Face & Privacy</h2>
            <span class="tool-badge-new">New!</span>
          </div>
        </div>
        <div class="workspace-header-right">
          <button id="blur-reset-btn" class="btn-secondary" style="display:none;"><i data-lucide="refresh-cw" style="width: 15px; height: 15px;"></i> New Image</button>
          <button id="blur-download-btn" class="btn-primary btn-emerald" disabled><i data-lucide="download" style="width: 16px; height: 16px;"></i> Download Censored</button>
        </div>
      </div>

      <!-- Dropzone -->
      <div id="blur-dropzone" class="dropzone-container">
        <div class="dropzone-icon" style="background: var(--accent-blue-bg); color: var(--accent-blue);">
          <i data-lucide="shield-alert" style="width: 32px; height: 32px;"></i>
        </div>
        <div class="dropzone-title">Select Photo to Censor</div>
        <div class="dropzone-desc">Blur faces, license plates, phone numbers, or private documents</div>
        <button type="button" class="dropzone-btn"><i data-lucide="upload" style="width: 18px; height: 18px;"></i> Select Photo</button>
      </div>

      <!-- Workspace -->
      <div id="blur-workspace" class="editor-layout" style="display:none;">
        <div class="viewport-card" style="align-items: center; justify-content: center;">
          <div id="blur-canvas-wrapper" style="position: relative; display: inline-block; cursor: crosshair; max-width: 100%;">
            <canvas id="blur-main-canvas" style="display: block; max-width: 100%; max-height: 520px;"></canvas>
            <canvas id="blur-overlay-canvas" style="position: absolute; top: 0; left: 0; pointer-events: auto;"></canvas>
          </div>
          <div style="margin-top: 0.75rem; font-size: 0.8rem; color: var(--text-muted); text-align: center;">
            Click & drag over any face or area to apply censorship. You can draw multiple censor boxes.
          </div>
        </div>

        <div class="settings-panel">
          <div class="settings-group">
            <h4>Censor Effect</h4>
            <div class="chip-group" id="censor-mode-chips">
              <button class="chip-btn active" data-mode="pixelate">Mosaic Pixelate</button>
              <button class="chip-btn" data-mode="blur">Gaussian Blur</button>
            </div>
          </div>

          <div class="settings-group">
            <div class="control-row">
              <div class="control-label">
                <span>Censor Intensity / Block Size</span>
                <span id="blur-intensity-val" class="control-val">16px</span>
              </div>
              <input type="range" id="blur-intensity-slider" class="range-slider" min="6" max="40" value="16">
            </div>
          </div>

          <div class="settings-group">
            <h4>Censored Regions (<span id="censor-count">0</span>)</h4>
            <div id="censor-regions-list" style="display: flex; flex-direction: column; gap: 6px; max-height: 180px; overflow-y: auto;"></div>
          </div>

          <button id="blur-clear-all-btn" class="btn-secondary" style="width: 100%; justify-content: center;">
            <i data-lucide="trash-2" style="width: 14px; height: 14px;"></i> Clear All Censor Boxes
          </button>
        </div>
      </div>
    `;

    if (window.lucide) window.lucide.createIcons({ root: container });
    this.initEvents(container);
  },

  initEvents(container) {
    const dropzone = container.querySelector('#blur-dropzone');
    const resetBtn = container.querySelector('#blur-reset-btn');
    const downloadBtn = container.querySelector('#blur-download-btn');
    const modeChips = container.querySelectorAll('#censor-mode-chips .chip-btn');
    const slider = container.querySelector('#blur-intensity-slider');
    const valText = container.querySelector('#blur-intensity-val');
    const clearBtn = container.querySelector('#blur-clear-all-btn');
    const overlay = container.querySelector('#blur-overlay-canvas');

    setupDropzone(dropzone, async (files) => {
      if (!files.length) return;
      try {
        const item = await loadImageFromFile(files[0]);
        this.imageItem = item;
        container.querySelector('#blur-dropzone').style.display = 'none';
        container.querySelector('#blur-workspace').style.display = 'grid';
        container.querySelector('#blur-reset-btn').style.display = 'inline-flex';
        container.querySelector('#blur-download-btn').disabled = false;

        const mainC = container.querySelector('#blur-main-canvas');
        mainC.width = item.width;
        mainC.height = item.height;

        overlay.width = item.width;
        overlay.height = item.height;

        this.redrawAll(container);
      } catch (err) {
        Toast.error('Could not load image');
      }
    });

    modeChips.forEach(btn => {
      btn.addEventListener('click', () => {
        modeChips.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.mode = btn.dataset.mode;
        this.redrawAll(container);
      });
    });

    slider.addEventListener('input', (e) => {
      this.intensity = parseInt(e.target.value);
      valText.textContent = `${this.intensity}px`;
      this.redrawAll(container);
    });

    clearBtn.addEventListener('click', () => {
      this.censorBoxes = [];
      this.redrawAll(container);
      Toast.info('Cleared all censor regions');
    });

    this.setupDrawingEvents(overlay, container);

    downloadBtn.addEventListener('click', async () => {
      const mainC = container.querySelector('#blur-main-canvas');
      const blob = await canvasToBlob(mainC, 'image/png', 0.95);
      downloadBlob(blob, `censored_${this.imageItem.baseName}.png`);
      Toast.success('Censored image saved!');
    });

    resetBtn.addEventListener('click', () => {
      this.imageItem = null;
      this.censorBoxes = [];
      this.render(container);
    });
  },

  setupDrawingEvents(overlay, container) {
    const getCanvasPos = (e) => {
      const rect = overlay.getBoundingClientRect();
      const scaleX = overlay.width / rect.width;
      const scaleY = overlay.height / rect.height;
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY
      };
    };

    overlay.addEventListener('mousedown', (e) => {
      this.isDrawing = true;
      this.drawStart = getCanvasPos(e);
      this.currentRect = null;
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.isDrawing) return;
      const current = getCanvasPos(e);
      const x = Math.min(this.drawStart.x, current.x);
      const y = Math.min(this.drawStart.y, current.y);
      const w = Math.abs(current.x - this.drawStart.x);
      const h = Math.abs(current.y - this.drawStart.y);
      this.currentRect = { x, y, w, h };

      // Draw guide rect on overlay
      const ctx = overlay.getContext('2d');
      ctx.clearRect(0, 0, overlay.width, overlay.height);
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 6]);
      ctx.strokeRect(x, y, w, h);
      ctx.setLineDash([]);
    });

    window.addEventListener('mouseup', () => {
      if (!this.isDrawing) return;
      this.isDrawing = false;
      if (this.currentRect && this.currentRect.w > 10 && this.currentRect.h > 10) {
        this.censorBoxes.push({ ...this.currentRect });
        Toast.success('Region censored');
      }
      this.currentRect = null;
      const ctx = overlay.getContext('2d');
      ctx.clearRect(0, 0, overlay.width, overlay.height);
      this.redrawAll(container);
    });
  },

  redrawAll(container) {
    if (!this.imageItem) return;
    const mainC = container.querySelector('#blur-main-canvas');
    const ctx = mainC.getContext('2d');

    // 1. Draw original base image
    ctx.drawImage(this.imageItem.imgElement, 0, 0);

    // 2. Apply censor effect to each box
    this.censorBoxes.forEach(b => {
      censorRegion(ctx, b.x, b.y, b.w, b.h, this.mode, this.intensity);
    });

    // 3. Update count & list
    container.querySelector('#censor-count').textContent = this.censorBoxes.length;
    const list = container.querySelector('#censor-regions-list');
    list.innerHTML = '';
    this.censorBoxes.forEach((b, idx) => {
      const item = document.createElement('div');
      item.style.cssText = 'display: flex; justify-content: space-between; align-items: center; background: var(--bg-subtle); padding: 4px 8px; border-radius: 6px; font-size: 0.775rem;';
      item.innerHTML = `
        <span>Region #${idx + 1} (${Math.round(b.w)} × ${Math.round(b.h)})</span>
        <button data-del-idx="${idx}" style="color: var(--accent-rose); cursor: pointer;"><i data-lucide="x" style="width:14px;height:14px;"></i></button>
      `;
      list.appendChild(item);
    });

    if (window.lucide) window.lucide.createIcons({ root: list });

    list.querySelectorAll('[data-del-idx]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(e.currentTarget.dataset.delIdx);
        this.censorBoxes.splice(idx, 1);
        this.redrawAll(container);
      });
    });
  }
};
