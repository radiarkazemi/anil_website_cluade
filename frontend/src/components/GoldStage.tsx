import { useRef, useState } from 'react';

/** Interactive spinning gold ring — drag / tilt with pointer. */
export function GoldStage({ mouseX = 0, mouseY = 0 }: { mouseX?: number; mouseY?: number }) {
  const [rx, setRx] = useState(-18);
  const [ry, setRy] = useState(18);
  const dragging = useRef(false);
  const start = useRef({ x: 0, y: 0, rx: 0, ry: 0 });

  const tiltX = rx + mouseY * -12;
  const tiltY = ry + mouseX * 18;

  const onDown = (e: React.PointerEvent) => {
    dragging.current = true;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    start.current = { x: e.clientX, y: e.clientY, rx, ry };
  };

  const onMove = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    setRy(start.current.ry + (e.clientX - start.current.x) * 0.55);
    setRx(Math.max(-55, Math.min(55, start.current.rx - (e.clientY - start.current.y) * 0.45)));
  };

  const onUp = () => {
    dragging.current = false;
  };

  return (
    <div className="gold-stage">
      <div className="gold-stage-aura" />
      <div className="gold-stage-ring-orbit" />
      <div
        className="gold-stage-scene"
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        style={{ transform: `rotateX(${tiltX}deg) rotateY(${tiltY}deg)` }}
      >
        <div className="gold-ring outer" />
        <div className="gold-ring mid" />
        <div className="gold-ring inner" />
        <div className="gold-ring gem" />
      </div>
      <p className="gold-stage-hint">بکشید · بچرخانید</p>
    </div>
  );
}
