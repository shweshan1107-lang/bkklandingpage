import React, { useEffect, useState } from 'react';

// Fit visible artwork without modifying the original uploaded file.
const boxes = new Map();
function visibleBox(image) {
  const { naturalWidth: width, naturalHeight: height } = image;
  const full = [0, 0, width, height];
  try {
    const scale = Math.min(1, 768 / Math.max(width, height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(width * scale);
    canvas.height = Math.ceil(height * scale);
    const context = canvas.getContext('2d', { willReadFrequently: true });
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
    let left = canvas.width, top = canvas.height, right = -1, bottom = -1;
    for (let y = 0; y < canvas.height; y++) {
      for (let x = 0; x < canvas.width; x++) {
        if (data[(y * canvas.width + x) * 4 + 3] > 8) {
          left = Math.min(left, x); top = Math.min(top, y);
          right = Math.max(right, x); bottom = Math.max(bottom, y);
        }
      }
    }
    if (right < left) return full;
    return [left * width / canvas.width, top * height / canvas.height,
      (right - left + 1) * width / canvas.width, (bottom - top + 1) * height / canvas.height];
  } catch { return full; } // External images may disallow pixel reads.
}

export default function LandingImage({ src, alt = '', className = '', fallback = null }) {
  const [result, setResult] = useState(null);
  useEffect(() => {
    let cancelled = false;
    if (!src) return;
    if (boxes.has(src)) { setResult(boxes.get(src)); return; }
    const image = new Image();
    image.onload = () => {
      const next = { src, width: image.naturalWidth, height: image.naturalHeight, box: visibleBox(image) };
      boxes.set(src, next);
      if (!cancelled) setResult(next);
    };
    image.onerror = () => { if (!cancelled) setResult({ src, failed: true }); };
    image.src = src;
    return () => { cancelled = true; image.onload = null; image.onerror = null; };
  }, [src]);
  if (!src || (result?.src === src && result.failed)) return fallback;
  if (result?.src !== src) return null;
  return <svg className={className} viewBox={result.box.join(' ')} preserveAspectRatio="xMidYMid meet"
    role={alt ? 'img' : undefined} aria-label={alt || undefined} aria-hidden={alt ? undefined : true}>
    <image href={src} width={result.width} height={result.height} />
  </svg>;
}
