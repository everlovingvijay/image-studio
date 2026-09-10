/**
 * Photo Editor Tool — With Interactive Drag-to-Move, Scaling, and Custom Image/Icon Uploads
 */
import { setupDropzone, loadImageFromFile, downloadBlob } from '../utils/file-loader.js';
import { canvasToBlob } from '../utils/canvas-helper.js';
import { Toast } from '../utils/toast.js';

export const PhotoEditorTool = {
  id: 'photo-editor',
  name: 'Photo editor',
  category: 'edit',
  description: 'Spice up your pictures with movable text, stickers, and custom image/icon overlays. Freely drag, scale, and adjust.',

  imageItem: null,
  filters: {
    brightness: 100,
    contrast: 100,
    saturate: 100,
    sepia: 0,
    grayscale: 0,
    hueRotate: 0,
    blur: 0
  },

  // Overlays (text, stickers, custom uploaded images/icons)
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
            <h2>Photo Editor</h2>
          </div>
        </div>
        <div class="workspace-header-right">
          <button id="editor-reset-btn" class="btn-secondary" style="display:none;"><i data-lucide="refresh-cw" style="width: 15px; height: 15px;"></i> New Image</button>
          <button id="editor-download-btn" class="btn-primary btn-emerald" disabled><i data-lucide="download" style="width: 16px; height: 16px;"></i> Save Image</button>
        </div>
      </div>

      <!-- Dropzone -->
      <div id="editor-dropzone" class="dropzone-container">
        <div class="dropzone-icon" style="background: var(--accent-purple-bg); color: var(--accent-purple);">
          <i data-lucide="edit-3" style="width: 32px; height: 32px;"></i>
        </div>
        <div class="dropzone-title">Select Photo to Edit</div>
        <div class="dropzone-desc">Apply color filters, add draggable text captions, stickers, and custom logo/icon overlays</div>
        <button type="button" class="dropzone-btn" style="background: var(--accent-purple);"><i data-lucide="upload" style="width: 18px; height: 18px;"></i> Select Photo</button>
      </div>

      <!-- Workspace -->
      <div id="editor-workspace" class="editor-layout" style="display:none;">
        <div class="viewport-card">
          <div class="canvas-wrapper" style="position: relative; user-select: none;">
            <canvas id="photo-canvas" style="display: block; max-width: 100%; cursor: default;"></canvas>
          </div>
          <div style="margin-top: 0.75rem; font-size: 0.8rem; color: var(--text-muted); text-align: center;">
            💡 Click & drag any text, sticker, or uploaded image to move it. Use sidebar sliders to scale or rotate.
          </div>
        </div>

        <div class="settings-panel" style="max-height: 82vh; overflow-y: auto;">
          <!-- Selected Element Controls (dynamically visible when item is selected) -->
          <div id="editor-selected-panel" class="settings-group" style="display:none; background: var(--bg-subtle); padding: 1rem; border-radius: var(--radius-md); border: 1px solid var(--accent-blue);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
              <h4 style="color: var(--accent-blue); margin: 0;">Selected Item</h4>
              <button id="delete-selected-btn" class="btn-secondary" style="padding: 3px 8px; font-size: 0.75rem; color: var(--accent-rose); border-color: var(--accent-rose);">
                <i data-lucide="trash-2" style="width:12px;height:12px;"></i> Delete
              </button>
            </div>

            <div class="control-row">
              <div class="control-label">
                <span>Scale / Size</span>
                <span id="selected-scale-val" class="control-val">100%</span>
              </div>
              <input type="range" id="selected-scale-slider" class="range-slider" min="10" max="250" value="100">
            </div>

            <div class="control-row" style="margin-top: 0.5rem;">
              <div class="control-label">
                <span>Rotation</span>
                <span id="selected-rot-val" class="control-val">0°</span>
              </div>
              <input type="range" id="selected-rot-slider" class="range-slider" min="-180" max="180" value="0">
            </div>

            <div id="selected-text-controls" style="margin-top: 0.5rem; display: none;">
              <label class="control-label">Edit Text</label>
              <input type="text" id="selected-text-input" class="text-input" style="margin-bottom: 0.5rem;">
              <div style="display: flex; align-items: center; gap: 0.5rem;">
                <label class="control-label" style="margin:0;">Color:</label>
                <input type="color" id="selected-color-picker" style="width:34px;height:28px;border-radius:4px;cursor:pointer;">
              </div>
            </div>
          </div>

          <!-- Add Custom Image / Icon Overlay -->
          <div class="settings-group">
            <h4>Upload Custom Image / Icon</h4>
            <label class="btn-secondary" style="cursor: pointer; justify-content: center; width: 100%; text-align: center; border-style: dashed;">
              <i data-lucide="image-plus" style="width: 16px; height: 16px;"></i> Upload Overlay (PNG, Icon, Logo)
              <input type="file" id="upload-overlay-input" accept="image/*" style="display: none;">
            </label>
          </div>

          <!-- Add Text Overlay -->
          <div class="settings-group">
            <h4>Add Text Caption</h4>
            <div style="display: flex; gap: 0.5rem;">
              <input type="text" id="editor-text-input" class="text-input" placeholder="Type caption...">
              <button id="add-text-btn" class="btn-primary" style="padding: 0.55rem 0.85rem;"><i data-lucide="plus" style="width: 14px; height: 14px;"></i></button>
            </div>
            <div style="display: flex; align-items: center; gap: 0.75rem; margin-top: 0.5rem;">
              <input type="color" id="editor-text-color" value="#ffffff" style="width: 38px; height: 32px; border-radius: 6px; cursor: pointer;">
              <input type="range" id="editor-text-size" class="range-slider" min="18" max="120" value="42" title="Initial Font Size">
            </div>
          </div>

          <!-- Add Stickers -->
          <div class="settings-group">
            <h4>Add Stickers</h4>
            <div style="display: flex; gap: 0.4rem; font-size: 1.35rem; flex-wrap: wrap;" id="sticker-palette">
              <button class="chip-btn" data-emoji="🔥">🔥</button>
              <button class="chip-btn" data-emoji="⭐">⭐</button>
              <button class="chip-btn" data-emoji="❤️">❤️</button>
              <button class="chip-btn" data-emoji="🎉">🎉</button>
              <button class="chip-btn" data-emoji="✨">✨</button>
              <button class="chip-btn" data-emoji="🕶️">🕶️</button>
              <button class="chip-btn" data-emoji="👑">👑</button>
              <button class="chip-btn" data-emoji="🚀">🚀</button>
              <button class="chip-btn" data-emoji="💯">💯</button>
            </div>
          </div>

          <!-- Filter Presets -->
          <div class="settings-group">
            <h4>Style Presets</h4>
            <div class="chip-group" id="editor-presets">
              <button class="chip-btn active" data-preset="normal">Normal</button>
              <button class="chip-btn" data-preset="vintage">Vintage</button>
              <button class="chip-btn" data-preset="noir">Noir B&W</button>
              <button class="chip-btn" data-preset="vibrant">Vibrant</button>
              <button class="chip-btn" data-preset="warm">Warm Glow</button>
              <button class="chip-btn" data-preset="cool">Cool Tone</button>
            </div>
          </div>

          <!-- Adjustments Sliders -->
          <div class="settings-group">
            <h4>Adjustments</h4>
            <div class="control-row">
              <div class="control-label"><span>Brightness</span><span id="val-bright" class="control-val">100%</span></div>
              <input type="range" id="slider-bright" class="range-slider" min="0" max="200" value="100">
            </div>

            <div class="control-row">
              <div class="control-label"><span>Contrast</span><span id="val-contrast" class="control-val">100%</span></div>
              <input type="range" id="slider-contrast" class="range-slider" min="0" max="200" value="100">
            </div>

            <div class="control-row">
              <div class="control-label"><span>Saturation</span><span id="val-saturate" class="control-val">100%</span></div>
              <input type="range" id="slider-saturate" class="range-slider" min="0" max="200" value="100">
            </div>

            <div class="control-row">
              <div class="control-label"><span>Sepia</span><span id="val-sepia" class="control-val">0%</span></div>
              <input type="range" id="slider-sepia" class="range-slider" min="0" max="100" value="0">
            </div>
          </div>

          <button id="editor-clear-overlays-btn" class="btn-secondary" style="width: 100%; justify-content: center;">
            <i data-lucide="trash-2" style="width: 14px; height: 14px;"></i> Clear All Overlays
          </button>
        </div>
      </div>
    `;

    if (window.lucide) window.lucide.createIcons({ root: container });
    this.initEvents(container);
  },

  initEvents(container) {
    const dropzone = container.querySelector('#editor-dropzone');
    const resetBtn = container.querySelector('#editor-reset-btn');
    const downloadBtn = container.querySelector('#editor-download-btn');
    const presetBtns = container.querySelectorAll('#editor-presets .chip-btn');

    const sBright = container.querySelector('#slider-bright');
    const sContrast = container.querySelector('#slider-contrast');
    const sSaturate = container.querySelector('#slider-saturate');
    const sSepia = container.querySelector('#slider-sepia');

    const txtInput = container.querySelector('#editor-text-input');
    const txtAddBtn = container.querySelector('#add-text-btn');
    const txtColor = container.querySelector('#editor-text-color');
    const txtSize = container.querySelector('#editor-text-size');
    const stickerBtns = container.querySelectorAll('#sticker-palette .chip-btn');
    const uploadOverlayInput = container.querySelector('#upload-overlay-input');
    const clearOverlaysBtn = container.querySelector('#editor-clear-overlays-btn');

    // Selected item controls
    const selScale = container.querySelector('#selected-scale-slider');
    const selScaleVal = container.querySelector('#selected-scale-val');
    const selRot = container.querySelector('#selected-rot-slider');
    const selRotVal = container.querySelector('#selected-rot-val');
    const selTextInput = container.querySelector('#selected-text-input');
    const selColorPicker = container.querySelector('#selected-color-picker');
    const delSelectedBtn = container.querySelector('#delete-selected-btn');

    setupDropzone(dropzone, async (files) => {
      if (!files.length) return;
      try {
        const item = await loadImageFromFile(files[0]);
        this.imageItem = item;
        container.querySelector('#editor-dropzone').style.display = 'none';
        container.querySelector('#editor-workspace').style.display = 'grid';
        container.querySelector('#editor-reset-btn').style.display = 'inline-flex';
        container.querySelector('#editor-download-btn').disabled = false;
        this.drawCanvas(container);
      } catch (err) {
        Toast.error('Could not load image');
      }
    });

    // Preset filters
    presetBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        presetBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const p = btn.dataset.preset;
        if (p === 'normal') {
          this.filters = { brightness: 100, contrast: 100, saturate: 100, sepia: 0, grayscale: 0, hueRotate: 0, blur: 0 };
        } else if (p === 'vintage') {
          this.filters = { brightness: 110, contrast: 90, saturate: 85, sepia: 40, grayscale: 0, hueRotate: 0, blur: 0 };
        } else if (p === 'noir') {
          this.filters = { brightness: 105, contrast: 125, saturate: 0, sepia: 0, grayscale: 100, hueRotate: 0, blur: 0 };
        } else if (p === 'vibrant') {
          this.filters = { brightness: 105, contrast: 115, saturate: 150, sepia: 0, grayscale: 0, hueRotate: 0, blur: 0 };
        } else if (p === 'warm') {
          this.filters = { brightness: 105, contrast: 100, saturate: 110, sepia: 25, grayscale: 0, hueRotate: 0, blur: 0 };
        } else if (p === 'cool') {
          this.filters = { brightness: 100, contrast: 105, saturate: 90, sepia: 0, grayscale: 0, hueRotate: 180, blur: 0 };
        }
        sBright.value = this.filters.brightness;
        sContrast.value = this.filters.contrast;
        sSaturate.value = this.filters.saturate;
        sSepia.value = this.filters.sepia;
        this.updateSliderLabels(container);
        this.drawCanvas(container);
      });
    });

    sBright.addEventListener('input', (e) => {
      this.filters.brightness = parseInt(e.target.value);
      container.querySelector('#val-bright').textContent = `${e.target.value}%`;
      this.drawCanvas(container);
    });

    sContrast.addEventListener('input', (e) => {
      this.filters.contrast = parseInt(e.target.value);
      container.querySelector('#val-contrast').textContent = `${e.target.value}%`;
      this.drawCanvas(container);
    });

    sSaturate.addEventListener('input', (e) => {
      this.filters.saturate = parseInt(e.target.value);
      container.querySelector('#val-saturate').textContent = `${e.target.value}%`;
      this.drawCanvas(container);
    });

    sSepia.addEventListener('input', (e) => {
      this.filters.sepia = parseInt(e.target.value);
      container.querySelector('#val-sepia').textContent = `${e.target.value}%`;
      this.drawCanvas(container);
    });

    // Add Text
    txtAddBtn.addEventListener('click', () => {
      const text = txtInput.value.trim();
      if (!text || !this.imageItem) return;
      const el = {
        id: 'txt_' + Date.now(),
        type: 'text',
        text,
        color: txtColor.value,
        size: parseInt(txtSize.value),
        scale: 100,
        rotation: 0,
        x: this.imageItem.width / 2,
        y: this.imageItem.height / 2
      };
      this.elements.push(el);
      this.selectedId = el.id;
      txtInput.value = '';
      this.updateSelectedPanel(container);
      this.drawCanvas(container);
      Toast.success('Text added! Drag it to move.');
    });

    // Add Sticker
    stickerBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        if (!this.imageItem) return;
        const el = {
          id: 'stk_' + Date.now(),
          type: 'sticker',
          emoji: btn.dataset.emoji,
          size: 64,
          scale: 100,
          rotation: 0,
          x: this.imageItem.width / 2,
          y: this.imageItem.height / 2
        };
        this.elements.push(el);
        this.selectedId = el.id;
        this.updateSelectedPanel(container);
        this.drawCanvas(container);
        Toast.success('Sticker added! Drag it to position.');
      });
    });

    // Add Custom Uploaded Image / Icon Overlay
    uploadOverlayInput.addEventListener('change', async (e) => {
      if (!e.target.files.length || !this.imageItem) return;
      try {
        const overlayItem = await loadImageFromFile(e.target.files[0]);
        // Set initial width to ~30% of main image
        const targetW = Math.round(this.imageItem.width * 0.3);
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
          x: this.imageItem.width / 2,
          y: this.imageItem.height / 2
        };
        this.elements.push(el);
        this.selectedId = el.id;
        this.updateSelectedPanel(container);
        this.drawCanvas(container);
        Toast.success(`Added overlay: ${overlayItem.name}`);
      } catch (err) {
        Toast.error('Could not load overlay image');
      }
      uploadOverlayInput.value = '';
    });

    // Selected element modifications
    selScale.addEventListener('input', (e) => {
      const el = this.getSelectedElement();
      if (!el) return;
      el.scale = parseInt(e.target.value);
      selScaleVal.textContent = `${el.scale}%`;
      this.drawCanvas(container);
    });

    selRot.addEventListener('input', (e) => {
      const el = this.getSelectedElement();
      if (!el) return;
      el.rotation = parseInt(e.target.value);
      selRotVal.textContent = `${el.rotation}°`;
      this.drawCanvas(container);
    });

    selTextInput.addEventListener('input', (e) => {
      const el = this.getSelectedElement();
      if (el && el.type === 'text') {
        el.text = e.target.value;
        this.drawCanvas(container);
      }
    });

    selColorPicker.addEventListener('input', (e) => {
      const el = this.getSelectedElement();
      if (el && el.type === 'text') {
        el.color = e.target.value;
        this.drawCanvas(container);
      }
    });

    delSelectedBtn.addEventListener('click', () => {
      if (!this.selectedId) return;
      this.elements = this.elements.filter(e => e.id !== this.selectedId);
      this.selectedId = null;
      this.updateSelectedPanel(container);
      this.drawCanvas(container);
      Toast.info('Item removed');
    });

    clearOverlaysBtn.addEventListener('click', () => {
      this.elements = [];
      this.selectedId = null;
      this.updateSelectedPanel(container);
      this.drawCanvas(container);
      Toast.info('All overlays cleared');
    });

    downloadBtn.addEventListener('click', async () => {
      // Temporarily clear selection box for clean export
      const prevSel = this.selectedId;
      this.selectedId = null;
      this.drawCanvas(container);

      const canvas = container.querySelector('#photo-canvas');
      const blob = await canvasToBlob(canvas, 'image/png', 0.95);
      downloadBlob(blob, `edited_${this.imageItem.baseName}.png`);

      this.selectedId = prevSel;
      this.drawCanvas(container);
      Toast.success('Photo saved!');
    });

    resetBtn.addEventListener('click', () => {
      this.imageItem = null;
      this.elements = [];
      this.selectedId = null;
      this.render(container);
    });

    this.setupInteractiveCanvas(container);
  },

  getSelectedElement() {
    return this.elements.find(e => e.id === this.selectedId);
  },

  updateSelectedPanel(container) {
    const panel = container.querySelector('#editor-selected-panel');
    const textControls = container.querySelector('#selected-text-controls');
    const selScale = container.querySelector('#selected-scale-slider');
    const selScaleVal = container.querySelector('#selected-scale-val');
    const selRot = container.querySelector('#selected-rot-slider');
    const selRotVal = container.querySelector('#selected-rot-val');
    const selTextInput = container.querySelector('#selected-text-input');
    const selColorPicker = container.querySelector('#selected-color-picker');

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
      textControls.style.display = 'block';
      selTextInput.value = el.text;
      selColorPicker.value = el.color;
    } else {
      textControls.style.display = 'none';
    }
  },

  getElementBounds(el, ctx) {
    let w = 40, h = 40;
    const scale = (el.scale || 100) / 100;

    if (el.type === 'text') {
      const fontSize = el.size * scale;
      ctx.font = `bold ${fontSize}px -apple-system, BlinkMacSystemFont, sans-serif`;
      const metrics = ctx.measureText(el.text);
      w = metrics.width + 20;
      h = fontSize + 16;
    } else if (el.type === 'sticker') {
      const sz = el.size * scale;
      w = sz + 10;
      h = sz + 10;
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
    const canvas = container.querySelector('#photo-canvas');

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
      if (!this.imageItem) return;
      const pos = getCanvasPos(e);
      const ctx = canvas.getContext('2d');

      // Hit test elements in reverse order (topmost first)
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
        this.drawCanvas(container);
      } else {
        // Deselect
        this.selectedId = null;
        this.updateSelectedPanel(container);
        this.drawCanvas(container);
      }
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.imageItem) return;
      const pos = getCanvasPos(e);

      if (this.isDragging && this.selectedId) {
        const el = this.getSelectedElement();
        if (el) {
          el.x = Math.round(pos.x - this.dragOffset.x);
          el.y = Math.round(pos.y - this.dragOffset.y);
          this.drawCanvas(container);
        }
      } else {
        // Update hover cursor
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

  updateSliderLabels(container) {
    container.querySelector('#val-bright').textContent = `${this.filters.brightness}%`;
    container.querySelector('#val-contrast').textContent = `${this.filters.contrast}%`;
    container.querySelector('#val-saturate').textContent = `${this.filters.saturate}%`;
    container.querySelector('#val-sepia').textContent = `${this.filters.sepia}%`;
  },

  drawCanvas(container) {
    if (!this.imageItem) return;
    const canvas = container.querySelector('#photo-canvas');
    canvas.width = this.imageItem.width;
    canvas.height = this.imageItem.height;
    const ctx = canvas.getContext('2d');

    // 1. Draw base photo with CSS filters
    const f = this.filters;
    ctx.filter = `brightness(${f.brightness}%) contrast(${f.contrast}%) saturate(${f.saturate}%) sepia(${f.sepia}%) grayscale(${f.grayscale}%) hue-rotate(${f.hueRotate}deg)`;
    ctx.drawImage(this.imageItem.imgElement, 0, 0);
    ctx.filter = 'none';

    // 2. Draw all elements
    this.elements.forEach(el => {
      ctx.save();
      ctx.translate(el.x, el.y);
      if (el.rotation) {
        ctx.rotate((el.rotation * Math.PI) / 180);
      }

      const scale = (el.scale || 100) / 100;

      if (el.type === 'text') {
        const fontSize = el.size * scale;
        ctx.font = `bold ${fontSize}px -apple-system, BlinkMacSystemFont, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = el.color;
        ctx.shadowColor = 'rgba(0,0,0,0.7)';
        ctx.shadowBlur = 8;
        ctx.fillText(el.text, 0, 0);
      } else if (el.type === 'sticker') {
        const sz = el.size * scale;
        ctx.font = `${sz}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(el.emoji, 0, 0);
      } else if (el.type === 'image') {
        const w = el.baseWidth * scale;
        const h = el.baseHeight * scale;
        ctx.shadowColor = 'rgba(0,0,0,0.3)';
        ctx.shadowBlur = 6;
        ctx.drawImage(el.imgElement, -w / 2, -h / 2, w, h);
      }

      ctx.restore();

      // 3. Draw selection border if selected
      if (el.id === this.selectedId) {
        const bounds = this.getElementBounds(el, ctx);
        ctx.save();
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);
        ctx.strokeRect(bounds.x, bounds.y, bounds.w, bounds.h);

        // Corner handles
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
