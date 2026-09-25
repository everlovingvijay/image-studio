/**
 * Blur Face & Privacy Censor Tool — Precision Interactive Blur & Pixelation
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
  mode: 'blur', // 'blur' or 'pixelate'
  intensity: 18,
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
            <h2>Blur Face &amp; Privacy</h2>
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
        <div class="dropzone-desc">Click &amp; drag over faces, license plates, numbers, or confidential info</div>
        <button type="button" class="dropzone-btn"><i data-lucide="upload" style="width: 18px; height: 18px;"></i> Select Photo</button>
      </div>

      <!-- Workspace -->
      <div id="blur-workspace" class="editor-layout" style="display:none;">
        <div class="viewport-card" style="align-items: center; justify-content: center; user-select: none;">
          <div id="blur-canvas-wrapper" style="position: relative; display: inline-block; max-width: 100%;">
            <canvas id="blur-canvas" style="display: block; max-width: 100%; max-height: 520px; border-radius: var(--radius-md); box-shadow: 0 4px 20px rgba(0,0,0,0.08); cursor: crosshair;"></canvas>
          </div>
          <div style="margin-top: 0.75rem; font-size: 0.8rem; color: var(--text-muted); text-align: center;">
            Click and drag directly over any face or region to censor. Draw multiple boxes as needed.
          </div>
        </div>

        <div class="settings-panel">
          <div class="settings-group">
            <h4>Censor Effect</h4>
            <div class="chip-group" id="censor-mode-chips">
              <button class="chip-btn active" data-mode="blur">
                <i data-lucide="eye-off" style="width:14px;height:14px;"></i> Gaussian Blur
              </button>
              <button class="chip-btn" data-mode="pixelate">
                <i data-lucide="grid" style="width:14px;height:14px;"></i> Mosaic Pixelate
              </button>
            </div>
          </div>

          <div class="settings-group">
            <div class="control-row">
              <div class="control-label">
                <span>Censor Intensity</span>
                <span id="blur-intensity-val" class="control-val">18px</span>
              </div>
              <input type="range" id="blur-intensity-slider" class="range-slider" min="6" max="45" value="18">
            </div>
          </div>

          <div class="settings-group">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
              <h4 style="margin: 0;">Censored Regions (<span id="censor-count">0</span>)</h4>
              <button id="blur-undo-btn" style="font-size: 0.75rem; color: var(--accent-blue); text-decoration: underline; cursor: pointer;">
                Undo Last
              </button>
            </div>
            <div id="censor-regions-list" style="display: flex; flex-direction: column; gap: 6px; max-height: 180px; overflow-y: auto;">
              <div style="font-size: 0.8rem; color: var(--text-muted); font-style: italic;">No regions censored yet. Draw on the photo!</div>
            </div>
          </div>

          <button id="blur-clear-all-btn" class="btn-secondary" style="width: 100%; justify-content: center; color: var(--accent-rose);">
            <i data-lucide="trash-2" style="width: 14px; height: 14px;"></i> Clear All Censor Regions
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
    const undoBtn = container.querySelector('#blur-undo-btn');
    const canvas = container.querySelector('#blur-canvas');

    setupDropzone(dropzone, async (files) => {
      if (!files.length) return;
      try {
        const item = await loadImageFromFile(files[0]);
        this.imageItem = item;
        this.censorBoxes = [];

        container.querySelector('#blur-dropzone').style.display = 'none';
        container.querySelector('#blur-workspace').style.display = 'grid';
        container.querySelector('#blur-reset-btn').style.display = 'inline-flex';
        container.querySelector('#blur-download-btn').disabled = false;

        canvas.width = item.width;
        canvas.height = item.height;

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

    undoBtn.addEventListener('click', () => {
      if (this.censorBoxes.length > 0) {
        this.censorBoxes.pop();
        this.redrawAll(container);
        Toast.info('Removed last censor region');
      }
    });

    clearBtn.addEventListener('click', () => {
      this.censorBoxes = [];
      this.redrawAll(container);
      Toast.info('Cleared all censor regions');
    });

    this.setupPointerEvents(canvas, container);

    downloadBtn.addEventListener('click', async () => {
      // Ensure drawing guides are cleared before export
      this.currentRect = null;
      this.redrawAll(container);

      const outType = this.imageItem.type === 'image/png' ? 'image/png' : 'image/jpeg';
      const blob = await canvasToBlob(canvas, outType, 0.95);
      downloadBlob(blob, `censored_${this.imageItem.baseName}.${outType === 'image/png' ? 'png' : 'jpg'}`);
      Toast.success('Censored photo saved successfully!');
    });

    resetBtn.addEventListener('click', () => {
      this.imageItem = null;
      this.censorBoxes = [];
      this.render(container);
    });
  },

  setupPointerEvents(canvas, container) {
    const getCanvasPos = (e) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      return {
        x: Math.max(0, Math.min(canvas.width, (e.clientX - rect.left) * scaleX)),
        y: Math.max(0, Math.min(canvas.height, (e.clientY - rect.top) * scaleY))
      };
    };

    canvas.addEventListener('pointerdown', (e) => {
      if (!this.imageItem) return;
      this.isDrawing = true;
      this.drawStart = getCanvasPos(e);
      this.currentRect = null;
      canvas.setPointerCapture(e.pointerId);
    });

    canvas.addEventListener('pointermove', (e) => {
      if (!this.isDrawing) return;
      const current = getCanvasPos(e);
      const x = Math.min(this.drawStart.x, current.x);
      const y = Math.min(this.drawStart.y, current.y);
      const w = Math.abs(current.x - this.drawStart.x);
      const h = Math.abs(current.y - this.drawStart.y);

      this.currentRect = { x, y, w, h };
      this.redrawAll(container);
    });

    const endDraw = (e) => {
      if (!this.isDrawing) return;
      this.isDrawing = false;
      try { canvas.releasePointerCapture(e.pointerId); } catch (_) {}

      if (this.currentRect && this.currentRect.w > 12 && this.currentRect.h > 12) {
        this.censorBoxes.push({
          ...this.currentRect,
          mode: this.mode,
          intensity: this.intensity
        });
        Toast.success('Region censored!');
      }
      this.currentRect = null;
      this.redrawAll(container);
    };

    canvas.addEventListener('pointerup', endDraw);
    canvas.addEventListener('pointercancel', endDraw);
  },

  redrawAll(container) {
    if (!this.imageItem) return;
    const canvas = container.querySelector('#blur-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;

    // 1. Draw original base image
    ctx.drawImage(this.imageItem.imgElement, 0, 0);

    // 2. Apply censor effect to each committed box
    this.censorBoxes.forEach(b => {
      censorRegion(ctx, b.x, b.y, b.w, b.h, b.mode || this.mode, b.intensity || this.intensity);
    });

    // 3. If currently drawing a box, render live preview & guide rect
    if (this.isDrawing && this.currentRect) {
      const cr = this.currentRect;

      // Draw real-time blur preview inside active box
      if (cr.w > 6 && cr.h > 6) {
        censorRegion(ctx, cr.x, cr.y, cr.w, cr.h, this.mode, this.intensity);
      }

      // Draw red dashed guide box with subtle red fill
      ctx.save();
      ctx.fillStyle = 'rgba(239, 68, 68, 0.15)';
      ctx.fillRect(cr.x, cr.y, cr.w, cr.h);
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = Math.max(2, Math.round(Math.min(w, h) * 0.003));
      ctx.setLineDash([8, 6]);
      ctx.strokeRect(cr.x, cr.y, cr.w, cr.h);
      ctx.restore();
    }

    // 4. Update count and region list
    const countEl = container.querySelector('#censor-count');
    if (countEl) countEl.textContent = this.censorBoxes.length;

    const list = container.querySelector('#censor-regions-list');
    if (list) {
      list.innerHTML = '';
      if (this.censorBoxes.length === 0) {
        list.innerHTML = '<div style="font-size: 0.8rem; color: var(--text-muted); font-style: italic;">No regions censored yet. Draw on the photo!</div>';
      } else {
        this.censorBoxes.forEach((b, idx) => {
          const item = document.createElement('div');
          item.style.cssText = 'display: flex; justify-content: space-between; align-items: center; background: var(--bg-subtle); padding: 6px 10px; border-radius: 6px; font-size: 0.8rem; border: 1px solid var(--border-color);';
          item.innerHTML = `
            <div>
              <strong>Region #${idx + 1}</strong>
              <span style="color: var(--text-muted); font-size: 0.725rem; margin-left: 6px;">${Math.round(b.w)} × ${Math.round(b.h)}px (${b.mode})</span>
            </div>
            <button data-del-idx="${idx}" style="color: var(--accent-rose); cursor: pointer; padding: 2px 4px;" title="Delete this region">
              <i data-lucide="x" style="width:14px;height:14px;"></i>
            </button>
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
    }
  }
};
