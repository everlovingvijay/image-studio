/**
 * Color Palette Extractor Tool
 */
import { setupDropzone, loadImageFromFile, downloadBlob } from '../utils/file-loader.js';
import { extractPalette, canvasToBlob } from '../utils/canvas-helper.js';
import { Toast } from '../utils/toast.js';

export const ColorPaletteTool = {
  id: 'color-palette',
  name: 'Color Palette',
  category: 'create',
  description: 'Extract dominant color palettes, HEX/RGB swatches, and color harmonies from any photo or artwork.',

  imageItem: null,
  palette: [],
  colorCount: 6,

  render(container) {
    container.innerHTML = `
      <div class="workspace-header">
        <div class="workspace-header-left">
          <a href="#/" class="back-btn"><i data-lucide="arrow-left" style="width: 16px; height: 16px;"></i> All Tools</a>
          <div class="workspace-title-wrap">
            <h2>Color Palette Extractor</h2>
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
          <i data-lucide="palette" style="width: 32px; height: 32px;"></i>
        </div>
        <div class="dropzone-title">Select an Image to Extract Palette</div>
        <div class="dropzone-desc">Generates beautiful color schemes with one-click HEX & RGB copying</div>
        <button type="button" class="dropzone-btn" style="background: var(--accent-rose);"><i data-lucide="upload" style="width: 18px; height: 18px;"></i> Select Image</button>
      </div>

      <!-- Workspace -->
      <div id="pal-workspace" class="editor-layout" style="display:none;">
        <div class="viewport-card">
          <div class="canvas-wrapper">
            <img id="pal-preview-img" style="max-width: 100%; max-height: 480px; object-fit: contain; border-radius: 8px;">
          </div>
        </div>

        <div class="settings-panel">
          <div class="settings-group">
            <h4>Color Swatches (Click to copy)</h4>
            <div id="pal-swatches-grid" style="display: flex; flex-direction: column; gap: 8px;"></div>
          </div>

          <div class="settings-group">
            <div class="control-row">
              <div class="control-label">
                <span>Number of Colors</span>
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

    setupDropzone(dropzone, async (files) => {
      if (!files.length) return;
      try {
        const item = await loadImageFromFile(files[0]);
        this.imageItem = item;
        container.querySelector('#pal-dropzone').style.display = 'none';
        container.querySelector('#pal-workspace').style.display = 'grid';
        container.querySelector('#pal-reset-btn').style.display = 'inline-flex';
        container.querySelector('#pal-download-btn').disabled = false;
        container.querySelector('#pal-preview-img').src = item.dataUrl;

        this.generatePalette(container);
      } catch (err) {
        Toast.error('Could not load image');
      }
    });

    slider.addEventListener('input', (e) => {
      this.colorCount = parseInt(e.target.value);
      countVal.textContent = this.colorCount;
      if (this.imageItem) this.generatePalette(container);
    });

    downloadBtn.addEventListener('click', () => this.downloadPaletteCard());

    resetBtn.addEventListener('click', () => {
      this.imageItem = null;
      this.palette = [];
      this.render(container);
    });
  },

  generatePalette(container) {
    if (!this.imageItem) return;
    this.palette = extractPalette(this.imageItem.imgElement, this.colorCount);
    const grid = container.querySelector('#pal-swatches-grid');
    grid.innerHTML = '';

    this.palette.forEach(c => {
      const row = document.createElement('div');
      row.style.cssText = 'display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; border-radius: 8px; border: 1px solid var(--border-color); background: var(--bg-subtle); cursor: pointer; transition: transform 0.1s ease;';
      row.title = 'Click to copy HEX code';
      row.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px;">
          <div style="width: 28px; height: 28px; border-radius: 6px; background-color: ${c.hex}; border: 1px solid rgba(0,0,0,0.15);"></div>
          <span style="font-family: var(--font-mono); font-weight: 700; font-size: 0.9rem;">${c.hex.toUpperCase()}</span>
        </div>
        <span style="font-size: 0.775rem; color: var(--text-muted);">${c.rgb}</span>
      `;
      row.addEventListener('click', () => {
        navigator.clipboard.writeText(c.hex.toUpperCase());
        Toast.success(`Copied ${c.hex.toUpperCase()} to clipboard!`);
      });
      grid.appendChild(row);
    });
  },

  async downloadPaletteCard() {
    if (!this.palette.length) return;
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 300;
    const ctx = canvas.getContext('2d');

    const swatchW = canvas.width / this.palette.length;
    this.palette.forEach((c, idx) => {
      ctx.fillStyle = c.hex;
      ctx.fillRect(idx * swatchW, 0, swatchW, 220);

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(idx * swatchW, 220, swatchW, 80);

      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 16px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(c.hex.toUpperCase(), idx * swatchW + swatchW / 2, 260);
    });

    const blob = await canvasToBlob(canvas, 'image/png', 0.95);
    downloadBlob(blob, `palette_${this.imageItem.baseName}.png`);
    Toast.success('Color palette card downloaded!');
  }
};
