/**
 * Remove Background Tool (New!)
 */
import { setupDropzone, loadImageFromFile, downloadBlob } from '../utils/file-loader.js';
import { removeBackgroundByColor, canvasToBlob } from '../utils/canvas-helper.js';
import { Toast } from '../utils/toast.js';

export const RemoveBgTool = {
  id: 'remove-bg',
  name: 'Remove background',
  category: 'edit',
  description: 'Quickly remove image backgrounds with high accuracy. Instantly detect objects and cut out backgrounds with ease.',

  imageItem: null,
  targetColor: { r: 255, g: 255, b: 255 },
  tolerance: 35,
  feather: 1,
  processedCanvas: null,

  render(container) {
    container.innerHTML = `
      <div class="workspace-header">
        <div class="workspace-header-left">
          <a href="#/" class="back-btn"><i data-lucide="arrow-left" style="width: 16px; height: 16px;"></i> All Tools</a>
          <div class="workspace-title-wrap">
            <h2>Remove Background</h2>
            <span class="tool-badge-new">New!</span>
          </div>
        </div>
        <div class="workspace-header-right">
          <button id="rmbg-reset-btn" class="btn-secondary" style="display:none;"><i data-lucide="refresh-cw" style="width: 15px; height: 15px;"></i> New Image</button>
          <button id="rmbg-download-btn" class="btn-primary btn-emerald" disabled><i data-lucide="download" style="width: 16px; height: 16px;"></i> Download PNG</button>
        </div>
      </div>

      <!-- Dropzone -->
      <div id="rmbg-dropzone" class="dropzone-container">
        <div class="dropzone-icon" style="background: var(--accent-emerald-bg); color: var(--accent-emerald);">
          <i data-lucide="eraser" style="width: 32px; height: 32px;"></i>
        </div>
        <div class="dropzone-title">Select Image to Remove Background</div>
        <div class="dropzone-desc">Cut out backgrounds with color keying, tolerance, and soft edge feathering</div>
        <button type="button" class="dropzone-btn" style="background: var(--accent-emerald);"><i data-lucide="upload" style="width: 18px; height: 18px;"></i> Select Image</button>
      </div>

      <!-- Workspace -->
      <div id="rmbg-workspace" class="editor-layout" style="display:none;">
        <div class="viewport-card">
          <div class="canvas-wrapper">
            <canvas id="rmbg-canvas" style="cursor: crosshair;" title="Click anywhere to sample background color"></canvas>
          </div>
          <div style="font-size: 0.8rem; color: var(--text-muted); text-align: center; margin-top: 0.75rem;">
            Tip: Click directly on the preview image above to sample the background color to remove.
          </div>
        </div>

        <div class="settings-panel">
          <div class="settings-group">
            <h4>Background Color to Cut</h4>
            <div style="display: flex; align-items: center; gap: 0.75rem;">
              <input type="color" id="rmbg-color-picker" value="#ffffff" style="width: 44px; height: 36px; border-radius: 6px; cursor: pointer;">
              <span id="rmbg-color-hex" style="font-family: var(--font-mono); font-size: 0.85rem; font-weight: 600;">#ffffff</span>
            </div>
          </div>

          <div class="settings-group">
            <div class="control-row">
              <div class="control-label">
                <span>Color Tolerance</span>
                <span id="rmbg-tol-val" class="control-val">35</span>
              </div>
              <input type="range" id="rmbg-tol-slider" class="range-slider" min="5" max="90" value="35">
            </div>

            <div class="control-row" style="margin-top: 0.75rem;">
              <div class="control-label">
                <span>Edge Feathering</span>
                <span id="rmbg-feather-val" class="control-val">1 px</span>
              </div>
              <input type="range" id="rmbg-feather-slider" class="range-slider" min="0" max="5" value="1">
            </div>
          </div>

          <button id="rmbg-reapply-btn" class="btn-primary" style="width: 100%; justify-content: center;">
            <i data-lucide="sparkles" style="width: 15px; height: 15px;"></i> Apply Knockout
          </button>
        </div>
      </div>
    `;

    if (window.lucide) window.lucide.createIcons({ root: container });
    this.initEvents(container);
  },

  initEvents(container) {
    const dropzone = container.querySelector('#rmbg-dropzone');
    const resetBtn = container.querySelector('#rmbg-reset-btn');
    const downloadBtn = container.querySelector('#rmbg-download-btn');
    const colorPicker = container.querySelector('#rmbg-color-picker');
    const colorHex = container.querySelector('#rmbg-color-hex');
    const tolSlider = container.querySelector('#rmbg-tol-slider');
    const tolVal = container.querySelector('#rmbg-tol-val');
    const featherSlider = container.querySelector('#rmbg-feather-slider');
    const featherVal = container.querySelector('#rmbg-feather-val');
    const reapplyBtn = container.querySelector('#rmbg-reapply-btn');
    const canvas = container.querySelector('#rmbg-canvas');

    setupDropzone(dropzone, async (files) => {
      if (!files.length) return;
      try {
        const item = await loadImageFromFile(files[0]);
        this.imageItem = item;
        container.querySelector('#rmbg-dropzone').style.display = 'none';
        container.querySelector('#rmbg-workspace').style.display = 'grid';
        container.querySelector('#rmbg-reset-btn').style.display = 'inline-flex';
        container.querySelector('#rmbg-download-btn').disabled = false;

        // Auto-detect top-left pixel as background color
        const tempC = document.createElement('canvas');
        tempC.width = item.width;
        tempC.height = item.height;
        const tCtx = tempC.getContext('2d');
        tCtx.drawImage(item.imgElement, 0, 0);
        const p = tCtx.getImageData(0, 0, 1, 1).data;
        this.targetColor = { r: p[0], g: p[1], b: p[2] };
        const hex = '#' + [p[0], p[1], p[2]].map(x => x.toString(16).padStart(2, '0')).join('');
        colorPicker.value = hex;
        colorHex.textContent = hex;

        this.applyRemoval(container);
      } catch (err) {
        Toast.error('Could not load image');
      }
    });

    // Eyedropper click on canvas
    canvas.addEventListener('click', (e) => {
      if (!this.imageItem) return;
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const x = Math.floor((e.clientX - rect.left) * scaleX);
      const y = Math.floor((e.clientY - rect.top) * scaleY);

      // Sample original image pixel
      const tempC = document.createElement('canvas');
      tempC.width = this.imageItem.width;
      tempC.height = this.imageItem.height;
      const tCtx = tempC.getContext('2d');
      tCtx.drawImage(this.imageItem.imgElement, 0, 0);
      const p = tCtx.getImageData(x, y, 1, 1).data;

      this.targetColor = { r: p[0], g: p[1], b: p[2] };
      const hex = '#' + [p[0], p[1], p[2]].map(x => x.toString(16).padStart(2, '0')).join('');
      colorPicker.value = hex;
      colorHex.textContent = hex;

      this.applyRemoval(container);
      Toast.info(`Sampled color ${hex}`);
    });

    colorPicker.addEventListener('input', (e) => {
      const hex = e.target.value;
      colorHex.textContent = hex;
      const num = parseInt(hex.slice(1), 16);
      this.targetColor = {
        r: (num >> 16) & 255,
        g: (num >> 8) & 255,
        b: num & 255
      };
      this.applyRemoval(container);
    });

    tolSlider.addEventListener('input', (e) => {
      this.tolerance = parseInt(e.target.value);
      tolVal.textContent = this.tolerance;
    });

    featherSlider.addEventListener('input', (e) => {
      this.feather = parseInt(e.target.value);
      featherVal.textContent = `${this.feather} px`;
    });

    reapplyBtn.addEventListener('click', () => this.applyRemoval(container));

    downloadBtn.addEventListener('click', async () => {
      if (!this.processedCanvas) return;
      const blob = await canvasToBlob(this.processedCanvas, 'image/png', 1.0);
      downloadBlob(blob, `transparent_${this.imageItem.baseName}.png`);
      Toast.success('Transparent cutout saved!');
    });

    resetBtn.addEventListener('click', () => {
      this.imageItem = null;
      this.processedCanvas = null;
      this.render(container);
    });
  },

  applyRemoval(container) {
    if (!this.imageItem) return;
    const canvas = container.querySelector('#rmbg-canvas');
    canvas.width = this.imageItem.width;
    canvas.height = this.imageItem.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(this.imageItem.imgElement, 0, 0);

    removeBackgroundByColor(canvas, this.targetColor.r, this.targetColor.g, this.targetColor.b, this.tolerance, this.feather);
    this.processedCanvas = canvas;
  }
};
