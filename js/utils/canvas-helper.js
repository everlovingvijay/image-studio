/**
 * Canvas Image Processing Algorithms & Utilities
 */

export function canvasToBlob(canvas, type = 'image/jpeg', quality = 0.85) {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), type, quality);
  });
}

/**
 * High-quality multi-step step-down or bicubic scaling
 */
export function resampleCanvas(source, targetWidth, targetHeight, smoothing = true) {
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(targetWidth);
  canvas.height = Math.round(targetHeight);
  const ctx = canvas.getContext('2d');

  ctx.imageSmoothingEnabled = smoothing;
  ctx.imageSmoothingQuality = 'high';

  // If stepping down more than 2x, step down in stages to avoid aliasing artifacts
  let curWidth = source.naturalWidth || source.width;
  let curHeight = source.naturalHeight || source.height;

  if (targetWidth < curWidth * 0.5 && targetHeight < curHeight * 0.5) {
    let intermediate = document.createElement('canvas');
    let interCtx = intermediate.getContext('2d');
    interCtx.imageSmoothingEnabled = true;
    interCtx.imageSmoothingQuality = 'high';

    let stepW = curWidth;
    let stepH = curHeight;

    while (stepW * 0.5 > targetWidth) {
      stepW = Math.round(stepW * 0.5);
      stepH = Math.round(stepH * 0.5);
      intermediate.width = stepW;
      intermediate.height = stepH;
      interCtx.drawImage(source, 0, 0, stepW, stepH);
      source = intermediate;
    }
  }

  ctx.drawImage(source, 0, 0, targetWidth, targetHeight);
  return canvas;
}

/**
 * 3x3 Convolution filter (Unsharp mask / Sharpen for upscale)
 */
export function applyConvolution(canvas, weights, factor = 1, bias = 0) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  const srcData = ctx.getImageData(0, 0, w, h);
  const dstData = ctx.createImageData(w, h);

  const src = srcData.data;
  const dst = dstData.data;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let r = 0, g = 0, b = 0;
      for (let cy = 0; cy < 3; cy++) {
        for (let cx = 0; cx < 3; cx++) {
          const scy = Math.min(h - 1, Math.max(0, y + cy - 1));
          const scx = Math.min(w - 1, Math.max(0, x + cx - 1));
          const srcOffset = (scy * w + scx) * 4;
          const wt = weights[cy * 3 + cx];
          r += src[srcOffset] * wt;
          g += src[srcOffset + 1] * wt;
          b += src[srcOffset + 2] * wt;
        }
      }
      const dstOffset = (y * w + x) * 4;
      dst[dstOffset] = Math.min(255, Math.max(0, (r * factor) + bias));
      dst[dstOffset + 1] = Math.min(255, Math.max(0, (g * factor) + bias));
      dst[dstOffset + 2] = Math.min(255, Math.max(0, (b * factor) + bias));
      dst[dstOffset + 3] = src[dstOffset + 3]; // preserve original alpha
    }
  }

  ctx.putImageData(dstData, 0, 0);
  return canvas;
}

/**
 * Upscale with Bicubic Resampling + Edge Enhancement
 */
export function upscaleImage(img, scaleFactor = 2, sharpenStrength = 0.3) {
  const targetW = (img.naturalWidth || img.width) * scaleFactor;
  const targetH = (img.naturalHeight || img.height) * scaleFactor;
  const canvas = resampleCanvas(img, targetW, targetH, true);

  if (sharpenStrength > 0) {
    // Unsharp mask kernel: [0, -1, 0, -1, 4 + 1/strength, -1, 0, -1, 0]
    const center = 4 + (1 / sharpenStrength);
    const kernel = [
      0, -1, 0,
      -1, center, -1,
      0, -1, 0
    ];
    const sum = center - 4;
    applyConvolution(canvas, kernel, 1 / sum, 0);
  }

  return canvas;
}

/**
 * Background Removal (Magic Wand / Color Knockout with feathering)
 */
