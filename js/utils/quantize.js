/**
 * Color Quantization & Dithering Helper (TinyPNG Style PNG-8 Quantization)
 */

export function quantizeCanvas(canvas, maxColors = 256, dither = true) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;

  // 1. Sample pixels to build color palette (Median-Cut / Popularity sampling)
  const colorMap = new Map();
  const step = Math.max(1, Math.floor(data.length / (4 * 15000))); // sample up to 15,000 pixels

  for (let i = 0; i < data.length; i += step * 4) {
    if (data[i + 3] < 32) continue; // transparent
    // 5-bit quantization for fast palette building
    const r = data[i] >> 3;
    const g = data[i + 1] >> 3;
    const b = data[i + 2] >> 3;
    const key = (r << 10) | (g << 5) | b;
    colorMap.set(key, (colorMap.get(key) || 0) + 1);
  }

  // Sort by popularity and select top palette entries
  const sortedKeys = Array.from(colorMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxColors)
    .map(entry => entry[0]);

  if (sortedKeys.length === 0) return canvas;

  const palette = sortedKeys.map(k => [
    ((k >> 10) & 31) << 3,
    ((k >> 5) & 31) << 3,
    (k & 31) << 3
  ]);

  // Fast nearest color lookup helper
  const findNearest = (r, g, b) => {
    let minDist = Infinity;
    let best = palette[0];
    for (let i = 0; i < palette.length; i++) {
      const p = palette[i];
      const dr = r - p[0];
      const dg = g - p[1];
      const db = b - p[2];
      // Weighted perceptual color distance
      const dist = dr * dr * 0.299 + dg * dg * 0.587 + db * db * 0.114;
      if (dist < minDist) {
        minDist = dist;
        best = p;
        if (dist === 0) break;
      }
    }
    return best;
  };

  // 2. Map pixels & apply Floyd-Steinberg error diffusion dithering
  if (dither) {
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = (y * w + x) * 4;
        if (data[idx + 3] < 32) continue; // leave transparent

        const oldR = data[idx];
        const oldG = data[idx + 1];
        const oldB = data[idx + 2];

        const nearest = findNearest(oldR, oldG, oldB);

        data[idx] = nearest[0];
        data[idx + 1] = nearest[1];
        data[idx + 2] = nearest[2];

        const errR = (oldR - nearest[0]) * 0.5; // slight dampening for cleaner compression
        const errG = (oldG - nearest[1]) * 0.5;
        const errB = (oldB - nearest[2]) * 0.5;

        // Distribute error
        if (x + 1 < w) {
          const rightIdx = (y * w + (x + 1)) * 4;
          data[rightIdx] = Math.min(255, Math.max(0, data[rightIdx] + (errR * 7) / 16));
          data[rightIdx + 1] = Math.min(255, Math.max(0, data[rightIdx + 1] + (errG * 7) / 16));
          data[rightIdx + 2] = Math.min(255, Math.max(0, data[rightIdx + 2] + (errB * 7) / 16));
        }
        if (y + 1 < h) {
          if (x > 0) {
            const blIdx = ((y + 1) * w + (x - 1)) * 4;
            data[blIdx] = Math.min(255, Math.max(0, data[blIdx] + (errR * 3) / 16));
            data[blIdx + 1] = Math.min(255, Math.max(0, data[blIdx + 1] + (errG * 3) / 16));
            data[blIdx + 2] = Math.min(255, Math.max(0, data[blIdx + 2] + (errB * 3) / 16));
          }
          const bIdx = ((y + 1) * w + x) * 4;
          data[bIdx] = Math.min(255, Math.max(0, data[bIdx] + (errR * 5) / 16));
          data[bIdx + 1] = Math.min(255, Math.max(0, data[bIdx + 1] + (errG * 5) / 16));
          data[bIdx + 2] = Math.min(255, Math.max(0, data[bIdx + 2] + (errB * 5) / 16));

          if (x + 1 < w) {
            const brIdx = ((y + 1) * w + (x + 1)) * 4;
            data[brIdx] = Math.min(255, Math.max(0, data[brIdx] + (errR * 1) / 16));
            data[brIdx + 1] = Math.min(255, Math.max(0, data[brIdx + 1] + (errG * 1) / 16));
            data[brIdx + 2] = Math.min(255, Math.max(0, data[brIdx + 2] + (errB * 1) / 16));
          }
        }
      }
    }
  } else {
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] < 32) continue;
      const nearest = findNearest(data[i], data[i + 1], data[i + 2]);
      data[i] = nearest[0];
      data[i + 1] = nearest[1];
      data[i + 2] = nearest[2];
    }
  }

  ctx.putImageData(imgData, 0, 0);
  return canvas;
}
