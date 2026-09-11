/**
 * Watermark IMAGE Tool — Full Featured (Text, Logo, Tile Repeat, Spacing, Fonts, Drag Placement)
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
  watermarkedResults: [],

  // Watermark Mode & Type
  mode: 'text', // 'text' | 'logo'
  patternMode: 'single', // 'single' | 'repeat'

  // Text Watermark Settings
  watermarkText: 'CONFIDENTIAL',
  fontFamily: 'Arial, sans-serif',
  fontSize: 48,
  textColor: '#ffffff',
  isBold: true,
  isItalic: false,
  textStroke: true,
  strokeColor: '#000000',

  // Logo / Image Watermark Settings
  logoItem: null, // { imgElement, name, width, height, aspectRatio }
  logoScale: 100, // 10% to 250%

  // Placement & Transform Settings
  posX: 50, // Percentage (0 to 100)
  posY: 50, // Percentage (0 to 100)
  activeAnchor: 'center', // 'tl', 'tc', 'tr', 'cl', 'center', 'cr', 'bl', 'bc', 'br', 'custom'
  opacity: 0.65, // 0.05 to 1.0
  rotation: -30, // -180 to 180 degrees

  // Tile Pattern Spacing Settings
  spacingX: 260, // 60 to 800 px
  spacingY: 200, // 60 to 800 px

  // Canvas Drag State
  isDragging: false,
  dragOffset: { x: 0, y: 0 },
  isHovered: false,

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

      <!-- Initial Dropzone -->
      <div id="wm-dropzone" class="dropzone-container">
        <div class="dropzone-icon" style="background: var(--accent-blue-bg); color: var(--accent-blue);">
          <i data-lucide="stamp" style="width: 32px; height: 32px;"></i>
        </div>
        <div class="dropzone-title">Select or Drop Images to Watermark</div>
        <div class="dropzone-desc">Batch stamp text, copyright notices, or logo watermarks with draggable positioning & full-image tiling</div>
        <button type="button" class="dropzone-btn"><i data-lucide="upload" style="width: 18px; height: 18px;"></i> Select Images</button>
        <div class="dropzone-formats">Supports: JPG, PNG, WebP, GIF, SVG • Client-side processing</div>
      </div>

      <!-- Main Workspace -->
      <div id="wm-workspace" class="editor-layout" style="display:none;">
        <div class="viewport-card">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
            <div style="font-size: 0.85rem; color: var(--text-secondary); display: flex; align-items: center; gap: 0.5rem;">
              <i data-lucide="move" style="width: 14px; height: 14px; color: var(--accent-blue);"></i>
              <span id="wm-drag-instruction">Drag watermark directly on the image to position</span>
            </div>
            <span id="wm-pos-indicator" style="font-family: var(--font-mono); font-size: 0.8rem; color: var(--text-muted);">Pos: 50%, 50%</span>
          </div>

          <div class="canvas-wrapper" style="position: relative; overflow: hidden;">
            <canvas id="wm-canvas" style="cursor: grab; max-width: 100%; border-radius: var(--radius-md); box-shadow: 0 4px 20px rgba(0,0,0,0.08);"></canvas>
          </div>
        </div>

        <div class="settings-panel">
          <!-- 1. Watermark Type Switcher: Text vs Logo -->
          <div class="settings-group">
            <h4>Watermark Type</h4>
            <div class="chip-group" id="wm-type-chips">
              <button class="chip-btn active" data-type="text">
                <i data-lucide="type" style="width: 14px; height: 14px;"></i> Text Watermark
              </button>
              <button class="chip-btn" data-type="logo">
                <i data-lucide="image" style="width: 14px; height: 14px;"></i> Logo / Image
              </button>
            </div>
          </div>

          <!-- 2. Pattern Mode: Single Position vs Repeat All Over -->
          <div class="settings-group">
            <h4>Pattern Mode</h4>
            <div class="chip-group" id="wm-pattern-chips">
              <button class="chip-btn active" data-pattern="single">
                <i data-lucide="crosshair" style="width: 14px; height: 14px;"></i> Single Position
              </button>
              <button class="chip-btn" data-pattern="repeat">
                <i data-lucide="grid" style="width: 14px; height: 14px;"></i> Repeat All Over (Tile)
              </button>
            </div>
          </div>

          <!-- 3. Text Controls (Visible when mode === 'text') -->
          <div id="wm-text-panel" class="settings-group">
            <label class="control-label" style="margin-bottom: 0.35rem;">Watermark Text</label>
            <input type="text" id="wm-text-input" class="text-input" value="CONFIDENTIAL" placeholder="Enter watermark text...">

            <!-- Font Family Dropdown -->
            <div style="margin-top: 0.75rem;">
              <label class="control-label" style="margin-bottom: 0.35rem;">Font Family</label>
              <select id="wm-font-select" class="text-input" style="cursor: pointer; padding: 0.5rem 0.75rem;">
                <option value="Arial, sans-serif" style="font-family: Arial, sans-serif;">Arial (Modern Clean)</option>
                <option value="Impact, sans-serif" style="font-family: Impact, sans-serif;">Impact (Bold Headline)</option>
                <option value="'Montserrat', sans-serif" style="font-family: sans-serif; font-weight: 700;">Montserrat (Geometric)</option>
                <option value="'Roboto', sans-serif" style="font-family: sans-serif;">Roboto (Clean Grotesk)</option>
                <option value="'Helvetica Neue', Helvetica, sans-serif" style="font-family: 'Helvetica Neue', Helvetica, sans-serif;">Helvetica (Neutral)</option>
                <option value="'Georgia', serif" style="font-family: Georgia, serif;">Georgia (Classic Serif)</option>
                <option value="'Times New Roman', serif" style="font-family: 'Times New Roman', serif;">Times New Roman (Formal)</option>
                <option value="'Playfair Display', serif" style="font-family: serif; font-style: italic;">Playfair Display (Luxury)</option>
                <option value="'Courier New', monospace" style="font-family: 'Courier New', monospace;">Courier New (Typewriter)</option>
                <option value="'Trebuchet MS', sans-serif" style="font-family: 'Trebuchet MS', sans-serif;">Trebuchet MS (Dynamic)</option>
                <option value="'Verdana', sans-serif" style="font-family: Verdana, sans-serif;">Verdana (Legible)</option>
                <option value="'Comic Sans MS', cursive" style="font-family: 'Comic Sans MS', cursive;">Comic Sans (Playful)</option>
                <option value="'Brush Script MT', cursive" style="font-family: 'Brush Script MT', cursive;">Brush Script (Signature)</option>
              </select>
            </div>

            <!-- Font Size -->
            <div class="control-row" style="margin-top: 0.75rem;">
              <div class="control-label"><span>Font Size</span><span id="wm-size-val" class="control-val">48px</span></div>
              <input type="range" id="wm-size-slider" class="range-slider" min="14" max="180" value="48">
            </div>

            <!-- Font Color Picker & Presets -->
            <div style="margin-top: 0.75rem;">
              <div class="control-label" style="margin-bottom: 0.35rem;">Font Color</div>
              <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
                <input type="color" id="wm-color-picker" value="#ffffff" style="width: 38px; height: 32px; border-radius: 6px; cursor: pointer; border: 1px solid var(--border-color); padding: 1px;">
                <div class="chip-group" id="wm-color-presets" style="gap: 4px;">
                  <button class="color-dot" data-color="#ffffff" style="background:#ffffff; border:1px solid #ccc;" title="White"></button>
                  <button class="color-dot" data-color="#000000" style="background:#000000;" title="Black"></button>
                  <button class="color-dot" data-color="#ef4444" style="background:#ef4444;" title="Red"></button>
                  <button class="color-dot" data-color="#f59e0b" style="background:#f59e0b;" title="Amber"></button>
                  <button class="color-dot" data-color="#3b82f6" style="background:#3b82f6;" title="Blue"></button>
                  <button class="color-dot" data-color="#10b981" style="background:#10b981;" title="Emerald"></button>
                  <button class="color-dot" data-color="#64748b" style="background:#64748b;" title="Gray"></button>
                </div>
              </div>
            </div>

            <!-- Font Styles: Bold, Italic, Outline Stroke -->
            <div style="display: flex; gap: 0.5rem; margin-top: 0.75rem; flex-wrap: wrap;">
              <button id="wm-bold-btn" class="chip-btn active" title="Toggle Bold"><strong>B</strong> Bold</button>
              <button id="wm-italic-btn" class="chip-btn" title="Toggle Italic"><em>I</em> Italic</button>
              <button id="wm-stroke-btn" class="chip-btn active" title="Toggle Contrast Outline">
                <i data-lucide="sun" style="width: 13px; height: 13px;"></i> High Contrast Stroke
              </button>
            </div>
          </div>

          <!-- 4. Logo Controls (Visible when mode === 'logo') -->
          <div id="wm-logo-panel" class="settings-group" style="display: none;">
            <h4>Logo / Watermark Image</h4>
            
            <div id="wm-logo-upload-box">
              <label class="btn-secondary" style="cursor: pointer; justify-content: center; width: 100%; text-align: center; border-style: dashed; padding: 1rem;">
                <i data-lucide="image-plus" style="width: 18px; height: 18px;"></i>
                <span>Choose Logo (PNG with transparency, SVG, JPG)</span>
                <input type="file" id="wm-logo-input" accept="image/*" style="display: none;">
              </label>
            </div>

            <div id="wm-logo-preview-box" style="display: none; align-items: center; justify-content: space-between; background: var(--bg-subtle); padding: 0.75rem; border-radius: var(--radius-md); border: 1px solid var(--border-color); margin-bottom: 0.75rem;">
              <div style="display: flex; align-items: center; gap: 0.75rem;">
                <img id="wm-logo-thumb" style="width: 44px; height: 44px; object-fit: contain; border-radius: 6px; background: repeating-conic-gradient(#eee 0% 25%, #fff 0% 50%) 50% / 12px 12px; border: 1px solid var(--border-color);">
                <div>
                  <div id="wm-logo-name" style="font-weight: 600; font-size: 0.85rem; max-width: 140px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">logo.png</div>
                  <div id="wm-logo-dims" style="font-size: 0.75rem; color: var(--text-muted);">200 × 200</div>
                </div>
              </div>
              <button id="wm-logo-remove-btn" class="btn-secondary" style="padding: 4px 8px; font-size: 0.75rem; color: var(--accent-rose);">
                <i data-lucide="trash-2" style="width: 13px; height: 13px;"></i> Remove
              </button>
            </div>

            <!-- Logo Scale Slider -->
            <div class="control-row" style="margin-top: 0.75rem;">
              <div class="control-label"><span>Logo Scale</span><span id="wm-logo-scale-val" class="control-val">100%</span></div>
              <input type="range" id="wm-logo-scale-slider" class="range-slider" min="15" max="250" value="100">
            </div>
          </div>

          <!-- 5. Repeat Spacing Controls (Visible when patternMode === 'repeat') -->
          <div id="wm-repeat-panel" class="settings-group" style="display: none;">
            <h4>Tile Repeat Spacing</h4>
            <div class="control-row">
              <div class="control-label"><span>Horizontal Gap (Spacing X)</span><span id="wm-space-x-val" class="control-val">260px</span></div>
              <input type="range" id="wm-space-x-slider" class="range-slider" min="60" max="700" value="260">
            </div>

            <div class="control-row" style="margin-top: 0.6rem;">
              <div class="control-label"><span>Vertical Gap (Spacing Y)</span><span id="wm-space-y-val" class="control-val">200px</span></div>
              <input type="range" id="wm-space-y-slider" class="range-slider" min="60" max="600" value="200">
            </div>
          </div>

          <!-- 6. Single Position Anchors (Visible when patternMode === 'single') -->
          <div id="wm-single-pos-panel" class="settings-group">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
              <h4 style="margin: 0;">Position (9-Point Snap)</h4>
              <span style="font-size: 0.75rem; color: var(--text-muted);">or drag on canvas</span>
            </div>

            <div class="grid-anchor-selector" id="wm-grid-anchors">
              <button class="anchor-cell" data-pos="tl" title="Top-Left"><i data-lucide="arrow-up-left" style="width:14px;height:14px;"></i></button>
              <button class="anchor-cell" data-pos="tc" title="Top-Center"><i data-lucide="arrow-up" style="width:14px;height:14px;"></i></button>
              <button class="anchor-cell" data-pos="tr" title="Top-Right"><i data-lucide="arrow-up-right" style="width:14px;height:14px;"></i></button>
              <button class="anchor-cell" data-pos="cl" title="Middle-Left"><i data-lucide="arrow-left" style="width:14px;height:14px;"></i></button>
              <button class="anchor-cell active" data-pos="center" title="Center"><i data-lucide="circle-dot" style="width:14px;height:14px;"></i></button>
              <button class="anchor-cell" data-pos="cr" title="Middle-Right"><i data-lucide="arrow-right" style="width:14px;height:14px;"></i></button>
              <button class="anchor-cell" data-pos="bl" title="Bottom-Left"><i data-lucide="arrow-down-left" style="width:14px;height:14px;"></i></button>
              <button class="anchor-cell" data-pos="bc" title="Bottom-Center"><i data-lucide="arrow-down" style="width:14px;height:14px;"></i></button>
              <button class="anchor-cell" data-pos="br" title="Bottom-Right"><i data-lucide="arrow-down-right" style="width:14px;height:14px;"></i></button>
            </div>

            <!-- Fine-Tuning Coordinate Sliders -->
            <div style="margin-top: 0.75rem; display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
              <div>
                <div class="control-label" style="font-size: 0.75rem;"><span>X Offset</span><span id="wm-posx-val" class="control-val">50%</span></div>
                <input type="range" id="wm-posx-slider" class="range-slider" min="0" max="100" value="50">
              </div>
              <div>
                <div class="control-label" style="font-size: 0.75rem;"><span>Y Offset</span><span id="wm-posy-val" class="control-val">50%</span></div>
                <input type="range" id="wm-posy-slider" class="range-slider" min="0" max="100" value="50">
              </div>
            </div>
          </div>

          <!-- 7. Common Styling: Opacity & Rotation -->
          <div class="settings-group">
            <div class="control-row">
              <div class="control-label"><span>Opacity / Transparency</span><span id="wm-opac-val" class="control-val">65%</span></div>
              <input type="range" id="wm-opac-slider" class="range-slider" min="5" max="100" value="65">
            </div>

            <div class="control-row" style="margin-top: 0.6rem;">
              <div class="control-label"><span>Rotation Angle</span><span id="wm-rot-val" class="control-val">-30°</span></div>
              <input type="range" id="wm-rot-slider" class="range-slider" min="-180" max="180" value="-30">
            </div>
          </div>

        </div>
      </div>
    `;

    // Inject color dot styles if not present
    if (!document.getElementById('wm-custom-styles')) {
      const style = document.createElement('style');
      style.id = 'wm-custom-styles';
      style.textContent = `
        .color-dot {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          border: 1px solid rgba(0,0,0,0.15);
          cursor: pointer;
          transition: transform 0.15s ease, box-shadow 0.15s ease;
        }
        .color-dot:hover {
          transform: scale(1.2);
          box-shadow: 0 2px 5px rgba(0,0,0,0.2);
        }
      `;
      document.head.appendChild(style);
    }

    if (window.lucide) window.lucide.createIcons({ root: container });
    this.initEvents(container);
  },

  initEvents(container) {
    const dropzone = container.querySelector('#wm-dropzone');
    const resetBtn = container.querySelector('#wm-reset-btn');
    const execBtn = container.querySelector('#wm-exec-btn');
    const downloadBtn = container.querySelector('#wm-download-btn');

    // Mode chips
    const typeChips = container.querySelectorAll('#wm-type-chips .chip-btn');
    const patternChips = container.querySelectorAll('#wm-pattern-chips .chip-btn');

    // Panels
    const textPanel = container.querySelector('#wm-text-panel');
    const logoPanel = container.querySelector('#wm-logo-panel');
    const repeatPanel = container.querySelector('#wm-repeat-panel');
    const singlePosPanel = container.querySelector('#wm-single-pos-panel');

    // Text inputs
    const txtInput = container.querySelector('#wm-text-input');
    const fontSelect = container.querySelector('#wm-font-select');
    const sizeSlider = container.querySelector('#wm-size-slider');
    const sizeVal = container.querySelector('#wm-size-val');
    const colorPicker = container.querySelector('#wm-color-picker');
    const colorDots = container.querySelectorAll('.color-dot');
    const boldBtn = container.querySelector('#wm-bold-btn');
    const italicBtn = container.querySelector('#wm-italic-btn');
    const strokeBtn = container.querySelector('#wm-stroke-btn');

    // Logo inputs
    const logoInput = container.querySelector('#wm-logo-input');
    const logoUploadBox = container.querySelector('#wm-logo-upload-box');
    const logoPreviewBox = container.querySelector('#wm-logo-preview-box');
    const logoThumb = container.querySelector('#wm-logo-thumb');
    const logoName = container.querySelector('#wm-logo-name');
    const logoDims = container.querySelector('#wm-logo-dims');
    const logoRemoveBtn = container.querySelector('#wm-logo-remove-btn');
    const logoScaleSlider = container.querySelector('#wm-logo-scale-slider');
    const logoScaleVal = container.querySelector('#wm-logo-scale-val');

    // Repeat Spacing inputs
    const spaceXSlider = container.querySelector('#wm-space-x-slider');
    const spaceXVal = container.querySelector('#wm-space-x-val');
    const spaceYSlider = container.querySelector('#wm-space-y-slider');
    const spaceYVal = container.querySelector('#wm-space-y-val');

    // Single Position inputs
    const anchors = container.querySelectorAll('#wm-grid-anchors .anchor-cell');
    const posXSlider = container.querySelector('#wm-posx-slider');
    const posXVal = container.querySelector('#wm-posx-val');
    const posYSlider = container.querySelector('#wm-posy-slider');
    const posYVal = container.querySelector('#wm-posy-val');

    // Common sliders
    const opacSlider = container.querySelector('#wm-opac-slider');
    const opacVal = container.querySelector('#wm-opac-val');
    const rotSlider = container.querySelector('#wm-rot-slider');
    const rotVal = container.querySelector('#wm-rot-val');

    // File loading
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

    // 1. Watermark Type toggle
    typeChips.forEach(btn => {
      btn.addEventListener('click', () => {
        typeChips.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.mode = btn.dataset.type;

        if (this.mode === 'text') {
          textPanel.style.display = 'block';
          logoPanel.style.display = 'none';
        } else {
          textPanel.style.display = 'none';
          logoPanel.style.display = 'block';
        }
        this.drawPreview(container);
      });
    });

    // 2. Pattern Mode toggle (Single vs Repeat)
    patternChips.forEach(btn => {
      btn.addEventListener('click', () => {
        patternChips.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.patternMode = btn.dataset.pattern;

        if (this.patternMode === 'repeat') {
          repeatPanel.style.display = 'block';
          singlePosPanel.style.display = 'none';
          container.querySelector('#wm-drag-instruction').textContent = 'Repeat All Over mode active (adjust spacing below)';
        } else {
          repeatPanel.style.display = 'none';
          singlePosPanel.style.display = 'block';
          container.querySelector('#wm-drag-instruction').textContent = 'Drag watermark directly on the image to position';
        }
        this.drawPreview(container);
      });
    });

    // 3. Text Controls
    txtInput.addEventListener('input', (e) => {
      this.watermarkText = e.target.value;
      this.drawPreview(container);
    });

    fontSelect.addEventListener('change', (e) => {
      this.fontFamily = e.target.value;
      this.drawPreview(container);
    });

    sizeSlider.addEventListener('input', (e) => {
      this.fontSize = parseInt(e.target.value);
      sizeVal.textContent = `${this.fontSize}px`;
      this.drawPreview(container);
    });

    colorPicker.addEventListener('input', (e) => {
      this.textColor = e.target.value;
      this.drawPreview(container);
    });

    colorDots.forEach(dot => {
      dot.addEventListener('click', () => {
        const c = dot.dataset.color;
        this.textColor = c;
        colorPicker.value = c;
        this.drawPreview(container);
      });
    });

    boldBtn.addEventListener('click', () => {
      this.isBold = !this.isBold;
      boldBtn.classList.toggle('active', this.isBold);
      this.drawPreview(container);
    });

    italicBtn.addEventListener('click', () => {
      this.isItalic = !this.isItalic;
      italicBtn.classList.toggle('active', this.isItalic);
      this.drawPreview(container);
    });

    strokeBtn.addEventListener('click', () => {
      this.textStroke = !this.textStroke;
      strokeBtn.classList.toggle('active', this.textStroke);
      this.drawPreview(container);
    });

    // 4. Logo Controls
    logoInput.addEventListener('change', async (e) => {
      if (!e.target.files.length) return;
      const file = e.target.files[0];
      try {
        const item = await loadImageFromFile(file);
        this.logoItem = item;
        logoUploadBox.style.display = 'none';
        logoPreviewBox.style.display = 'flex';
        logoThumb.src = item.dataUrl;
        logoName.textContent = item.name;
        logoDims.textContent = `${item.width} × ${item.height}`;
        this.drawPreview(container);
        Toast.success(`Loaded logo: ${item.name}`);
      } catch (err) {
        Toast.error('Could not load logo image');
      }
      logoInput.value = '';
    });

    logoRemoveBtn.addEventListener('click', () => {
      this.logoItem = null;
      logoUploadBox.style.display = 'block';
      logoPreviewBox.style.display = 'none';
      this.drawPreview(container);
      Toast.info('Logo removed');
    });

    logoScaleSlider.addEventListener('input', (e) => {
      this.logoScale = parseInt(e.target.value);
      logoScaleVal.textContent = `${this.logoScale}%`;
      this.drawPreview(container);
    });

    // 5. Repeat Spacing Controls
    spaceXSlider.addEventListener('input', (e) => {
      this.spacingX = parseInt(e.target.value);
      spaceXVal.textContent = `${this.spacingX}px`;
      this.drawPreview(container);
    });

    spaceYSlider.addEventListener('input', (e) => {
      this.spacingY = parseInt(e.target.value);
      spaceYVal.textContent = `${this.spacingY}px`;
      this.drawPreview(container);
    });

    // 6. Single Position Snap Anchors
    anchors.forEach(cell => {
      cell.addEventListener('click', () => {
        anchors.forEach(c => c.classList.remove('active'));
        cell.classList.add('active');
        this.activeAnchor = cell.dataset.pos;

        // Map anchor to percentages
        const anchorCoords = {
          'tl': [15, 15], 'tc': [50, 15], 'tr': [85, 15],
          'cl': [15, 50], 'center': [50, 50], 'cr': [85, 50],
          'bl': [15, 85], 'bc': [50, 85], 'br': [85, 85]
        };

        const [px, py] = anchorCoords[this.activeAnchor] || [50, 50];
        this.posX = px;
        this.posY = py;
        posXSlider.value = px;
        posYSlider.value = py;
        posXVal.textContent = `${px}%`;
        posYVal.textContent = `${py}%`;

        this.drawPreview(container);
      });
    });

    // Fine-Tuning Coordinate Sliders
    posXSlider.addEventListener('input', (e) => {
      this.posX = parseInt(e.target.value);
      posXVal.textContent = `${this.posX}%`;
      this.activeAnchor = 'custom';
      anchors.forEach(c => c.classList.remove('active'));
      this.drawPreview(container);
    });

    posYSlider.addEventListener('input', (e) => {
      this.posY = parseInt(e.target.value);
      posYVal.textContent = `${this.posY}%`;
      this.activeAnchor = 'custom';
      anchors.forEach(c => c.classList.remove('active'));
      this.drawPreview(container);
    });

    // 7. Common Sliders: Opacity & Rotation
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

    // Main Actions
    execBtn.addEventListener('click', () => this.processWatermarking(container));
    downloadBtn.addEventListener('click', () => this.downloadAll());
    resetBtn.addEventListener('click', () => this.reset(container));

    // Setup interactive canvas dragging
    this.setupCanvasDragging(container);
  },

  /**
   * Interactive Direct Canvas Dragging
   */
  setupCanvasDragging(container) {
    const canvas = container.querySelector('#wm-canvas');
    const posXSlider = container.querySelector('#wm-posx-slider');
    const posYSlider = container.querySelector('#wm-posy-slider');
    const posXVal = container.querySelector('#wm-posx-val');
    const posYVal = container.querySelector('#wm-posy-val');
    const anchors = container.querySelectorAll('#wm-grid-anchors .anchor-cell');

    const getCanvasPos = (e) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY
      };
    };

    const isInsideWatermark = (pos) => {
      if (this.patternMode !== 'single') return false;
      const targetX = (this.posX / 100) * canvas.width;
      const targetY = (this.posY / 100) * canvas.height;
      const ctx = canvas.getContext('2d');

      let w = 120, h = 60;
      if (this.mode === 'text' && this.watermarkText) {
        ctx.font = `${this.isBold ? 'bold ' : ''}${this.isItalic ? 'italic ' : ''}${this.fontSize}px ${this.fontFamily}`;
        const metrics = ctx.measureText(this.watermarkText);
        w = Math.max(80, metrics.width + 30);
        h = Math.max(40, this.fontSize + 24);
      } else if (this.mode === 'logo' && this.logoItem) {
        const baseW = Math.round(canvas.width * 0.25 * (this.logoScale / 100));
        const baseH = Math.round(baseW / this.logoItem.aspectRatio);
        w = baseW + 20;
        h = baseH + 20;
      }

      // Check distance from center (approx bounding box hit test)
      const dx = Math.abs(pos.x - targetX);
      const dy = Math.abs(pos.y - targetY);
      return dx <= w / 2 && dy <= h / 2;
    };

    canvas.addEventListener('pointerdown', (e) => {
      if (this.patternMode !== 'single') return;
      const pos = getCanvasPos(e);
      const targetX = (this.posX / 100) * canvas.width;
      const targetY = (this.posY / 100) * canvas.height;

      if (isInsideWatermark(pos)) {
        this.isDragging = true;
        this.dragOffset = {
          x: pos.x - targetX,
          y: pos.y - targetY
        };
        canvas.style.cursor = 'grabbing';
        canvas.setPointerCapture(e.pointerId);
      } else {
        // Instant click-to-move watermark to clicked spot
        const newX = Math.round(Math.max(2, Math.min(98, (pos.x / canvas.width) * 100)));
        const newY = Math.round(Math.max(2, Math.min(98, (pos.y / canvas.height) * 100)));
        this.posX = newX;
        this.posY = newY;
        this.activeAnchor = 'custom';
        anchors.forEach(c => c.classList.remove('active'));
        posXSlider.value = newX;
        posYSlider.value = newY;
        posXVal.textContent = `${newX}%`;
        posYVal.textContent = `${newY}%`;

        this.isDragging = true;
        this.dragOffset = { x: 0, y: 0 };
        canvas.style.cursor = 'grabbing';
        canvas.setPointerCapture(e.pointerId);
        this.drawPreview(container);
      }
    });

    canvas.addEventListener('pointermove', (e) => {
      const pos = getCanvasPos(e);

      if (this.isDragging) {
        const canvasX = pos.x - this.dragOffset.x;
        const canvasY = pos.y - this.dragOffset.y;

        const pctX = Math.round(Math.max(0, Math.min(100, (canvasX / canvas.width) * 100)));
        const pctY = Math.round(Math.max(0, Math.min(100, (canvasY / canvas.height) * 100)));

        this.posX = pctX;
        this.posY = pctY;
        this.activeAnchor = 'custom';
        anchors.forEach(c => c.classList.remove('active'));

        posXSlider.value = pctX;
        posYSlider.value = pctY;
        posXVal.textContent = `${pctX}%`;
        posYVal.textContent = `${pctY}%`;

        this.drawPreview(container);
      } else {
        if (this.patternMode === 'single' && isInsideWatermark(pos)) {
          canvas.style.cursor = 'grab';
          if (!this.isHovered) {
            this.isHovered = true;
            this.drawPreview(container);
          }
        } else {
          canvas.style.cursor = this.patternMode === 'single' ? 'crosshair' : 'default';
          if (this.isHovered) {
            this.isHovered = false;
            this.drawPreview(container);
          }
        }
      }
    });

    const endDrag = (e) => {
      if (this.isDragging) {
        this.isDragging = false;
        canvas.style.cursor = 'grab';
        try { canvas.releasePointerCapture(e.pointerId); } catch (_) {}
        this.drawPreview(container);
      }
    };

    canvas.addEventListener('pointerup', endDrag);
    canvas.addEventListener('pointercancel', endDrag);
  },

  /**
   * Draw Watermark onto any Canvas (Supports both Single & Repeat Tiling)
   */
  drawWatermarkOnCanvas(canvas, imgElement, isPreview = false) {
    canvas.width = imgElement.naturalWidth || imgElement.width;
    canvas.height = imgElement.naturalHeight || imgElement.height;
    const ctx = canvas.getContext('2d');

    // 1. Draw base photo
    ctx.drawImage(imgElement, 0, 0);

    const w = canvas.width;
    const h = canvas.height;

    // Relative dimension scale multiplier (normalized to ~1200px preview)
    const baseDimension = Math.min(w, h);
    const relScale = Math.max(0.6, baseDimension / 1000);

    ctx.save();

    // 2. Draw Repeating Pattern (Tile All Over)
    if (this.patternMode === 'repeat') {
      const stepX = Math.round(this.spacingX * relScale);
      const stepY = Math.round(this.spacingY * relScale);
      const rad = (this.rotation * Math.PI) / 180;

      // Cover entire rotated bounding area
      const diagonal = Math.sqrt(w * w + h * h);
      const startX = -diagonal;
      const endX = w + diagonal;
      const startY = -diagonal;
      const endY = h + diagonal;

      for (let y = startY, row = 0; y < endY; y += stepY, row++) {
        // Stagger every other row for classic watermark brick pattern
        const offsetX = (row % 2 === 1) ? stepX / 2 : 0;
        for (let x = startX + offsetX; x < endX; x += stepX) {
          ctx.save();
          ctx.translate(x, y);
          ctx.rotate(rad);
          this.renderSingleWatermarkElement(ctx, relScale);
          ctx.restore();
        }
      }
    } else {
      // 3. Draw Single Position (Draggable)
      const targetX = (this.posX / 100) * w;
      const targetY = (this.posY / 100) * h;
      const rad = (this.rotation * Math.PI) / 180;

      ctx.save();
      ctx.translate(targetX, targetY);
      ctx.rotate(rad);

      const bounds = this.renderSingleWatermarkElement(ctx, relScale);
      ctx.restore();

      // If in preview mode and user is hovering or dragging, draw subtle dashed outline
      if (isPreview && (this.isDragging || this.isHovered)) {
        ctx.save();
        ctx.translate(targetX, targetY);
        ctx.rotate(rad);
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);
        ctx.strokeRect(-bounds.w / 2 - 8, -bounds.h / 2 - 6, bounds.w + 16, bounds.h + 12);
        ctx.restore();
      }
    }

    ctx.restore();
  },

  /**
   * Helper to render either Text or Logo at (0, 0) relative to translated context
   */
  renderSingleWatermarkElement(ctx, relScale = 1) {
    let bounds = { w: 100, h: 40 };

    if (this.mode === 'text') {
      if (!this.watermarkText) return bounds;

      const scaledSize = Math.round(this.fontSize * relScale);
      const fontStr = `${this.isBold ? 'bold ' : ''}${this.isItalic ? 'italic ' : ''}${scaledSize}px ${this.fontFamily}`;
      ctx.font = fontStr;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const metrics = ctx.measureText(this.watermarkText);
      bounds.w = metrics.width;
      bounds.h = scaledSize;

      // High-contrast outline stroke
      if (this.textStroke) {
        ctx.save();
        ctx.globalAlpha = Math.min(1.0, this.opacity * 1.2);
        // If text is white/bright, stroke in dark. If text is dark, stroke in white.
        const isBright = this.isColorBright(this.textColor);
        ctx.strokeStyle = isBright ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.85)';
        ctx.lineWidth = Math.max(3, scaledSize * 0.08);
        ctx.lineJoin = 'round';
        ctx.strokeText(this.watermarkText, 0, 0);
        ctx.restore();
      }

      ctx.save();
      ctx.globalAlpha = this.opacity;
      ctx.fillStyle = this.textColor;
      ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
      ctx.shadowBlur = Math.round(scaledSize * 0.12);
      ctx.shadowOffsetX = 1;
      ctx.shadowOffsetY = 2;
      ctx.fillText(this.watermarkText, 0, 0);
      ctx.restore();

    } else if (this.mode === 'logo') {
      if (!this.logoItem) {
        // Render helpful placeholder if logo not uploaded yet
        ctx.save();
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(-80, -40, 160, 80);
        ctx.font = 'bold 15px -apple-system, BlinkMacSystemFont, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Upload Logo', 0, 0);
        ctx.restore();
        bounds = { w: 160, h: 80 };
        return bounds;
      }

      // Calculate logo dimensions
      const baseW = Math.round(250 * relScale * (this.logoScale / 100));
      const baseH = Math.round(baseW / this.logoItem.aspectRatio);
      bounds.w = baseW;
      bounds.h = baseH;

      ctx.save();
      ctx.globalAlpha = this.opacity;
      ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
      ctx.shadowBlur = 8;
      ctx.drawImage(this.logoItem.imgElement, -baseW / 2, -baseH / 2, baseW, baseH);
      ctx.restore();
    }

    return bounds;
  },

  /**
   * Helper to check if hex color is bright
   */
  isColorBright(hex) {
    if (!hex || hex.length < 6) return true;
    const cleanHex = hex.replace('#', '');
    const r = parseInt(cleanHex.substr(0, 2), 16);
    const g = parseInt(cleanHex.substr(2, 2), 16);
    const b = parseInt(cleanHex.substr(4, 2), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 140;
  },

  drawPreview(container) {
    if (!this.files.length) return;
    const canvas = container.querySelector('#wm-canvas');
    this.drawWatermarkOnCanvas(canvas, this.files[0].imgElement, true);

    const posIndicator = container.querySelector('#wm-pos-indicator');
    if (posIndicator) {
      posIndicator.textContent = this.patternMode === 'repeat' 
        ? `Tiled (${this.spacingX}px × ${this.spacingY}px)`
        : `Pos: X:${this.posX}%, Y:${this.posY}%`;
    }
  },

  async processWatermarking(container) {
    const execBtn = container.querySelector('#wm-exec-btn');
    const downloadBtn = container.querySelector('#wm-download-btn');
    execBtn.disabled = true;
    execBtn.innerHTML = `<i data-lucide="loader-2" style="width: 16px; height: 16px; animation: spin 1s linear infinite;"></i> Stamping...`;
    if (window.lucide) window.lucide.createIcons({ root: execBtn });

    this.watermarkedResults = [];

    for (let i = 0; i < this.files.length; i++) {
      const item = this.files[i];
      const canvas = document.createElement('canvas');
      this.drawWatermarkOnCanvas(canvas, item.imgElement, false);

      const outType = item.type === 'image/png' ? 'image/png' : 'image/jpeg';
      const blob = await canvasToBlob(canvas, outType, 0.95);
      this.watermarkedResults.push({
        blob,
        name: `watermarked_${item.name}`
      });
    }

    execBtn.disabled = false;
    execBtn.innerHTML = `<i data-lucide="check" style="width: 16px; height: 16px;"></i> Watermarked!`;
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
