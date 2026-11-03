import { useCallback, useEffect, useRef, useState } from "react";
import { api, errMsg } from "./api";

/** GET so'rov uchun oddiy hook: data / loading / error / reload */
export function useApi<T>(path: string | null, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(!!path);
  const [error, setError] = useState<string | null>(null);
  const reload = useCallback(async () => {
    if (!path) return;
    setLoading(true);
    setError(null);
    try {
      setData(await api<T>(path));
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, ...deps]);
  useEffect(() => { reload(); }, [reload]);
  return { data, setData, loading, error, reload };
}

/** Sahifa ochiq va faol bo'lsa har daqiqada o'qish vaqtini yozib boradi */
export function useStudyHeartbeat(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    let last = Date.now();
    const onAct = () => { last = Date.now(); };
    window.addEventListener("pointerdown", onAct);
    window.addEventListener("keydown", onAct);
    const t = setInterval(() => {
      if (document.visibilityState === "visible" && Date.now() - last < 3 * 60_000) {
        api("/api/statistics/activity", { body: { minutes: 1 } }).catch(() => {});
      }
    }, 60_000);
    return () => {
      clearInterval(t);
      window.removeEventListener("pointerdown", onAct);
      window.removeEventListener("keydown", onAct);
    };
  }, [enabled]);
}

export function useCountdown(seconds: number | null, onEnd?: () => void) {
  const [left, setLeft] = useState(seconds);
  const cb = useRef(onEnd);
  cb.current = onEnd;
  useEffect(() => setLeft(seconds), [seconds]);
  useEffect(() => {
    if (left === null) return;
    if (left <= 0) { cb.current?.(); return; }
    const t = setTimeout(() => setLeft((l) => (l === null ? null : l - 1)), 1000);
    return () => clearTimeout(t);
  }, [left]);
  return left;
}

export const fmtTime = (s: number) => {
  const m = Math.floor(Math.max(0, s) / 60);
  const ss = Math.max(0, s) % 60;
  return `${String(m).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
};

export const wordCount = (t: string) => (t.match(/[A-Za-z0-9'’-]+/g) || []).length;
