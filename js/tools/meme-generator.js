/**
 * Meme Generator Tool
 */
import { setupDropzone, loadImageFromFile, downloadBlob } from '../utils/file-loader.js';
import { canvasToBlob } from '../utils/canvas-helper.js';
import { Toast } from '../utils/toast.js';

export const MemeGeneratorTool = {
  id: 'meme-generator',
  name: 'Meme generator',
  category: 'create',
  description: 'Create your memes online with ease. Caption meme images or upload your pictures to make custom memes.',

  imageItem: null,
  topText: 'WHEN YOUR CODE WORKS',
  bottomText: 'ON THE VERY FIRST TRY',
  fontSize: 52,
  allCaps: true,

  // Built-in presets generated cleanly on canvas if no image uploaded
  presets: [
    { name: 'Classic Blue', bg: '#1e3a8a' },
    { name: 'Neon Cyber', bg: '#0f172a' },
    { name: 'Fire Sunset', bg: '#7c2d12' }
  ],

  render(container) {
    container.innerHTML = `
      <div class="workspace-header">
        <div class="workspace-header-left">
          <a href="#/" class="back-btn"><i data-lucide="arrow-left" style="width: 16px; height: 16px;"></i> All Tools</a>
          <div class="workspace-title-wrap">
            <h2>Meme Generator</h2>
          </div>
        </div>
        <div class="workspace-header-right">
          <button id="meme-reset-btn" class="btn-secondary" style="display:none;"><i data-lucide="refresh-cw" style="width: 15px; height: 15px;"></i> New Meme</button>
          <button id="meme-download-btn" class="btn-primary btn-emerald"><i data-lucide="download" style="width: 16px; height: 16px;"></i> Download Meme</button>
        </div>
      </div>

      <!-- Workspace -->
      <div class="editor-layout">
        <div class="viewport-card" style="align-items: center; justify-content: center;">
          <div class="canvas-wrapper">
            <canvas id="meme-canvas"></canvas>
          </div>
        </div>

        <div class="settings-panel">
          <div class="settings-group">
            <h4>Upload Custom Picture</h4>
            <div id="meme-upload-area" style="border: 2px dashed var(--border-color); border-radius: var(--radius-md); padding: 1rem; text-align: center; cursor: pointer; background: var(--bg-subtle);">
              <i data-lucide="upload" style="width: 20px; height: 20px; margin-bottom: 4px; color: var(--accent-blue);"></i>
              <div style="font-size: 0.825rem; font-weight: 600;">Upload Meme Background</div>
            </div>
          </div>

          <div class="settings-group">
            <div class="control-row">
              <label class="control-label">Top Text</label>
              <textarea id="meme-top-text" class="text-input" rows="2" style="font-family: Impact, sans-serif; resize: none;">WHEN YOUR CODE WORKS</textarea>
            </div>

            <div class="control-row" style="margin-top: 0.5rem;">
              <label class="control-label">Bottom Text</label>
              <textarea id="meme-bottom-text" class="text-input" rows="2" style="font-family: Impact, sans-serif; resize: none;">ON THE VERY FIRST TRY</textarea>
            </div>
          </div>

          <div class="settings-group">
            <div class="control-row">
              <div class="control-label"><span>Font Size</span><span id="meme-size-val" class="control-val">52px</span></div>
              <input type="range" id="meme-size-slider" class="range-slider" min="24" max="96" value="52">
            </div>

            <label style="display: flex; align-items: center; gap: 8px; font-size: 0.85rem; font-weight: 600; cursor: pointer; margin-top: 0.5rem;">
              <input type="checkbox" id="meme-caps-check" checked> Force All-Caps (Classic Meme Style)
            </label>
          </div>
        </div>
      </div>
    `;

    if (window.lucide) window.lucide.createIcons({ root: container });
    this.initEvents(container);
  },

  initEvents(container) {
    const uploadArea = container.querySelector('#meme-upload-area');
    const topInput = container.querySelector('#meme-top-text');
    const bottomInput = container.querySelector('#meme-bottom-text');
    const sizeSlider = container.querySelector('#meme-size-slider');
    const sizeVal = container.querySelector('#meme-size-val');
    const capsCheck = container.querySelector('#meme-caps-check');
    const downloadBtn = container.querySelector('#meme-download-btn');
    const resetBtn = container.querySelector('#meme-reset-btn');

    setupDropzone(uploadArea, async (files) => {
      if (!files.length) return;
      try {
        const item = await loadImageFromFile(files[0]);
        this.imageItem = item;
        resetBtn.style.display = 'inline-flex';
        this.drawMeme(container);
      } catch (err) {
        Toast.error('Could not load image');
      }
    });

    topInput.addEventListener('input', (e) => {
      this.topText = e.target.value;
      this.drawMeme(container);
    });

    bottomInput.addEventListener('input', (e) => {
      this.bottomText = e.target.value;
      this.drawMeme(container);
    });

    sizeSlider.addEventListener('input', (e) => {
      this.fontSize = parseInt(e.target.value);
      sizeVal.textContent = `${this.fontSize}px`;
      this.drawMeme(container);
    });

    capsCheck.addEventListener('change', (e) => {
      this.allCaps = e.target.checked;
      this.drawMeme(container);
    });

    downloadBtn.addEventListener('click', async () => {
      const canvas = container.querySelector('#meme-canvas');
      const blob = await canvasToBlob(canvas, 'image/png', 0.95);
      downloadBlob(blob, 'custom_meme.png');
      Toast.success('Meme downloaded!');
    });

    resetBtn.addEventListener('click', () => {
      this.imageItem = null;
      this.render(container);
    });

    this.drawMeme(container);
  },

  drawMeme(container) {
    const canvas = container.querySelector('#meme-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');

    if (this.imageItem) {
      canvas.width = this.imageItem.width;
      canvas.height = this.imageItem.height;
      ctx.drawImage(this.imageItem.imgElement, 0, 0);
    } else {
      // Default clean template backdrop
      canvas.width = 800;
      canvas.height = 600;
      const grad = ctx.createLinearGradient(0, 0, 800, 600);
      grad.addColorStop(0, '#1e293b');
      grad.addColorStop(1, '#0f172a');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Add a subtle camera frame pattern
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = 4;
      ctx.strokeRect(20, 20, 760, 560);
    }

    const drawText = (text, y, baseline) => {
      if (!text) return;
      const displayText = this.allCaps ? text.toUpperCase() : text;
      ctx.save();
      ctx.font = `900 ${this.fontSize}px Impact, "Arial Black", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = baseline;

      // Black stroke outline
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = Math.max(4, Math.round(this.fontSize * 0.15));
      ctx.lineJoin = 'round';
      ctx.strokeText(displayText, canvas.width / 2, y);

      // White fill
      ctx.fillStyle = '#ffffff';
      ctx.fillText(displayText, canvas.width / 2, y);
      ctx.restore();
    };

    drawText(this.topText, 30, 'top');
    drawText(this.bottomText, canvas.height - 30, 'bottom');
  }
};
