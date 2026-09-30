import { useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';

type Props = {
  file: File;
  aspect?: number;
  onCancel: () => void;
  onDone: (file: File) => void;
};

/** Simple 16:9 cover cropper — pan + zoom, then export WebP/JPEG. */
export function CoverCropper({ file, aspect = 16 / 9, onCancel, onDone }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [ready, setReady] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      setReady(true);
      setZoom(1);
      setOffset({ x: 0, y: 0 });
    };
    img.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    if (!ready) return;
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, W, H);

    const base = Math.max(W / img.naturalWidth, H / img.naturalHeight);
    const scale = base * zoom;
    const dw = img.naturalWidth * scale;
    const dh = img.naturalHeight * scale;
    const dx = (W - dw) / 2 + offset.x;
    const dy = (H - dh) / 2 + offset.y;
    ctx.drawImage(img, dx, dy, dw, dh);

    // dim outside? frame is the canvas itself (exact crop)
    ctx.strokeStyle = 'rgba(212,175,55,.85)';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, W - 2, H - 2);
  }, [ready, zoom, offset, aspect]);

  const onPointerDown = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
  };
  const onPointerMove = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!drag.current) return;
    setOffset({
      x: drag.current.ox + (e.clientX - drag.current.x),
      y: drag.current.oy + (e.clientY - drag.current.y),
    });
  };
  const onPointerUp = () => {
    drag.current = null;
  };

  const exportCrop = async () => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;

    const out = document.createElement('canvas');
    out.width = 1600;
    out.height = Math.round(1600 / aspect);
    const ctx = out.getContext('2d');
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    const base = Math.max(W / img.naturalWidth, H / img.naturalHeight);
    const scale = base * zoom;
    const dw = img.naturalWidth * scale;
    const dh = img.naturalHeight * scale;
    const dx = (W - dw) / 2 + offset.x;
    const dy = (H - dh) / 2 + offset.y;

    // Map preview canvas coords → output
    const sx = (-dx) / scale;
    const sy = (-dy) / scale;
    const sw = W / scale;
    const sh = H / scale;
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, out.width, out.height);

    const blob = await new Promise<Blob | null>((resolve) =>
      out.toBlob(resolve, 'image/jpeg', 0.9),
    );
    if (!blob) return;
    const name = (file.name || 'cover').replace(/\.[^.]+$/, '') + '-cover.jpg';
    onDone(new File([blob], name, { type: 'image/jpeg' }));
  };

  return (
    <div className="cover-crop-overlay" role="dialog" aria-modal="true" aria-label="برش تصویر کاور">
      <div className="cover-crop-modal">
        <div className="cover-crop-head">
          <strong>برش تصویر کاور (۱۶:۹)</strong>
          <span>جابه‌جا کنید و زوم را تنظیم کنید</span>
        </div>
        <canvas
          ref={canvasRef}
          width={640}
          height={Math.round(640 / aspect)}
          className="cover-crop-canvas"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
        />
        <label className="cover-crop-zoom">
          <span>زوم</span>
          <input
            type="range"
            min={1}
            max={3}
            step={0.01}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
          />
        </label>
        <div className="cover-crop-actions">
          <button type="button" className="outline-btn" onClick={onCancel}>انصراف</button>
          <button type="button" className="gold-btn" disabled={!ready} onClick={() => void exportCrop()}>
            اعمال برش
          </button>
        </div>
      </div>
    </div>
  );
}
