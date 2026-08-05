import { create } from 'zustand';

interface ToastState {
  message: string;
  show: (msg: string) => void;
  hide: () => void;
}

export const useToast = create<ToastState>((set) => ({
  message: '',
  show: (msg) => {
    set({ message: msg });
    setTimeout(() => set({ message: '' }), 2500);
  },
  hide: () => set({ message: '' }),
}));
