/**
 * Meme Generator Tool — Movable Text, Custom Overlays & Scaling
 */
import { setupDropzone, loadImageFromFile, downloadBlob } from '../utils/file-loader.js';
import { canvasToBlob } from '../utils/canvas-helper.js';
import { Toast } from '../utils/toast.js';

export const MemeGeneratorTool = {
  id: 'meme-generator',
  name: 'Meme generator',
  category: 'create',
  description: 'Create your memes online with ease. Move text anywhere, customize size/scaling, and upload custom overlay stickers.',

  imageItem: null,
  allCaps: true,

  // Overlays (text boxes and custom images/stickers)
  elements: [],
  selectedId: null,
  isDragging: false,
  dragOffset: { x: 0, y: 0 },

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
          <div class="canvas-wrapper" style="position: relative; user-select: none;">
            <canvas id="meme-canvas" style="display: block; max-width: 100%; cursor: default;"></canvas>
          </div>
          <div style="margin-top: 0.75rem; font-size: 0.8rem; color: var(--text-muted); text-align: center;">
            💡 Click & drag captions or stickers anywhere on the meme. Adjust size using the sliders.
          </div>
        </div>

        <div class="settings-panel" style="max-height: 82vh; overflow-y: auto;">
          <!-- Selected Item Properties Panel -->
          <div id="meme-selected-panel" class="settings-group" style="display:none; background: var(--bg-subtle); padding: 1rem; border-radius: var(--radius-md); border: 1px solid var(--accent-blue);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
              <h4 style="color: var(--accent-blue); margin: 0;">Selected Item</h4>
              <button id="meme-delete-selected-btn" class="btn-secondary" style="padding: 3px 8px; font-size: 0.75rem; color: var(--accent-rose); border-color: var(--accent-rose);">
                <i data-lucide="trash-2" style="width:12px;height:12px;"></i> Delete
              </button>
            </div>

            <div class="control-row">
              <div class="control-label">
                <span>Scale / Size</span>
                <span id="meme-scale-val" class="control-val">100%</span>
              </div>
              <input type="range" id="meme-scale-slider" class="range-slider" min="20" max="250" value="100">
            </div>

            <div class="control-row" style="margin-top: 0.5rem;">
              <div class="control-label">
                <span>Rotation</span>
                <span id="meme-rot-val" class="control-val">0°</span>
              </div>
              <input type="range" id="meme-rot-slider" class="range-slider" min="-180" max="180" value="0">
            </div>

            <div id="meme-text-edit-wrap" style="margin-top: 0.5rem; display: none;">
              <label class="control-label">Edit Caption</label>
              <textarea id="meme-edit-text-input" class="text-input" rows="2" style="font-family: Impact, sans-serif; resize: none;"></textarea>
            </div>
          </div>

          <!-- Base Background Upload -->
          <div class="settings-group">
            <h4>Meme Background Picture</h4>
            <div id="meme-upload-area" style="border: 2px dashed var(--border-color); border-radius: var(--radius-md); padding: 0.85rem; text-align: center; cursor: pointer; background: var(--bg-subtle);">
              <i data-lucide="upload" style="width: 18px; height: 18px; margin-bottom: 2px; color: var(--accent-blue);"></i>
              <div style="font-size: 0.825rem; font-weight: 600;">Upload Base Photo</div>
            </div>
          </div>

          <!-- Upload Custom Overlay / Sticker -->
          <div class="settings-group">
            <h4>Upload Overlay / Icon / Sticker</h4>
            <label class="btn-secondary" style="cursor: pointer; justify-content: center; width: 100%; text-align: center; border-style: dashed;">
              <i data-lucide="image-plus" style="width: 16px; height: 16px;"></i> Add Custom Image/Sticker
              <input type="file" id="meme-overlay-input" accept="image/*" style="display: none;">
            </label>
          </div>

          <!-- Add Captions -->
          <div class="settings-group">
            <h4>Add New Text Caption</h4>
            <div style="display: flex; gap: 0.5rem;">
              <input type="text" id="meme-new-caption-input" class="text-input" placeholder="Type new caption...">
              <button id="meme-add-caption-btn" class="btn-primary" style="padding: 0.55rem 0.85rem;"><i data-lucide="plus" style="width: 14px; height: 14px;"></i></button>
            </div>
          </div>

          <div class="settings-group">
            <label style="display: flex; align-items: center; gap: 8px; font-size: 0.85rem; font-weight: 600; cursor: pointer;">
              <input type="checkbox" id="meme-caps-check" checked> Force All-Caps (Classic Impact Style)
            </label>
          </div>
        </div>
      </div>
    `;

    if (window.lucide) window.lucide.createIcons({ root: container });
    this.initDefaultElements();
    this.initEvents(container);
  },

  initDefaultElements() {
    this.elements = [
      {
        id: 'top_caption',
        type: 'text',
        text: 'WHEN YOUR CODE WORKS',
        size: 52,
        scale: 100,
        rotation: 0,
        x: 400,
        y: 60
      },
      {
        id: 'bottom_caption',
        type: 'text',
        text: 'ON THE VERY FIRST TRY',
        size: 52,
        scale: 100,
        rotation: 0,
        x: 400,
        y: 530
      }
    ];
    this.selectedId = 'top_caption';
  },

  initEvents(container) {
    const uploadArea = container.querySelector('#meme-upload-area');
    const overlayInput = container.querySelector('#meme-overlay-input');
    const newCaptionInput = container.querySelector('#meme-new-caption-input');
    const addCaptionBtn = container.querySelector('#meme-add-caption-btn');
    const capsCheck = container.querySelector('#meme-caps-check');
    const downloadBtn = container.querySelector('#meme-download-btn');
    const resetBtn = container.querySelector('#meme-reset-btn');

    // Selected panel controls
    const selScale = container.querySelector('#meme-scale-slider');
    const selScaleVal = container.querySelector('#meme-scale-val');
    const selRot = container.querySelector('#meme-rot-slider');
    const selRotVal = container.querySelector('#meme-rot-val');
    const selTextInput = container.querySelector('#meme-edit-text-input');
    const delSelectedBtn = container.querySelector('#meme-delete-selected-btn');

    setupDropzone(uploadArea, async (files) => {
      if (!files.length) return;
      try {
        const item = await loadImageFromFile(files[0]);
        this.imageItem = item;
        resetBtn.style.display = 'inline-flex';

        // Re-center default texts to new image dimensions
        const topEl = this.elements.find(e => e.id === 'top_caption');
        const btmEl = this.elements.find(e => e.id === 'bottom_caption');
        if (topEl) {
          topEl.x = item.width / 2;
          topEl.y = Math.round(item.height * 0.1);
        }
        if (btmEl) {
          btmEl.x = item.width / 2;
          btmEl.y = Math.round(item.height * 0.9);
        }

        this.drawMeme(container);
      } catch (err) {
        Toast.error('Could not load image');
      }
    });

    overlayInput.addEventListener('change', async (e) => {
      if (!e.target.files.length) return;
      try {
        const overlayItem = await loadImageFromFile(e.target.files[0]);
        const w = this.imageItem ? this.imageItem.width : 800;
        const h = this.imageItem ? this.imageItem.height : 600;

        const targetW = Math.round(w * 0.25);
        const targetH = Math.round(targetW / overlayItem.aspectRatio);

        const el = {
          id: 'img_' + Date.now(),
          type: 'image',
          imgElement: overlayItem.imgElement,
          name: overlayItem.name,
          baseWidth: targetW,
          baseHeight: targetH,
          scale: 100,
          rotation: 0,
          x: w / 2,
          y: h / 2
        };

        this.elements.push(el);
        this.selectedId = el.id;
        this.updateSelectedPanel(container);
        this.drawMeme(container);
        Toast.success(`Added sticker: ${overlayItem.name}`);
      } catch (err) {
        Toast.error('Could not load overlay');
      }
      overlayInput.value = '';
    });

    addCaptionBtn.addEventListener('click', () => {
      const text = newCaptionInput.value.trim();
      if (!text) return;
      const w = this.imageItem ? this.imageItem.width : 800;
      const h = this.imageItem ? this.imageItem.height : 600;

      const el = {
        id: 'txt_' + Date.now(),
        type: 'text',
        text,
        size: 44,
        scale: 100,
        rotation: 0,
        x: w / 2,
        y: h / 2
      };
      this.elements.push(el);
      this.selectedId = el.id;
      newCaptionInput.value = '';
      this.updateSelectedPanel(container);
      this.drawMeme(container);
      Toast.success('Caption added! Drag it to move.');
    });

    capsCheck.addEventListener('change', (e) => {
      this.allCaps = e.target.checked;
      this.drawMeme(container);
    });

    // Selected item modifications
    selScale.addEventListener('input', (e) => {
      const el = this.getSelectedElement();
      if (!el) return;
      el.scale = parseInt(e.target.value);
      selScaleVal.textContent = `${el.scale}%`;
      this.drawMeme(container);
    });

    selRot.addEventListener('input', (e) => {
      const el = this.getSelectedElement();
      if (!el) return;
      el.rotation = parseInt(e.target.value);
      selRotVal.textContent = `${el.rotation}°`;
      this.drawMeme(container);
    });

    selTextInput.addEventListener('input', (e) => {
      const el = this.getSelectedElement();
      if (el && el.type === 'text') {
        el.text = e.target.value;
        this.drawMeme(container);
      }
    });

    delSelectedBtn.addEventListener('click', () => {
      if (!this.selectedId) return;
      this.elements = this.elements.filter(e => e.id !== this.selectedId);
      this.selectedId = null;
      this.updateSelectedPanel(container);
      this.drawMeme(container);
      Toast.info('Item deleted');
    });

    downloadBtn.addEventListener('click', async () => {
      // Temporarily clear selection box for clean export
      const prevSel = this.selectedId;
      this.selectedId = null;
      this.drawMeme(container);

      const canvas = container.querySelector('#meme-canvas');
      const blob = await canvasToBlob(canvas, 'image/png', 0.95);
      downloadBlob(blob, 'custom_meme.png');

      this.selectedId = prevSel;
      this.drawMeme(container);
      Toast.success('Meme downloaded!');
    });

    resetBtn.addEventListener('click', () => {
      this.imageItem = null;
      this.initDefaultElements();
      this.render(container);
    });

    this.setupInteractiveCanvas(container);
    this.updateSelectedPanel(container);
    this.drawMeme(container);
  },

  getSelectedElement() {
    return this.elements.find(e => e.id === this.selectedId);
  },

  updateSelectedPanel(container) {
    const panel = container.querySelector('#meme-selected-panel');
    const textWrap = container.querySelector('#meme-text-edit-wrap');
    const selScale = container.querySelector('#meme-scale-slider');
    const selScaleVal = container.querySelector('#meme-scale-val');
    const selRot = container.querySelector('#meme-rot-slider');
    const selRotVal = container.querySelector('#meme-rot-val');
    const selTextInput = container.querySelector('#meme-edit-text-input');

    const el = this.getSelectedElement();
    if (!el) {
      panel.style.display = 'none';
      return;
    }

    panel.style.display = 'block';
    selScale.value = el.scale || 100;
    selScaleVal.textContent = `${el.scale || 100}%`;
    selRot.value = el.rotation || 0;
    selRotVal.textContent = `${el.rotation || 0}°`;

    if (el.type === 'text') {
      textWrap.style.display = 'block';
      selTextInput.value = el.text;
    } else {
      textWrap.style.display = 'none';
    }
  },

  getElementBounds(el, ctx) {
    let w = 50, h = 50;
    const scale = (el.scale || 100) / 100;

    if (el.type === 'text') {
      const fontSize = Math.round(el.size * scale);
      ctx.font = `900 ${fontSize}px Impact, "Arial Black", sans-serif`;
      const text = this.allCaps ? el.text.toUpperCase() : el.text;
      const metrics = ctx.measureText(text);
      w = metrics.width + 24;
      h = fontSize + 16;
    } else if (el.type === 'image') {
      w = el.baseWidth * scale;
      h = el.baseHeight * scale;
    }

    return {
      x: el.x - w / 2,
      y: el.y - h / 2,
      w,
      h
    };
  },

  setupInteractiveCanvas(container) {
    const canvas = container.querySelector('#meme-canvas');

    const getCanvasPos = (e) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY
      };
    };

    canvas.addEventListener('mousedown', (e) => {
      const pos = getCanvasPos(e);
      const ctx = canvas.getContext('2d');

      let hit = null;
      for (let i = this.elements.length - 1; i >= 0; i--) {
        const el = this.elements[i];
        const bounds = this.getElementBounds(el, ctx);
        if (pos.x >= bounds.x && pos.x <= bounds.x + bounds.w &&
            pos.y >= bounds.y && pos.y <= bounds.y + bounds.h) {
          hit = el;
          break;
        }
      }

      if (hit) {
        this.selectedId = hit.id;
        this.isDragging = true;
        this.dragOffset = {
          x: pos.x - hit.x,
          y: pos.y - hit.y
        };
        // Move clicked item to top of stack
        this.elements = this.elements.filter(e => e.id !== hit.id).concat(hit);
        this.updateSelectedPanel(container);
        this.drawMeme(container);
      } else {
        this.selectedId = null;
        this.updateSelectedPanel(container);
        this.drawMeme(container);
      }
    });

    window.addEventListener('mousemove', (e) => {
      const pos = getCanvasPos(e);

      if (this.isDragging && this.selectedId) {
        const el = this.getSelectedElement();
        if (el) {
          el.x = Math.round(pos.x - this.dragOffset.x);
          el.y = Math.round(pos.y - this.dragOffset.y);
          this.drawMeme(container);
        }
      } else {
        const ctx = canvas.getContext('2d');
        let hover = false;
        for (let i = this.elements.length - 1; i >= 0; i--) {
          const bounds = this.getElementBounds(this.elements[i], ctx);
          if (pos.x >= bounds.x && pos.x <= bounds.x + bounds.w &&
              pos.y >= bounds.y && pos.y <= bounds.y + bounds.h) {
            hover = true;
            break;
          }
        }
        canvas.style.cursor = hover ? 'move' : 'default';
      }
    });

    window.addEventListener('mouseup', () => {
      this.isDragging = false;
    });
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
      canvas.width = 800;
      canvas.height = 600;
      const grad = ctx.createLinearGradient(0, 0, 800, 600);
      grad.addColorStop(0, '#1e293b');
      grad.addColorStop(1, '#0f172a');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 4;
      ctx.strokeRect(20, 20, 760, 560);
    }

    // Draw all meme elements
    this.elements.forEach(el => {
      ctx.save();
      ctx.translate(el.x, el.y);
      if (el.rotation) {
        ctx.rotate((el.rotation * Math.PI) / 180);
      }

      const scale = (el.scale || 100) / 100;

      if (el.type === 'text') {
        const fontSize = Math.round(el.size * scale);
        const displayText = this.allCaps ? el.text.toUpperCase() : el.text;

        ctx.font = `900 ${fontSize}px Impact, "Arial Black", sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Black stroke outline
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = Math.max(4, Math.round(fontSize * 0.15));
        ctx.lineJoin = 'round';
        ctx.strokeText(displayText, 0, 0);

        // White fill
        ctx.fillStyle = '#ffffff';
        ctx.fillText(displayText, 0, 0);
      } else if (el.type === 'image') {
        const w = el.baseWidth * scale;
        const h = el.baseHeight * scale;
        ctx.drawImage(el.imgElement, -w / 2, -h / 2, w, h);
      }

      ctx.restore();

      // Selection box
      if (el.id === this.selectedId) {
        const bounds = this.getElementBounds(el, ctx);
        ctx.save();
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);
        ctx.strokeRect(bounds.x, bounds.y, bounds.w, bounds.h);

        ctx.setLineDash([]);
        ctx.fillStyle = '#3b82f6';
        const hs = 8;
        ctx.fillRect(bounds.x - hs / 2, bounds.y - hs / 2, hs, hs);
        ctx.fillRect(bounds.x + bounds.w - hs / 2, bounds.y - hs / 2, hs, hs);
        ctx.fillRect(bounds.x - hs / 2, bounds.y + bounds.h - hs / 2, hs, hs);
        ctx.fillRect(bounds.x + bounds.w - hs / 2, bounds.y + bounds.h - hs / 2, hs, hs);
        ctx.restore();
      }
    });
  }
};
