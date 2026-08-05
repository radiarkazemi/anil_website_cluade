import { useEffect, useRef, useState, type RefObject } from 'react';

/** Toggle `.in` when element enters the viewport. */
export function useInView<T extends HTMLElement>(
  margin = '0px 0px -12% 0px',
): [RefObject<T | null>, boolean] {
  const ref = useRef<T | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      { rootMargin: margin, threshold: 0.12 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [margin]);

  return [ref, visible];
}

/** Normalized mouse position relative to an element (-0.5 … 0.5). */
export function usePointerParallax<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      setPos({
        x: (e.clientX - r.left) / r.width - 0.5,
        y: (e.clientY - r.top) / r.height - 0.5,
      });
    };
    const onLeave = () => setPos({ x: 0, y: 0 });

    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerleave', onLeave);
    return () => {
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerleave', onLeave);
    };
  }, []);

  return [ref, pos] as const;
}
