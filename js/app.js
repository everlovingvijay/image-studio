/**
 * OmniIMG — Core Application Controller & Router
 */

import { CompressTool } from './tools/compress.js';
import { ResizeTool } from './tools/resize.js';
import { CropTool } from './tools/crop.js';
import { ConvertToJpgTool } from './tools/convert-to-jpg.js';
import { ConvertFromJpgTool } from './tools/convert-from-jpg.js';
import { PhotoEditorTool } from './tools/photo-editor.js';
import { UpscaleTool } from './tools/upscale.js';
import { RemoveBgTool } from './tools/remove-bg.js';
import { WatermarkTool } from './tools/watermark.js';
import { MemeGeneratorTool } from './tools/meme-generator.js';
import { RotateTool } from './tools/rotate.js';
import { HtmlToImageTool } from './tools/html-to-image.js';
import { BlurFaceTool } from './tools/blur-face.js';
import { ColorPaletteTool } from './tools/color-palette.js';
import { MetadataStripperTool } from './tools/metadata-stripper.js';
import { BlurImageTool } from './tools/blur-image.js';

const TOOLS = [
  CompressTool,
  ResizeTool,
  CropTool,
  ConvertToJpgTool,
  ConvertFromJpgTool,
  PhotoEditorTool,
  UpscaleTool,
  RemoveBgTool,
  WatermarkTool,
  MemeGeneratorTool,
  RotateTool,
  HtmlToImageTool,
  BlurFaceTool,
  BlurImageTool,
  ColorPaletteTool,
  MetadataStripperTool
];

const App = {
  catalogView: null,
  workspaceView: null,
  currentCategory: 'all',
  searchQuery: '',

  init() {
    this.catalogView = document.getElementById('catalog-view');
    this.workspaceView = document.getElementById('workspace-view');

    this.initTheme();
    this.initCatalogFilters();
    this.initRouting();

    if (window.lucide) {
      window.lucide.createIcons();
    }
  },

  initTheme() {
    const toggleBtn = document.getElementById('theme-toggle-btn');
    const themeIcon = document.getElementById('theme-icon');
    const savedTheme = localStorage.getItem('omni_theme') || 'light';

    document.documentElement.setAttribute('data-theme', savedTheme);
    this.updateThemeIcon(themeIcon, savedTheme);

    toggleBtn.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme');
      const next = current === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('omni_theme', next);
      this.updateThemeIcon(themeIcon, next);
    });
  },

  updateThemeIcon(el, theme) {
    if (!el) return;
    el.innerHTML = theme === 'dark'
      ? '<i data-lucide="sun" style="width: 18px; height: 18px;"></i>'
      : '<i data-lucide="moon" style="width: 18px; height: 18px;"></i>';
    if (window.lucide) window.lucide.createIcons({ root: el });
  },

  initCatalogFilters() {
    const tabs = document.querySelectorAll('.cat-tab');
    const searchInput = document.getElementById('tool-search');

    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.currentCategory = tab.dataset.category;
        this.filterCards();
      });
    });

    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchQuery = e.target.value.toLowerCase().trim();
        this.filterCards();
      });
    }
  },

  filterCards() {
    const cards = document.querySelectorAll('.tool-card');
    let visibleCount = 0;

    cards.forEach(card => {
      const cat = card.dataset.category || '';
      const text = card.textContent.toLowerCase();

      const matchCategory = (this.currentCategory === 'all' || cat.includes(this.currentCategory));
      const matchSearch = (!this.searchQuery || text.includes(this.searchQuery));

      if (matchCategory && matchSearch) {
        card.style.display = 'flex';
        visibleCount++;
      } else {
        card.style.display = 'none';
      }
    });

    const noResults = document.getElementById('no-results-msg');
    if (noResults) {
      noResults.style.display = visibleCount === 0 ? 'block' : 'none';
    }
  },

  initRouting() {
    window.addEventListener('hashchange', () => this.handleRoute());
    this.handleRoute();
  },

  handleRoute() {
    const hash = window.location.hash || '#/';
    if (hash === '#/' || hash === '#' || hash === '') {
      this.showCatalog();
    } else {
      const toolId = hash.replace('#/', '');
      const tool = TOOLS.find(t => t.id === toolId);
      if (tool) {
        this.showTool(tool);
      } else {
        this.showCatalog();
      }
    }
  },

  showCatalog() {
    window.scrollTo({ top: 0, behavior: 'instant' });
    this.workspaceView.classList.remove('active');
    this.workspaceView.innerHTML = '';
    this.catalogView.style.display = 'block';
    if (window.lucide) window.lucide.createIcons();
  },

  showTool(tool) {
    window.scrollTo({ top: 0, behavior: 'instant' });
    this.catalogView.style.display = 'none';
    this.workspaceView.classList.add('active');
    tool.render(this.workspaceView);
  }
};

document.addEventListener('DOMContentLoaded', () => App.init());
