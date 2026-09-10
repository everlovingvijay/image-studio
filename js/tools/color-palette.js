/**
 * Color Palette & Interactive Eyedropper Color Picker Tool
 */
import { setupDropzone, loadImageFromFile, downloadBlob } from '../utils/file-loader.js';
import { extractPalette, canvasToBlob } from '../utils/canvas-helper.js';
import { Toast } from '../utils/toast.js';

export const ColorPaletteTool = {
  id: 'color-palette',
  name: 'Color Palette',
  category: 'create',
  description: 'Extract dominant color palettes and use an interactive eyedropper color picker directly on your image.',

  imageItem: null,
  dominantPalette: [],
  sampledColors: [],
  colorCount: 6,
  eyedropperActive: true,

  render(container) {
    container.innerHTML = `
      <div class="workspace-header">
        <div class="workspace-header-left">
          <a href="#/" class="back-btn"><i data-lucide="arrow-left" style="width: 16px; height: 16px;"></i> All Tools</a>
          <div class="workspace-title-wrap">
            <h2>Color Palette & Eyedropper</h2>
          </div>
        </div>
        <div class="workspace-header-right">
          <button id="pal-reset-btn" class="btn-secondary" style="display:none;"><i data-lucide="refresh-cw" style="width: 15px; height: 15px;"></i> New Image</button>
          <button id="pal-download-btn" class="btn-primary btn-emerald" disabled><i data-lucide="download" style="width: 16px; height: 16px;"></i> Save Palette Card</button>
        </div>
      </div>

      <!-- Dropzone -->
      <div id="pal-dropzone" class="dropzone-container">
        <div class="dropzone-icon" style="background: var(--accent-rose-bg); color: var(--accent-rose);">
          <i data-lucide="pipette" style="width: 32px; height: 32px;"></i>
        </div>
        <div class="dropzone-title">Select an Image to Pick Colors & Extract Palette</div>
        <div class="dropzone-desc">Interactive eyedropper loupe to sample exact pixel colors and generate schemes</div>
        <button type="button" class="dropzone-btn" style="background: var(--accent-rose);"><i data-lucide="upload" style="width: 18px; height: 18px;"></i> Select Image</button>
      </div>

      <!-- Workspace -->
      <div id="pal-workspace" class="editor-layout" style="display:none;">
        <div class="viewport-card" style="align-items: center; justify-content: center;">
          <div id="pal-canvas-wrapper" style="position: relative; display: inline-block; cursor: crosshair; max-width: 100%;">
            <canvas id="pal-canvas" style="display: block; max-width: 100%; max-height: 500px; border-radius: 8px;"></canvas>
            <!-- Floating Zoom Loupe -->
            <div id="pal-loupe" style="display: none; position: absolute; width: 100px; height: 100px; border-radius: 50%; border: 3px solid #ffffff; box-shadow: 0 4px 14px rgba(0,0,0,0.5); pointer-events: none; overflow: hidden; transform: translate(-50%, -120%); z-index: 50; background: #000;">
              <canvas id="pal-loupe-canvas" width="100" height="100" style="display: block; width: 100%; height: 100%;"></canvas>
              <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 8px; height: 8px; border: 1.5px solid #ff0055; border-radius: 50%; pointer-events: none;"></div>
            </div>
          </div>

          <!-- Live Hover Color Bar -->
          <div id="pal-live-color-bar" style="margin-top: 1rem; display: flex; align-items: center; gap: 1rem; background: var(--bg-subtle); padding: 8px 16px; border-radius: var(--radius-full); border: 1px solid var(--border-color);">
            <div id="pal-hover-swatch" style="width: 24px; height: 24px; border-radius: 50%; border: 2px solid #fff; box-shadow: 0 1px 3px rgba(0,0,0,0.2); background: #3b82f6;"></div>
            <div style="font-size: 0.85rem; font-weight: 600;">
              Hovering: <span id="pal-hover-hex" style="font-family: var(--font-mono); color: var(--accent-blue);">#3B82F6</span>
              <span id="pal-hover-rgb" style="font-size: 0.75rem; color: var(--text-muted); margin-left: 6px;">rgb(59, 130, 246)</span>
            </div>
          </div>
        </div>

        <div class="settings-panel" style="max-height: 82vh; overflow-y: auto;">
          <!-- Eyedropper Trigger -->
          <div class="settings-group">
            <h4>Color Picker Tool</h4>
            <div style="font-size: 0.825rem; color: var(--text-secondary); line-height: 1.4; margin-bottom: 0.5rem;">
              Click anywhere on the photo above to pick that exact color and add it to your custom swatches!
            </div>
            <button id="native-eyedropper-btn" class="btn-secondary" style="width: 100%; justify-content: center; gap: 6px;">
              <i data-lucide="pipette" style="width: 15px; height: 15px; color: var(--accent-rose);"></i> Screen Eyedropper (Pick Anywhere)
            </button>
          </div>

          <!-- Sampled Colors -->
          <div class="settings-group">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <h4>Sampled Colors (<span id="sampled-count">0</span>)</h4>
              <button id="clear-sampled-btn" style="font-size: 0.75rem; color: var(--text-muted); text-decoration: underline; cursor: pointer;">Clear</button>
            </div>
            <div id="pal-sampled-list" style="display: flex; flex-direction: column; gap: 6px; max-height: 160px; overflow-y: auto;">
              <div style="font-size: 0.8rem; color: var(--text-muted); font-style: italic;">No colors picked yet. Click on the photo!</div>
            </div>
          </div>

          <!-- Dominant Extracted Palette -->
          <div class="settings-group">
            <h4>Dominant Color Palette</h4>
            <div id="pal-swatches-grid" style="display: flex; flex-direction: column; gap: 6px;"></div>
          </div>

          <div class="settings-group">
            <div class="control-row">
              <div class="control-label">
                <span>Dominant Colors Count</span>
                <span id="pal-count-val" class="control-val">6</span>
              </div>
              <input type="range" id="pal-count-slider" class="range-slider" min="4" max="10" value="6">
            </div>
          </div>
        </div>
      </div>
    `;

    if (window.lucide) window.lucide.createIcons({ root: container });
    this.initEvents(container);
  },

  initEvents(container) {
    const dropzone = container.querySelector('#pal-dropzone');
    const resetBtn = container.querySelector('#pal-reset-btn');
    const downloadBtn = container.querySelector('#pal-download-btn');
    const slider = container.querySelector('#pal-count-slider');
    const countVal = container.querySelector('#pal-count-val');
    const nativePickerBtn = container.querySelector('#native-eyedropper-btn');
    const clearSampledBtn = container.querySelector('#clear-sampled-btn');
    const canvas = container.querySelector('#pal-canvas');
    const loupe = container.querySelector('#pal-loupe');
    const loupeCanvas = container.querySelector('#pal-loupe-canvas');
    const hoverSwatch = container.querySelector('#pal-hover-swatch');
    const hoverHex = container.querySelector('#pal-hover-hex');
    const hoverRgb = container.querySelector('#pal-hover-rgb');

    setupDropzone(dropzone, async (files) => {
      if (!files.length) return;
      try {
        const item = await loadImageFromFile(files[0]);
        this.imageItem = item;
        container.querySelector('#pal-dropzone').style.display = 'none';
        container.querySelector('#pal-workspace').style.display = 'grid';
        container.querySelector('#pal-reset-btn').style.display = 'inline-flex';
        container.querySelector('#pal-download-btn').disabled = false;

        // Draw onto canvas
        canvas.width = item.width;
        canvas.height = item.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(item.imgElement, 0, 0);

        this.generateDominantPalette(container);
      } catch (err) {
        Toast.error('Could not load image');
      }
    });

    // Native Browser EyeDropper API (Chrome/Edge/Opera supported)
    if (!window.EyeDropper) {
      nativePickerBtn.style.display = 'none';
    } else {
      nativePickerBtn.addEventListener('click', async () => {
        try {
          const eyeDropper = new window.EyeDropper();
          const result = await eyeDropper.open();
          if (result && result.sRGBHex) {
            const hex = result.sRGBHex.toUpperCase();
            this.addSampledColor(hex, container);
            navigator.clipboard.writeText(hex);
            Toast.success(`Picked & copied ${hex}!`);
          }
        } catch (err) {
          // User cancelled
        }
      });
    }

    // Canvas Eyedropper Loupe & Click
    const getPixelAtEvent = (e) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const x = Math.floor((e.clientX - rect.left) * scaleX);
      const y = Math.floor((e.clientY - rect.top) * scaleY);
      const ctx = canvas.getContext('2d');
      const p = ctx.getImageData(x, y, 1, 1).data;
      const hex = '#' + [p[0], p[1], p[2]].map(val => val.toString(16).padStart(2, '0')).join('').toUpperCase();
      const rgb = `rgb(${p[0]}, ${p[1]}, ${p[2]})`;
      return { x, y, r: p[0], g: p[1], b: p[2], hex, rgb, clientX: e.clientX - rect.left, clientY: e.clientY - rect.top };
    };

    canvas.addEventListener('mousemove', (e) => {
      if (!this.imageItem) return;
      const pix = getPixelAtEvent(e);

      // Update hover bar
      hoverSwatch.style.backgroundColor = pix.hex;
      hoverHex.textContent = pix.hex;
      hoverRgb.textContent = pix.rgb;

      // Position and draw loupe (magnifying glass)
      loupe.style.display = 'block';
      loupe.style.left = `${pix.clientX}px`;
      loupe.style.top = `${pix.clientY}px`;

      const lCtx = loupeCanvas.getContext('2d');
      lCtx.imageSmoothingEnabled = false;
      lCtx.clearRect(0, 0, 100, 100);

      // Draw 10x magnified view of 10x10 area around cursor
      const sampleSize = 10;
      lCtx.drawImage(
        canvas,
        pix.x - sampleSize / 2,
        pix.y - sampleSize / 2,
        sampleSize,
        sampleSize,
        0,
        0,
        100,
        100
      );
    });

    canvas.addEventListener('mouseleave', () => {
      loupe.style.display = 'none';
    });

    canvas.addEventListener('click', (e) => {
      if (!this.imageItem) return;
      const pix = getPixelAtEvent(e);
      this.addSampledColor(pix.hex, container);
      navigator.clipboard.writeText(pix.hex);
      Toast.success(`Sampled & copied ${pix.hex}!`);
    });

    clearSampledBtn.addEventListener('click', () => {
      this.sampledColors = [];
      this.renderSampledList(container);
    });

    slider.addEventListener('input', (e) => {
      this.colorCount = parseInt(e.target.value);
      countVal.textContent = this.colorCount;
      if (this.imageItem) this.generateDominantPalette(container);
    });

    downloadBtn.addEventListener('click', () => this.downloadPaletteCard());

    resetBtn.addEventListener('click', () => {
      this.imageItem = null;
      this.dominantPalette = [];
      this.sampledColors = [];
      this.render(container);
    });
  },

  addSampledColor(hex, container) {
    if (!this.sampledColors.includes(hex)) {
      this.sampledColors.unshift(hex);
      if (this.sampledColors.length > 8) this.sampledColors.pop();
      this.renderSampledList(container);
    }
  },

  renderSampledList(container) {
    const list = container.querySelector('#pal-sampled-list');
    const countBadge = container.querySelector('#sampled-count');
    countBadge.textContent = this.sampledColors.length;

    if (!this.sampledColors.length) {
      list.innerHTML = '<div style="font-size: 0.8rem; color: var(--text-muted); font-style: italic;">No colors picked yet. Click on the photo!</div>';
      return;
    }

    list.innerHTML = '';
    this.sampledColors.forEach(hex => {
      const row = document.createElement('div');
      row.style.cssText = 'display: flex; align-items: center; justify-content: space-between; padding: 6px 10px; border-radius: 6px; border: 1px solid var(--border-color); background: var(--bg-subtle); cursor: pointer;';
      row.title = 'Click to copy HEX code';
      row.innerHTML = `
        <div style="display: flex; align-items: center; gap: 8px;">
          <div style="width: 22px; height: 22px; border-radius: 4px; background-color: ${hex}; border: 1px solid rgba(0,0,0,0.2);"></div>
          <span style="font-family: var(--font-mono); font-weight: 700; font-size: 0.85rem;">${hex}</span>
        </div>
        <span style="font-size: 0.725rem; color: var(--accent-blue); font-weight: 600;">Copy</span>
      `;
      row.addEventListener('click', () => {
        navigator.clipboard.writeText(hex);
        Toast.success(`Copied ${hex}!`);
      });
      list.appendChild(row);
    });
  },

  generateDominantPalette(container) {
    if (!this.imageItem) return;
    this.dominantPalette = extractPalette(this.imageItem.imgElement, this.colorCount);
    const grid = container.querySelector('#pal-swatches-grid');
    grid.innerHTML = '';

    this.dominantPalette.forEach(c => {
      const row = document.createElement('div');
      row.style.cssText = 'display: flex; align-items: center; justify-content: space-between; padding: 6px 10px; border-radius: 6px; border: 1px solid var(--border-color); background: var(--bg-subtle); cursor: pointer;';
      row.title = 'Click to copy HEX code';
      row.innerHTML = `
        <div style="display: flex; align-items: center; gap: 8px;">
          <div style="width: 22px; height: 22px; border-radius: 4px; background-color: ${c.hex}; border: 1px solid rgba(0,0,0,0.15);"></div>
          <span style="font-family: var(--font-mono); font-weight: 700; font-size: 0.85rem;">${c.hex.toUpperCase()}</span>
        </div>
        <span style="font-size: 0.725rem; color: var(--text-muted);">${c.rgb}</span>
      `;
      row.addEventListener('click', () => {
        navigator.clipboard.writeText(c.hex.toUpperCase());
        Toast.success(`Copied ${c.hex.toUpperCase()} to clipboard!`);
      });
      grid.appendChild(row);
    });
  },

  async downloadPaletteCard() {
    const allColors = this.sampledColors.length > 0 
      ? this.sampledColors 
      : this.dominantPalette.map(c => c.hex);

    if (!allColors.length) return;

    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 320;
    const ctx = canvas.getContext('2d');

    const swatchW = canvas.width / allColors.length;
    allColors.forEach((hex, idx) => {
      ctx.fillStyle = hex;
      ctx.fillRect(idx * swatchW, 0, swatchW, 240);

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(idx * swatchW, 240, swatchW, 80);

      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 15px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(hex.toUpperCase(), idx * swatchW + swatchW / 2, 285);
    });

    const blob = await canvasToBlob(canvas, 'image/png', 0.95);
    downloadBlob(blob, `palette_${this.imageItem.baseName}.png`);
    Toast.success('Color palette card downloaded!');
  }
};
