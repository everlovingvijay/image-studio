/**
 * Watermark IMAGE Tool
 */
import { setupDropzone, loadImageFromFile, downloadBlob } from '../utils/file-loader.js';
import { canvasToBlob } from '../utils/canvas-helper.js';
import { exportFilesAsZip } from '../utils/zip-export.js';
import { Toast } from '../utils/toast.js';

export const WatermarkTool = {
  id: 'watermark',
  name: 'Watermark IMAGE',
  category: 'security',
  description: 'Stamp an image or text over your images in seconds. Choose the typography, transparency and position.',

  files: [],
  watermarkText: 'CONFIDENTIAL',
  textColor: '#ffffff',
  fontSize: 48,
  opacity: 0.6,
  rotation: -30,
  position: 'center', // 'tl', 'tc', 'tr', 'cl', 'center', 'cr', 'bl', 'bc', 'br', 'tile'
  watermarkedResults: [],

  render(container) {
    container.innerHTML = `
      <div class="workspace-header">
        <div class="workspace-header-left">
          <a href="#/" class="back-btn"><i data-lucide="arrow-left" style="width: 16px; height: 16px;"></i> All Tools</a>
          <div class="workspace-title-wrap">
            <h2>Watermark IMAGE</h2>
            <span id="wm-count-badge" class="brand-badge" style="display:none;">0 images</span>
          </div>
        </div>
        <div class="workspace-header-right">
          <button id="wm-reset-btn" class="btn-secondary" style="display:none;"><i data-lucide="refresh-cw" style="width: 15px; height: 15px;"></i> Clear</button>
          <button id="wm-exec-btn" class="btn-primary" disabled><i data-lucide="stamp" style="width: 16px; height: 16px;"></i> Apply Watermark</button>
          <button id="wm-download-btn" class="btn-primary btn-emerald" style="display:none;"><i data-lucide="download" style="width: 16px; height: 16px;"></i> Download All (ZIP)</button>
        </div>
      </div>

      <!-- Dropzone -->
      <div id="wm-dropzone" class="dropzone-container">
        <div class="dropzone-icon" style="background: var(--accent-blue-bg); color: var(--accent-blue);">
          <i data-lucide="stamp" style="width: 32px; height: 32px;"></i>
        </div>
        <div class="dropzone-title">Select Images to Watermark</div>
        <div class="dropzone-desc">Batch stamp custom text, copyright notices, or logo watermarks</div>
        <button type="button" class="dropzone-btn"><i data-lucide="upload" style="width: 18px; height: 18px;"></i> Select Images</button>
      </div>

      <!-- Workspace -->
      <div id="wm-workspace" class="editor-layout" style="display:none;">
        <div class="viewport-card">
          <div class="canvas-wrapper">
            <canvas id="wm-canvas"></canvas>
          </div>
        </div>

        <div class="settings-panel">
          <div class="settings-group">
            <label class="control-label">Watermark Text</label>
            <input type="text" id="wm-text-input" class="text-input" value="CONFIDENTIAL">
          </div>

          <div class="settings-group">
            <h4>Position (9-Point Grid)</h4>
            <div class="grid-anchor-selector" id="wm-grid-anchors">
              <button class="anchor-cell" data-pos="tl" title="Top-Left"><i data-lucide="arrow-up-left" style="width:14px;height:14px;"></i></button>
              <button class="anchor-cell" data-pos="tc" title="Top-Center"><i data-lucide="arrow-up" style="width:14px;height:14px;"></i></button>
              <button class="anchor-cell" data-pos="tr" title="Top-Right"><i data-lucide="arrow-up-right" style="width:14px;height:14px;"></i></button>
              <button class="anchor-cell" data-pos="cl" title="Center-Left"><i data-lucide="arrow-left" style="width:14px;height:14px;"></i></button>
              <button class="anchor-cell active" data-pos="center" title="Center"><i data-lucide="circle-dot" style="width:14px;height:14px;"></i></button>
              <button class="anchor-cell" data-pos="cr" title="Center-Right"><i data-lucide="arrow-right" style="width:14px;height:14px;"></i></button>
              <button class="anchor-cell" data-pos="bl" title="Bottom-Left"><i data-lucide="arrow-down-left" style="width:14px;height:14px;"></i></button>
              <button class="anchor-cell" data-pos="bc" title="Bottom-Center"><i data-lucide="arrow-down" style="width:14px;height:14px;"></i></button>
              <button class="anchor-cell" data-pos="br" title="Bottom-Right"><i data-lucide="arrow-down-right" style="width:14px;height:14px;"></i></button>
            </div>
            <button id="wm-tile-btn" class="chip-btn" style="margin-top: 0.5rem; width: 100%; justify-content: center; text-align: center;">
              Tile Across Entire Image
            </button>
          </div>

          <div class="settings-group">
            <div class="control-row">
              <div class="control-label"><span>Opacity</span><span id="wm-opac-val" class="control-val">60%</span></div>
              <input type="range" id="wm-opac-slider" class="range-slider" min="10" max="100" value="60">
            </div>

            <div class="control-row" style="margin-top: 0.5rem;">
              <div class="control-label"><span>Rotation</span><span id="wm-rot-val" class="control-val">-30°</span></div>
              <input type="range" id="wm-rot-slider" class="range-slider" min="-180" max="180" value="-30">
            </div>

            <div class="control-row" style="margin-top: 0.5rem;">
              <div class="control-label"><span>Font Size</span><span id="wm-size-val" class="control-val">48px</span></div>
              <input type="range" id="wm-size-slider" class="range-slider" min="18" max="140" value="48">
            </div>

            <div style="display: flex; align-items: center; gap: 0.75rem; margin-top: 0.5rem;">
              <label class="control-label" style="margin: 0;">Color:</label>
              <input type="color" id="wm-color-picker" value="#ffffff" style="width: 38px; height: 32px; border-radius: 6px; cursor: pointer;">
            </div>
          </div>
        </div>
      </div>
    `;

    if (window.lucide) window.lucide.createIcons({ root: container });
    this.initEvents(container);
  },

  initEvents(container) {
    const dropzone = container.querySelector('#wm-dropzone');
    const resetBtn = container.querySelector('#wm-reset-btn');
    const execBtn = container.querySelector('#wm-exec-btn');
    const downloadBtn = container.querySelector('#wm-download-btn');
    const txtInput = container.querySelector('#wm-text-input');
    const anchors = container.querySelectorAll('#wm-grid-anchors .anchor-cell');
    const tileBtn = container.querySelector('#wm-tile-btn');
    const opacSlider = container.querySelector('#wm-opac-slider');
    const opacVal = container.querySelector('#wm-opac-val');
    const rotSlider = container.querySelector('#wm-rot-slider');
    const rotVal = container.querySelector('#wm-rot-val');
    const sizeSlider = container.querySelector('#wm-size-slider');
    const sizeVal = container.querySelector('#wm-size-val');
    const colorPicker = container.querySelector('#wm-color-picker');

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
        container.querySelector('#wm-dropzone').style.display = 'none';
        container.querySelector('#wm-workspace').style.display = 'grid';
        container.querySelector('#wm-reset-btn').style.display = 'inline-flex';
        container.querySelector('#wm-count-badge').style.display = 'inline-block';
        container.querySelector('#wm-count-badge').textContent = `${this.files.length} images`;
        container.querySelector('#wm-exec-btn').disabled = false;
        this.drawPreview(container);
      }
    });

    txtInput.addEventListener('input', (e) => {
      this.watermarkText = e.target.value;
      this.drawPreview(container);
    });

    anchors.forEach(cell => {
      cell.addEventListener('click', () => {
        anchors.forEach(c => c.classList.remove('active'));
        tileBtn.classList.remove('active');
        cell.classList.add('active');
        this.position = cell.dataset.pos;
        this.drawPreview(container);
      });
    });

    tileBtn.addEventListener('click', () => {
      anchors.forEach(c => c.classList.remove('active'));
      tileBtn.classList.add('active');
      this.position = 'tile';
      this.drawPreview(container);
    });

    opacSlider.addEventListener('input', (e) => {
      this.opacity = parseInt(e.target.value) / 100;
      opacVal.textContent = `${e.target.value}%`;
      this.drawPreview(container);
    });

    rotSlider.addEventListener('input', (e) => {
      this.rotation = parseInt(e.target.value);
      rotVal.textContent = `${e.target.value}°`;
      this.drawPreview(container);
    });

    sizeSlider.addEventListener('input', (e) => {
      this.fontSize = parseInt(e.target.value);
      sizeVal.textContent = `${e.target.value}px`;
      this.drawPreview(container);
    });

    colorPicker.addEventListener('input', (e) => {
      this.textColor = e.target.value;
      this.drawPreview(container);
    });

    execBtn.addEventListener('click', () => this.processWatermarking(container));
    downloadBtn.addEventListener('click', () => this.downloadAll());
    resetBtn.addEventListener('click', () => this.reset(container));
  },

  drawWatermarkOnCanvas(canvas, imgElement) {
    canvas.width = imgElement.naturalWidth || imgElement.width;
    canvas.height = imgElement.naturalHeight || imgElement.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(imgElement, 0, 0);

    if (!this.watermarkText) return;

    ctx.save();
    ctx.font = `bold ${this.fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
    ctx.fillStyle = this.textColor;
    ctx.globalAlpha = this.opacity;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
    ctx.shadowBlur = 6;

    const w = canvas.width;
    const h = canvas.height;

    if (this.position === 'tile') {
      const stepX = 350;
      const stepY = 250;
      for (let y = -h; y < h * 2; y += stepY) {
        for (let x = -w; x < w * 2; x += stepX) {
          ctx.save();
          ctx.translate(x, y);
          ctx.rotate((this.rotation * Math.PI) / 180);
          ctx.fillText(this.watermarkText, 0, 0);
          ctx.restore();
        }
      }
    } else {
      let x = w / 2;
      let y = h / 2;
      const pad = 80;

      if (this.position.includes('t')) y = pad;
      if (this.position.includes('b')) y = h - pad;
      if (this.position.includes('l')) x = pad;
      if (this.position.includes('r')) x = w - pad;

      ctx.translate(x, y);
      ctx.rotate((this.rotation * Math.PI) / 180);
      ctx.fillText(this.watermarkText, 0, 0);
    }

    ctx.restore();
  },

  drawPreview(container) {
    if (!this.files.length) return;
    const canvas = container.querySelector('#wm-canvas');
    this.drawWatermarkOnCanvas(canvas, this.files[0].imgElement);
  },

  async processWatermarking(container) {
    const execBtn = container.querySelector('#wm-exec-btn');
    const downloadBtn = container.querySelector('#wm-download-btn');
    execBtn.disabled = true;

    this.watermarkedResults = [];

    for (let i = 0; i < this.files.length; i++) {
      const item = this.files[i];
      const canvas = document.createElement('canvas');
      this.drawWatermarkOnCanvas(canvas, item.imgElement);

      const outType = item.type === 'image/png' ? 'image/png' : 'image/jpeg';
      const blob = await canvasToBlob(canvas, outType, 0.95);
      this.watermarkedResults.push({
        blob,
        name: `watermarked_${item.name}`
      });
    }

    execBtn.disabled = false;
    downloadBtn.style.display = 'inline-flex';
    Toast.success(`Applied watermark to ${this.files.length} images!`);
  },

  async downloadAll() {
    if (!this.watermarkedResults.length) return;
    if (this.watermarkedResults.length === 1) {
      downloadBlob(this.watermarkedResults[0].blob, this.watermarkedResults[0].name);
    } else {
      await exportFilesAsZip(this.watermarkedResults, 'watermarked_images.zip');
    }
  },

  reset(container) {
    this.files = [];
    this.watermarkedResults = [];
    this.render(container);
  }
};
