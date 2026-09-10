/**
 * File Loading & Dropzone Utilities
 */

export function formatBytes(bytes, decimals = 2) {
  if (!bytes || bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export function setupDropzone(dropzoneEl, onFilesReceived, accept = 'image/*') {
  if (!dropzoneEl) return;

  const inputEl = document.createElement('input');
  inputEl.type = 'file';
  inputEl.multiple = true;
  inputEl.accept = accept;
  inputEl.style.display = 'none';
  document.body.appendChild(inputEl);

  const handleClick = (e) => {
    e.stopPropagation();
    inputEl.click();
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    dropzoneEl.classList.add('drag-over');
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    dropzoneEl.classList.remove('drag-over');
  };

  const handleDrop = (e) => {
    e.preventDefault();
    dropzoneEl.classList.remove('drag-over');
    if (e.dataTransfer && e.dataTransfer.files.length > 0) {
      onFilesReceived(Array.from(e.dataTransfer.files));
    }
  };

  const handleInputChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      onFilesReceived(Array.from(e.target.files));
    }
    inputEl.value = '';
  };

  dropzoneEl.addEventListener('click', handleClick);
  dropzoneEl.addEventListener('dragover', handleDragOver);
  dropzoneEl.addEventListener('dragleave', handleDragLeave);
  dropzoneEl.addEventListener('drop', handleDrop);
  inputEl.addEventListener('change', handleInputChange);

  return () => {
    dropzoneEl.removeEventListener('click', handleClick);
    dropzoneEl.removeEventListener('dragover', handleDragOver);
    dropzoneEl.removeEventListener('dragleave', handleDragLeave);
    dropzoneEl.removeEventListener('drop', handleDrop);
    inputEl.removeEventListener('change', handleInputChange);
    inputEl.remove();
  };
}

export function loadImageFromFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        resolve({
          file,
          name: file.name,
          baseName: file.name.replace(/\.[^/.]+$/, ""),
          type: file.type || 'image/jpeg',
          size: file.size,
          formattedSize: formatBytes(file.size),
          width: img.naturalWidth || img.width,
          height: img.naturalHeight || img.height,
          aspectRatio: (img.naturalWidth || img.width) / (img.naturalHeight || img.height),
          dataUrl: e.target.result,
          imgElement: img
        });
      };
      img.onerror = () => reject(new Error(`Failed to decode image: ${file.name}`));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error(`Failed to read file: ${file.name}`));
    reader.readAsDataURL(file);
  });
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
}
