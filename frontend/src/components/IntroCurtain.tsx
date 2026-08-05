import { useEffect, useState } from 'react';

/** One-shot cinematic intro curtain before the homepage. */
export function IntroCurtain({ onDone }: { onDone: () => void }) {
  const [phase, setPhase] = useState<'in' | 'hold' | 'out'>('in');

  useEffect(() => {
    const t1 = window.setTimeout(() => setPhase('hold'), 900);
    const t2 = window.setTimeout(() => setPhase('out'), 2100);
    const t3 = window.setTimeout(onDone, 2900);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [onDone]);

  return (
    <div className={`intro-curtain phase-${phase}`} aria-hidden>
      <div className="intro-line" />
      <div className="intro-brand">
        {'ANIL'.split('').map((ch, i) => (
          <span key={i} style={{ animationDelay: `${0.35 + i * 0.12}s` }}>{ch}</span>
        ))}
      </div>
      <div className="intro-sub">GOLD &amp; JEWELRY</div>
    </div>
  );
}