export function removeBackgroundByColor(canvas, targetR, targetG, targetB, tolerance = 35, feather = 1) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;

  const tolSq = tolerance * tolerance * 3;
  const maxDist = (tolerance + feather * 10) * (tolerance + feather * 10) * 3;

  for (let i = 0; i < data.length; i += 4) {
    const dr = data[i] - targetR;
    const dg = data[i + 1] - targetG;
    const db = data[i + 2] - targetB;
    const distSq = dr * dr + dg * dg + db * db;

    if (distSq <= tolSq) {
      data[i + 3] = 0; // Fully transparent
    } else if (distSq < maxDist && feather > 0) {
      // Smooth alpha falloff
      const alphaFactor = (distSq - tolSq) / (maxDist - tolSq);
      data[i + 3] = Math.min(data[i + 3], Math.round(data[i + 3] * alphaFactor));
    }
  }

  ctx.putImageData(imgData, 0, 0);
  return canvas;
}

/**
 * Censor / Blur Region (Gaussian Blur or Pixelate Mosaic)
 */
export function censorRegion(ctx, x, y, width, height, mode = 'pixelate', intensity = 15) {
  if (width <= 0 || height <= 0) return;
  const rx = Math.round(Math.max(0, x));
  const ry = Math.round(Math.max(0, y));
  const rw = Math.round(Math.min(width, ctx.canvas.width - rx));
  const rh = Math.round(Math.min(height, ctx.canvas.height - ry));
  if (rw <= 0 || rh <= 0) return;

  if (mode === 'pixelate') {
    const blockSize = Math.max(4, Math.round(intensity));
    const regionData = ctx.getImageData(rx, ry, rw, rh);
    const data = regionData.data;

    for (let py = 0; py < rh; py += blockSize) {
      for (let px = 0; px < rw; px += blockSize) {
        let r = 0, g = 0, b = 0, count = 0;
        const limitY = Math.min(rh, py + blockSize);
        const limitX = Math.min(rw, px + blockSize);

        for (let sy = py; sy < limitY; sy++) {
          for (let sx = px; sx < limitX; sx++) {
            const idx = (sy * rw + sx) * 4;
            r += data[idx];
            g += data[idx + 1];
            b += data[idx + 2];
            count++;
          }
        }

        r = Math.round(r / count);
        g = Math.round(g / count);
        b = Math.round(b / count);

        for (let sy = py; sy < limitY; sy++) {
          for (let sx = px; sx < limitX; sx++) {
            const idx = (sy * rw + sx) * 4;
            data[idx] = r;
            data[idx + 1] = g;
            data[idx + 2] = b;
          }
        }
      }
    }
    ctx.putImageData(regionData, rx, ry);
  } else {
    // Gaussian-like blur by scaling down and back up
    const smallCanvas = document.createElement('canvas');
    const scale = Math.max(0.04, 1 / (intensity * 0.5));
    smallCanvas.width = Math.max(1, Math.round(rw * scale));
    smallCanvas.height = Math.max(1, Math.round(rh * scale));
    const sCtx = smallCanvas.getContext('2d');
    sCtx.imageSmoothingEnabled = true;
    sCtx.imageSmoothingQuality = 'high';
    sCtx.drawImage(ctx.canvas, rx, ry, rw, rh, 0, 0, smallCanvas.width, smallCanvas.height);

    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(smallCanvas, 0, 0, smallCanvas.width, smallCanvas.height, rx, ry, rw, rh);
    ctx.restore();
  }
}

/**
 * Extract Dominant Colors from Canvas (Simple K-Means / Bucket sampling)
 */
export function extractPalette(img, colorCount = 6) {
  const canvas = document.createElement('canvas');
  const size = 120;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, size, size);
  const data = ctx.getImageData(0, 0, size, size).data;

  const colorBuckets = {};
  for (let i = 0; i < data.length; i += 16) {
    if (data[i + 3] < 128) continue; // skip transparent
    // Quantize to 5 bits per channel (step of 8)
    const r = Math.round(data[i] / 16) * 16;
    const g = Math.round(data[i + 1] / 16) * 16;
    const b = Math.round(data[i + 2] / 16) * 16;
    const key = `${r},${g},${b}`;
    colorBuckets[key] = (colorBuckets[key] || 0) + 1;
  }

  const sorted = Object.entries(colorBuckets)
    .sort((a, b) => b[1] - a[1])
    .slice(0, colorCount);

  return sorted.map(([rgbStr]) => {
    const [r, g, b] = rgbStr.split(',').map(Number);
    const hex = '#' + [r, g, b].map(x => {
      const h = x.toString(16);
      return h.length === 1 ? '0' + h : h;
    }).join('');
    return { r, g, b, hex, rgb: `rgb(${r}, ${g}, ${b})` };
  });
}
