# 🖼️ OmniIMG — 100% Client-Side Bulk Image Tools Suite

> **Fast, Free, and 100% Private iLoveIMG Alternative**  
> Compress, resize, crop, convert, upscale, remove backgrounds, watermark, caption memes, blur faces, and strip metadata directly in your browser. **Zero server uploads. Zero hosting costs. 100% Data Privacy.**

---

## 🌟 Highlights

- **100% Client-Side Processing**: All operations are executed directly on your device's CPU/GPU via HTML5 Canvas, OffscreenCanvas, and Web APIs. Images never touch a remote server.
- **$0 Hosting Cost**: Can be hosted forever on **GitHub Pages**, **Cloudflare Pages**, or **Vercel** with zero server maintenance.
- **Custom Domain Ready**: Pre-configured with automated GitHub Actions CI/CD and custom domain support with free SSL.
- **Zero Build Tools Required**: Pure ES modules and vanilla CSS—run immediately with any static server or Python.
- **Bulk Processing**: Batch compress, resize, convert, watermark, and rotate multiple images simultaneously with single-click ZIP download via JSZip.

---

## 🛠️ All 16 Built-in Tools

| # | Tool | Category | Engine | Description |
| :--- | :--- | :--- | :--- | :--- |
| 1 | **🗜️ Compress IMAGE** | Optimize | Canvas + Blob | Compress JPG, PNG, SVG, and GIFs with quality sliders, live savings calculator, and bulk ZIP download. |
| 2 | **📐 Resize IMAGE** | Edit | Bicubic Resampling | Resize images in bulk by percentage (25%, 50%, 75%) or exact pixel dimensions with aspect ratio lock. |
| 3 | **✂️ Crop IMAGE** | Edit | Canvas 2D | Visual interactive crop box with draggable handles and presets (1:1, 4:3, 16:9, 9:16, Freeform). |
| 4 | **🔄 Convert to JPG** | Convert | Canvas Export | Batch turn PNG, GIF, SVG, WEBP, and other formats to JPG with custom background fill color. |
| 5 | **🎞️ Convert from JPG** | Convert | Canvas + Frame Loop | Turn JPGs into PNG, WebP, or combine multiple JPGs into an **Animated GIF** with frame delay controls! |
| 6 | **🎨 Photo editor** | Edit | Canvas Filters | Adjust brightness, contrast, saturation, and sepia; apply presets (Vintage, Noir, Vibrant), text, and stickers. |
| 7 | **✨ Upscale Image** *(New!)* | Optimize | Bicubic + Sharpen | Enlarge images 2X or 4X with an unsharp masking convolution filter to preserve crisp edge definition. |
| 8 | **🪄 Remove background** *(New!)* | Edit | Chroma Knockout | Smart magic wand / color keying background knockout with tolerance, edge feathering, and eyedropper. |
| 9 | **💧 Watermark IMAGE** | Security | Canvas Overlay | Stamp text or logo watermarks in bulk with a 9-point anchor grid, rotation, opacity, and tile mode. |
| 10 | **🎭 Meme generator** | Create | Typography Engine | Top and bottom text meme generator with classic Impact outline styling and custom image upload. |
| 11 | **🔃 Rotate IMAGE** | Edit | Canvas Transform | Rotate 90° CW/CCW, 180°, flip horizontally/vertically, with selective landscape/portrait filters. |
| 12 | **🌐 HTML to IMAGE** | Create | SVG ForeignObject | Render styled HTML/CSS snippets, quote cards, and badges into retina-quality PNG, JPG, or SVG images. |
| 13 | **🕶️ Blur face & Privacy** *(New!)* | Security | Canvas Region Filter | Interactive drag-to-draw censor boxes over faces, license plates, and sensitive documents (Pixelate or Blur). |
| 14 | **🖌️ Blur IMAGE** *(New!)* | Edit / Security | Canvas Mask Brush | Blur whole images or paint custom blur with an interactive brush, intensity presets, and background defocus. |
| 15 | **🎨 Color Palette** | Create | Pixel Quantization | Extract dominant color palettes and harmonies with one-click HEX/RGB copy and palette card export. |
| 16 | **🛡️ Strip Metadata (EXIF)** | Security | Clean Canvas Buffer | Erase GPS coordinates, camera serials, timestamps, and device metadata before sharing photos online. |

---

## 🚀 How to Run Locally

You can test and run OmniIMG immediately using Python's built-in web server:

```bash
cd /path/to/image-studio
# macOS built-in (instant, zero dependencies):
ruby -run -ehttpd . -p8080

# Or with Python:
python3 -m http.server 8080
```

Open your browser and navigate to `http://localhost:8080`.

---

## 🌐 Deploy to GitHub Pages (Step-by-Step)

1. **Initialize Git repository**:
   ```bash
   cd /path/to/image-studio
   git init
   git add .
   git commit -m "feat: Initial release of OmniIMG Bulk Image Suite"
   git branch -M main
   ```

2. **Push to GitHub**:
   Create a new empty repository on GitHub (e.g. `image-studio`), then run:
   ```bash
   git remote add origin https://github.com/everlovingvijay/image-studio.git
   git push -u origin main
   ```

3. **Enable GitHub Pages**:
   - Go to your repository **Settings** -> **Pages**.
   - Under **Build and deployment** -> **Source**, select **GitHub Actions** (the included `.github/workflows/deploy.yml` workflow will automatically deploy your site).
   - Your site will be live at `https://everlovingvijay.github.io/image-studio/`.

---

## 🌍 Deploy on Your Custom Domain

See the complete guide in [`DEPLOYMENT.md`](./DEPLOYMENT.md) for detailed DNS configuration.

### Quick Setup:
- **Subdomain** (`img.yourdomain.com`): Add a `CNAME` record pointing to `everlovingvijay.github.io`.
- **Apex Domain** (`yourdomain.com`): Add `A` records pointing to GitHub's IPs:
  ```
  185.199.108.153
  185.199.109.153
  185.199.110.153
  185.199.111.153
  ```
- Enter your domain in GitHub Repository **Settings** -> **Pages** -> **Custom domain**, and check **Enforce HTTPS**.

---

## 📄 License

MIT License — Free to modify, self-host, and brand for personal or commercial use.
