/**
 * JSZip Export Utility for Bulk Downloads
 */
import { downloadBlob } from './file-loader.js';
import { Toast } from './toast.js';

export async function exportFilesAsZip(fileEntries, zipFilename = 'omni_images.zip', onProgress = null) {
  if (!window.JSZip) {
    Toast.error('JSZip library not found');
    throw new Error('JSZip not loaded');
  }

  const zip = new window.JSZip();
  let count = 0;

  for (const entry of fileEntries) {
    // entry can have { name, blob } or { name, dataUrl }
    if (entry.blob) {
      zip.file(entry.name, entry.blob);
    } else if (entry.dataUrl) {
      const base64Data = entry.dataUrl.split(',')[1];
      zip.file(entry.name, base64Data, { base64: true });
    }
    count++;
    if (onProgress) onProgress((count / fileEntries.length) * 50);
  }

  const content = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 }
  }, (metadata) => {
    if (onProgress) {
      onProgress(50 + (metadata.percent / 2));
    }
  });

  downloadBlob(content, zipFilename);
  Toast.success(`Downloaded ${fileEntries.length} images in ${zipFilename}`);
}
