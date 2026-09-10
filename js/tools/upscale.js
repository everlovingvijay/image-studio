/**
 * Upscale Image Tool (New!)
 */
import { setupDropzone, loadImageFromFile, downloadBlob } from '../utils/file-loader.js';
import { upscaleImage, canvasToBlob } from '../utils/canvas-helper.js';
import { Toast } from '../utils/toast.js';

export const UpscaleTool = {
  id: 'upscale',
  name: 'Upscale Image',
  category: 'optimize',
  description: 'Enlarge your images with high resolution. Easily increase the size of your JPG and PNG images while maintaining visual quality.',

  imageItem: null,
  scaleFactor: 2, // 2x or 4x
  sharpen: 0.35,
  upscaledCanvas: null,

  render(container) {
    container.innerHTML = `
      <div class="workspace-header">
        <div class="workspace-header-left">
          <a href="#/" class="back-btn"><i data-lucide="arrow-left" style="width: 16px; height: 16px;"></i> All Tools</a>
          <div class="workspace-title-wrap">
            <h2>Upscale Image</h2>
            <span class="tool-badge-new">New!</span>
          </div>
        </div>
        <div class="workspace-header-right">
          <button id="upscale-reset-btn" class="btn-secondary" style="display:none;"><i data-lucide="refresh-cw" style="width: 15px; height: 15px;"></i> New Image</button>
          <button id="upscale-exec-btn" class="btn-primary" disabled><i data-lucide="sparkles" style="width: 16px; height: 16px;"></i> Upscale Image</button>
          <button id="upscale-download-btn" class="btn-primary btn-emerald" style="display:none;"><i data-lucide="download" style="width: 16px; height: 16px;"></i> Download Ultra-Res</button>
        </div>
      </div>

      <!-- Dropzone -->
      <div id="upscale-dropzone" class="dropzone-container">
        <div class="dropzone-icon" style="background: var(--accent-emerald-bg); color: var(--accent-emerald);">
          <i data-lucide="maximize" style="width: 32px; height: 32px;"></i>
        </div>
        <div class="dropzone-title">Select an Image to Upscale</div>
        <div class="dropzone-desc">Increase resolution 2x or 4x with smart edge enhancement</div>
        <button type="button" class="dropzone-btn" style="background: var(--accent-emerald);"><i data-lucide="upload" style="width: 18px; height: 18px;"></i> Select Image</button>
      </div>

      <!-- Workspace -->
      <div id="upscale-workspace" class="editor-layout" style="display:none;">
        <div class="viewport-card" style="align-items: center; justify-content: center;">
          <div class="canvas-wrapper" style="width: 100%;">
            <canvas id="upscale-preview-canvas"></canvas>
          </div>
          <div id="upscale-dimensions-pill" style="margin-top: 1rem; font-size: 0.85rem; color: var(--text-secondary); font-weight: 600;"></div>
        </div>

        <div class="settings-panel">
          <div class="settings-group">
            <h4>Upscale Factor</h4>
            <div class="chip-group" id="upscale-factors">
              <button class="chip-btn active" data-scale="2">2X Resolution</button>
              <button class="chip-btn" data-scale="4">4X Ultra HD</button>
            </div>
          </div>

          <div class="settings-group">
            <div class="control-row">
              <div class="control-label">
                <span>Edge Sharpening</span>
                <span id="sharpen-val" class="control-val">35%</span>
              </div>
              <input type="range" id="sharpen-slider" class="range-slider" min="0" max="80" value="35">
            </div>
            <p style="font-size: 0.775rem; color: var(--text-muted);">
              Uses an unsharp masking convolution filter to eliminate blurriness and restore crisp details.
            </p>
          </div>
        </div>
      </div>
    `;

    if (window.lucide) window.lucide.createIcons({ root: container });
    this.initEvents(container);
  },

  initEvents(container) {
    const dropzone = container.querySelector('#upscale-dropzone');
    const resetBtn = container.querySelector('#upscale-reset-btn');
    const execBtn = container.querySelector('#upscale-exec-btn');
    const downloadBtn = container.querySelector('#upscale-download-btn');
    const factors = container.querySelectorAll('#upscale-factors .chip-btn');
    const slider = container.querySelector('#sharpen-slider');
    const sharpenVal = container.querySelector('#sharpen-val');

    setupDropzone(dropzone, async (files) => {
      if (!files.length) return;
      try {
        const item = await loadImageFromFile(files[0]);
        this.imageItem = item;
        container.querySelector('#upscale-dropzone').style.display = 'none';
        container.querySelector('#upscale-workspace').style.display = 'grid';
        container.querySelector('#upscale-reset-btn').style.display = 'inline-flex';
        container.querySelector('#upscale-exec-btn').disabled = false;

        const previewCanvas = container.querySelector('#upscale-preview-canvas');
        previewCanvas.width = item.width;
        previewCanvas.height = item.height;
        const ctx = previewCanvas.getContext('2d');
        ctx.drawImage(item.imgElement, 0, 0);

        this.updateDimensionsInfo(container);
      } catch (err) {
        Toast.error('Could not load image');
      }
    });

    factors.forEach(btn => {
      btn.addEventListener('click', () => {
        factors.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.scaleFactor = parseInt(btn.dataset.scale);
        this.updateDimensionsInfo(container);
      });
    });

    slider.addEventListener('input', (e) => {
      const val = parseInt(e.target.value);
      this.sharpen = val / 100;
      sharpenVal.textContent = `${val}%`;
    });

    execBtn.addEventListener('click', () => this.processUpscale(container));

    downloadBtn.addEventListener('click', async () => {
      if (!this.upscaledCanvas) return;
      const blob = await canvasToBlob(this.upscaledCanvas, 'image/png', 0.95);
      downloadBlob(blob, `upscaled_${this.scaleFactor}x_${this.imageItem.baseName}.png`);
      Toast.success('Upscaled image saved!');
    });

    resetBtn.addEventListener('click', () => {
      this.imageItem = null;
      this.upscaledCanvas = null;
      this.render(container);
    });
  },

  updateDimensionsInfo(container) {
    if (!this.imageItem) return;
    const targetW = this.imageItem.width * this.scaleFactor;
    const targetH = this.imageItem.height * this.scaleFactor;
    container.querySelector('#upscale-dimensions-pill').innerHTML = `
      Original: <strong>${this.imageItem.width} × ${this.imageItem.height}</strong> &rarr; 
      Upscaled: <strong style="color: var(--accent-emerald);">${targetW} × ${targetH} (${this.scaleFactor}X)</strong>
    `;
  },

  async processUpscale(container) {
    const execBtn = container.querySelector('#upscale-exec-btn');
    const downloadBtn = container.querySelector('#upscale-download-btn');
    execBtn.disabled = true;
    execBtn.innerHTML = `<i data-lucide="loader-2" style="width: 16px; height: 16px; animation: spin 1s linear infinite;"></i> Processing...`;
    if (window.lucide) window.lucide.createIcons({ root: execBtn });

    // Allow UI to repaint
    await new Promise(r => setTimeout(r, 50));

    this.upscaledCanvas = upscaleImage(this.imageItem.imgElement, this.scaleFactor, this.sharpen);

    const preview = container.querySelector('#upscale-preview-canvas');
    preview.width = this.upscaledCanvas.width;
    preview.height = this.upscaledCanvas.height;
    const ctx = preview.getContext('2d');
    ctx.drawImage(this.upscaledCanvas, 0, 0);

    execBtn.disabled = false;
    execBtn.innerHTML = `<i data-lucide="check" style="width: 16px; height: 16px;"></i> Upscaled!`;
    downloadBtn.style.display = 'inline-flex';
    Toast.success(`Image upscaled to ${this.upscaledCanvas.width} × ${this.upscaledCanvas.height}!`);
  }
};
