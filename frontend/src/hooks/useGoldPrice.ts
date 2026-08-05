import { useEffect, useRef } from 'react';
import { api } from '../api/endpoints';
import { useStore } from '../store/useStore';

export function useGoldPrice(intervalMs = 15000) {
  const setGoldPrice = useStore((s) => s.setGoldPrice);
  const ref = useRef(false);

  useEffect(() => {
    if (ref.current) return;
    ref.current = true;

    const fetch = async () => {
      try {
        const { data } = await api.goldPrice();
        setGoldPrice(data);
      } catch {}
    };

    fetch();
    const id = setInterval(fetch, intervalMs);
    return () => clearInterval(id);
  }, [intervalMs, setGoldPrice]);
}
