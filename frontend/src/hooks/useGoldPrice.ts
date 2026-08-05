import { useEffect, useRef } from 'react';
import { api } from '../api/endpoints';
import { useStore } from '../store/useStore';
import type { GoldPrice } from '../types';

function goldWsUrl(): string {
  const env = import.meta.env.VITE_WS_URL as string | undefined;
  if (env) return env;
  // Prefer same-origin (Vite proxies /ws → backend) when running the storefront.
  if (typeof window !== 'undefined' && window.location?.host) {
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${proto}//${window.location.host}/ws/gold/`;
  }
  return 'ws://127.0.0.1:8000/ws/gold/';
}

export function useGoldPrice(intervalMs = 30000) {
  const setGoldPrice = useStore((s) => s.setGoldPrice);
  const wsRef = useRef<WebSocket | null>(null);
  const pollRef = useRef<number | null>(null);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;

    const apply = (data: GoldPrice) => {
      if (data?.price_18k_per_gram) setGoldPrice(data);
    };

    const pollOnce = async () => {
      try {
        const { data } = await api.goldPrice();
        apply(data);
      } catch {
        /* ignore */
      }
    };

    const startPoll = () => {
      if (pollRef.current != null) return;
      void pollOnce();
      pollRef.current = window.setInterval(() => void pollOnce(), intervalMs);
    };

    const stopPoll = () => {
      if (pollRef.current != null) {
        window.clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };

    let retry = 0;
    let retryTimer: number | null = null;

    const connectWs = () => {
      if (!alive.current) return;
      try {
        const ws = new WebSocket(goldWsUrl());
        wsRef.current = ws;

        ws.onopen = () => {
          retry = 0;
          stopPoll();
        };

        ws.onmessage = (ev) => {
          try {
            const msg = JSON.parse(ev.data);
            if (msg?.type === 'gold.price' && msg.data) apply(msg.data as GoldPrice);
          } catch {
            /* ignore */
          }
        };

        ws.onerror = () => {
          /* onclose handles fallback */
        };

        ws.onclose = () => {
          wsRef.current = null;
          startPoll();
          const delay = Math.min(15000, 1000 * 2 ** retry);
          retry += 1;
          retryTimer = window.setTimeout(connectWs, delay);
        };
      } catch {
        startPoll();
      }
    };

    connectWs();

    return () => {
      alive.current = false;
      stopPoll();
      if (retryTimer != null) window.clearTimeout(retryTimer);
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [intervalMs, setGoldPrice]);
}
