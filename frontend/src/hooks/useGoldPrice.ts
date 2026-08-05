import { useEffect } from 'react';
import { api } from '../api/endpoints';
import { useStore } from '../store/useStore';
import type { GoldPrice } from '../types';

type Listener = (data: GoldPrice) => void;

function goldWsUrl(): string {
  const env = import.meta.env.VITE_WS_URL as string | undefined;
  if (env) return env;
  // Connect straight to the Django/Daphne host — avoid Vite WS proxy
  // (ECONNABORTED is common with Tun/VPN + http-proxy on Windows).
  const apiBase = (import.meta.env.VITE_API_URL as string | undefined) || 'http://127.0.0.1:8000/api/v1';
  try {
    const u = new URL(apiBase);
    const proto = u.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${proto}//${u.host}/ws/gold/`;
  } catch {
    return 'ws://127.0.0.1:8000/ws/gold/';
  }
}

/** Module singleton — survives React StrictMode double-mount. */
const feed = {
  listeners: new Set<Listener>(),
  ws: null as WebSocket | null,
  pollId: null as number | null,
  retryId: null as number | null,
  retry: 0,
  intentionalClose: false,
};

function emit(data: GoldPrice) {
  if (!data?.price_18k_per_gram) return;
  for (const fn of feed.listeners) fn(data);
}

async function pollOnce() {
  try {
    const { data } = await api.goldPrice();
    emit(data);
  } catch {
    /* ignore */
  }
}

function startPoll(intervalMs: number) {
  if (feed.pollId != null) return;
  void pollOnce();
  feed.pollId = window.setInterval(() => void pollOnce(), intervalMs);
}

function stopPoll() {
  if (feed.pollId != null) {
    window.clearInterval(feed.pollId);
    feed.pollId = null;
  }
}

function scheduleReconnect(intervalMs: number) {
  if (feed.retryId != null || feed.listeners.size === 0) return;
  const delay = Math.min(20000, 1500 * 2 ** Math.min(feed.retry, 4));
  feed.retry += 1;
  feed.retryId = window.setTimeout(() => {
    feed.retryId = null;
    connect(intervalMs);
  }, delay);
}

function connect(intervalMs: number) {
  if (feed.listeners.size === 0) return;
  if (feed.ws && (feed.ws.readyState === WebSocket.OPEN || feed.ws.readyState === WebSocket.CONNECTING)) {
    return;
  }

  feed.intentionalClose = false;
  try {
    const ws = new WebSocket(goldWsUrl());
    feed.ws = ws;

    ws.onopen = () => {
      feed.retry = 0;
      stopPoll();
    };

    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        if (msg?.type === 'gold.price' && msg.data) emit(msg.data as GoldPrice);
      } catch {
        /* ignore */
      }
    };

    ws.onclose = () => {
      if (feed.ws === ws) feed.ws = null;
      if (feed.intentionalClose || feed.listeners.size === 0) return;
      startPoll(intervalMs);
      scheduleReconnect(intervalMs);
    };
  } catch {
    startPoll(intervalMs);
    scheduleReconnect(intervalMs);
  }
}

function disconnectIfIdle() {
  if (feed.listeners.size > 0) return;
  feed.intentionalClose = true;
  if (feed.retryId != null) {
    window.clearTimeout(feed.retryId);
    feed.retryId = null;
  }
  stopPoll();
  const ws = feed.ws;
  feed.ws = null;
  if (ws && ws.readyState < WebSocket.CLOSING) ws.close();
}

/**
 * Subscribe to live Faraz gold quotes (WebSocket → REST fallback).
 * Shared across all mounted components.
 */
export function useGoldPrice(intervalMs = 30000) {
  const setGoldPrice = useStore((s) => s.setGoldPrice);

  useEffect(() => {
    const listener: Listener = (data) => setGoldPrice(data);
    feed.listeners.add(listener);
    // Seed immediately via REST, then open a single shared socket.
    void pollOnce();
    connect(intervalMs);

    return () => {
      feed.listeners.delete(listener);
      disconnectIfIdle();
    };
  }, [intervalMs, setGoldPrice]);
}
