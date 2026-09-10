/**
 * HTML to IMAGE Tool
 */
import { downloadBlob } from '../utils/file-loader.js';
import { canvasToBlob } from '../utils/canvas-helper.js';
import { Toast } from '../utils/toast.js';

export const HtmlToImageTool = {
  id: 'html-to-image',
  name: 'HTML to IMAGE',
  category: 'create',
  description: 'Convert styled HTML markup, snippets, or web cards into high-resolution PNG, JPG, or SVG images.',

  width: 700,
  height: 420,
  outputType: 'png', // 'png', 'jpeg', 'svg'

  defaultHtml: `<div style="padding: 40px; background: linear-gradient(135deg, #1e293b, #0f172a); color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; border-radius: 16px; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5); width: 100%; height: 100%; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between;">
  <div>
    <span style="background: rgba(59, 130, 246, 0.2); color: #60a5fa; border: 1px solid rgba(59, 130, 246, 0.4); font-size: 12px; font-weight: 700; padding: 4px 10px; border-radius: 9999px; text-transform: uppercase; letter-spacing: 0.05em;">Featured Release</span>
    <h1 style="font-size: 32px; font-weight: 800; margin-top: 14px; line-height: 1.2; letter-spacing: -0.02em;">Instant HTML & CSS to Image</h1>
    <p style="font-size: 16px; color: #94a3b8; margin-top: 10px; line-height: 1.5;">Zero server rendering. Renders crisp vector and typography directly in client memory.</p>
  </div>
  <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid rgba(255, 255, 255, 0.1); padding-top: 20px;">
    <span style="font-size: 14px; font-weight: 600; color: #cbd5e1;">⚡ 100% Client-Side Engine</span>
    <span style="font-size: 14px; color: #38bdf8; font-weight: 600;">omni-img.studio</span>
  </div>
</div>`,

  render(container) {
    container.innerHTML = `
      <div class="workspace-header">
        <div class="workspace-header-left">
          <a href="#/" class="back-btn"><i data-lucide="arrow-left" style="width: 16px; height: 16px;"></i> All Tools</a>
          <div class="workspace-title-wrap">
            <h2>HTML to IMAGE</h2>
          </div>
        </div>
        <div class="workspace-header-right">
          <button id="html-download-btn" class="btn-primary btn-emerald"><i data-lucide="download" style="width: 16px; height: 16px;"></i> Export Image</button>
        </div>
      </div>

      <!-- Workspace -->
      <div class="editor-layout">
        <div class="viewport-card" style="align-items: center; justify-content: center;">
          <div class="canvas-wrapper" style="width: 100%;">
            <canvas id="html-render-canvas"></canvas>
          </div>
        </div>

        <div class="settings-panel">
          <div class="settings-group">
            <h4>Template Presets</h4>
            <div class="chip-group" id="html-presets">
              <button class="chip-btn active" data-preset="hero">Product Card</button>
              <button class="chip-btn" data-preset="quote">Quote Card</button>
              <button class="chip-btn" data-preset="badge">Metrics Badge</button>
            </div>
          </div>

          <div class="settings-group">
            <label class="control-label">HTML / Inline CSS Code</label>
            <textarea id="html-code-input" class="text-input" rows="8" style="font-family: var(--font-mono); font-size: 0.775rem; line-height: 1.4;"></textarea>
          </div>

          <div class="settings-group">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem;">
              <div class="control-row">
                <label class="control-label">Width (px)</label>
                <input type="number" id="html-w-input" class="text-input" value="700">
              </div>
              <div class="control-row">
                <label class="control-label">Height (px)</label>
                <input type="number" id="html-h-input" class="text-input" value="420">
              </div>
            </div>
          </div>

          <div class="settings-group">
            <h4>Export Format</h4>
            <div class="chip-group" id="html-format-chips">
              <button class="chip-btn active" data-fmt="png">PNG (Retina 2X)</button>
              <button class="chip-btn" data-fmt="jpeg">JPG</button>
              <button class="chip-btn" data-fmt="svg">SVG Vector</button>
            </div>
          </div>
        </div>
      </div>
    `;

    if (window.lucide) window.lucide.createIcons({ root: container });
    this.initEvents(container);
  },

  initEvents(container) {
    const codeInput = container.querySelector('#html-code-input');
    const wInput = container.querySelector('#html-w-input');
    const hInput = container.querySelector('#html-h-input');
    const presetBtns = container.querySelectorAll('#html-presets .chip-btn');
    const formatChips = container.querySelectorAll('#html-format-chips .chip-btn');
    const downloadBtn = container.querySelector('#html-download-btn');

    codeInput.value = this.defaultHtml;

    presetBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        presetBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const p = btn.dataset.preset;
        if (p === 'hero') {
          codeInput.value = this.defaultHtml;
        } else if (p === 'quote') {
          codeInput.value = `<div style="padding: 50px; background: #ffffff; color: #1e293b; font-family: Georgia, serif; border-left: 8px solid #3b82f6; border-radius: 8px; width: 100%; height: 100%; box-sizing: border-box; display: flex; flex-direction: column; justify-content: center;">
  <p style="font-size: 26px; font-style: italic; line-height: 1.4; margin-bottom: 20px;">"Simplicity is prerequisite for reliability."</p>
  <span style="font-size: 16px; font-family: -apple-system, BlinkMacSystemFont, sans-serif; font-weight: 700; color: #64748b;">— Edsger W. Dijkstra</span>
</div>`;
        } else if (p === 'badge') {
          codeInput.value = `<div style="padding: 30px; background: #0f172a; border-radius: 12px; color: #fff; font-family: -apple-system, BlinkMacSystemFont, sans-serif; width: 100%; height: 100%; box-sizing: border-box; display: flex; align-items: center; justify-content: space-around;">
  <div style="text-align: center;"><div style="font-size: 38px; font-weight: 800; color: #10b981;">100%</div><div style="font-size: 13px; color: #94a3b8; text-transform: uppercase;">Client-Side</div></div>
  <div style="width: 1px; height: 60px; background: #334155;"></div>
  <div style="text-align: center;"><div style="font-size: 38px; font-weight: 800; color: #3b82f6;">0 ms</div><div style="font-size: 13px; color: #94a3b8; text-transform: uppercase;">Server Latency</div></div>
  <div style="width: 1px; height: 60px; background: #334155;"></div>
  <div style="text-align: center;"><div style="font-size: 38px; font-weight: 800; color: #f59e0b;">$0.00</div><div style="font-size: 13px; color: #94a3b8; text-transform: uppercase;">Hosting Cost</div></div>
</div>`;
        }
        this.renderCanvas(container);
      });
    });

    formatChips.forEach(btn => {
      btn.addEventListener('click', () => {
        formatChips.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.outputType = btn.dataset.fmt;
      });
    });

    codeInput.addEventListener('input', () => this.renderCanvas(container));
    wInput.addEventListener('input', (e) => {
      this.width = parseInt(e.target.value) || 400;
      this.renderCanvas(container);
    });
    hInput.addEventListener('input', (e) => {
      this.height = parseInt(e.target.value) || 200;
      this.renderCanvas(container);
    });

    downloadBtn.addEventListener('click', () => this.downloadImage(container));

    this.renderCanvas(container);
  },

  async renderCanvas(container) {
    const canvas = container.querySelector('#html-render-canvas');
    const code = container.querySelector('#html-code-input').value;
    const w = this.width;
    const h = this.height;

    canvas.width = w * 2; // Retina 2x scale
    canvas.height = h * 2;
    const ctx = canvas.getContext('2d');
    ctx.scale(2, 2);

    const svgString = `
      <svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
        <foreignObject width="100%" height="100%">
          <div xmlns="http://www.w3.org/1999/xhtml" style="width: 100%; height: 100%;">
            ${code}
          </div>
        </foreignObject>
      </svg>
    `;

    const img = new Image();
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    img.onload = () => {
      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
    };
    img.src = url;
  },

  async downloadImage(container) {
    const canvas = container.querySelector('#html-render-canvas');
    if (this.outputType === 'svg') {
      const code = container.querySelector('#html-code-input').value;
      const svgString = `
        <svg xmlns="http://www.w3.org/2000/svg" width="${this.width}" height="${this.height}">
          <foreignObject width="100%" height="100%">
            <div xmlns="http://www.w3.org/1999/xhtml" style="width: 100%; height: 100%;">
              ${code}
            </div>
          </foreignObject>
        </svg>
      `;
      const blob = new Blob([svgString], { type: 'image/svg+xml' });
      downloadBlob(blob, 'rendered_html.svg');
    } else {
      const mime = this.outputType === 'jpeg' ? 'image/jpeg' : 'image/png';
      const blob = await canvasToBlob(canvas, mime, 0.95);
      downloadBlob(blob, `rendered_html.${this.outputType}`);
    }
    Toast.success('Exported HTML to image successfully!');
  }
};
