// Resize locally so the original full-size image never needs to be uploaded.
export async function prepareThumbnail(file: File) {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 20 * 1024 * 1024)
    throw new Error('Chỉ nhận JPG, PNG hoặc WebP tối đa 20 MB.');
  const source = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = source;
    await image.decode().catch(() => { throw new Error('Không đọc được ảnh. Vui lòng chọn ảnh khác.'); });
    const scale = Math.min(1, 1280 / image.naturalWidth, 720 / image.naturalHeight);
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Trình duyệt không hỗ trợ xử lý ảnh.');
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const encode = (quality: number) => new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('Không thể nén ảnh.')), 'image/webp', quality);
    });
    let blob = await encode(0.82);
    for (const quality of [0.7, 0.58, 0.46]) {
      if (blob.size <= 200 * 1024) break;
      blob = await encode(quality);
    }
    // Retain a small original if re-encoding would increase its size.
    const result = scale === 1 && file.size < blob.size ? file : blob;
    const extension = result.type === 'image/webp' ? 'webp' : result.type === 'image/png' ? 'png' : 'jpg';
    return { file: new File([result], `thumbnail.${extension}`, { type: result.type }), width: canvas.width, height: canvas.height };
  } finally {
    URL.revokeObjectURL(source);
  }
}
