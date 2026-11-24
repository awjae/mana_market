import { create } from 'zustand';

/** 지금 열려 있는 활동 미니게임·던전 화면(저장하지 않는다) */
export type Open = null | ({ kind: 'fish' } | { kind: 'gather'; spot: number } | { kind: 'dive' } | { kind: 'love' } | { kind: 'codex' }) & { n: number };
let seq = 0;
export const useActivity = create<{ open: Open; openIt: (o: { kind: 'fish' } | { kind: 'gather'; spot: number } | { kind: 'dive' } | { kind: 'love' } | { kind: 'codex' }) => void; close: () => void }>((set) => ({
  open: null, openIt: (o) => set({ open: { ...o, n: ++seq } }), close: () => set({ open: null }),
}));
/** 쉬운 모드: 판정 구간이 넓다(미니게임용, 프로필 스위치) */
const KEY = 'mana-easy';
export const easyOn = () => { try { return localStorage.getItem(KEY) === '1'; } catch { return false; } };
export const setEasy = (on: boolean) => { try { localStorage.setItem(KEY, on ? '1' : '0'); } catch { /* 저장 못 해도 이번 접속엔 적용 */ } };
