"use client";

import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";

export function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

const easeOut = (p: number) => 1 - Math.pow(1 - p, 3);

/** Tweens a number towards `target`. Starts at the target (no SSR mismatch); instant under reduced motion. */
export function useAnimatedNumber(target: number, duration = 450): number {
  const [value, setValue] = useState(target);
  const current = useRef(target);
  useEffect(() => {
    let raf = 0;
    const from = current.current;
    if (!Number.isFinite(target) || !Number.isFinite(from) || from === target) {
      raf = requestAnimationFrame(() => {
        current.current = target;
        setValue(target);
      });
      return () => cancelAnimationFrame(raf);
    }
    const reduce = prefersReducedMotion();
    const start = performance.now();
    const step = (t: number) => {
      const p = reduce ? 1 : Math.min(1, (t - start) / duration);
      const v = from + (target - from) * easeOut(p);
      current.current = v;
      setValue(p >= 1 ? target : v);
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return value;
}

/**
 * FLIP: after every render, rows marked with data-flip-id glide from their previous position
 * to the new one (~250ms ease-out). When `flash.key` changes, rows in `flash.ids` get a soft
 * amber highlight that fades. Disabled under reduced motion.
 */
export function useFlipRows(
  containerRef: RefObject<HTMLElement | null>,
  flash: { key: number; ids: ReadonlySet<string> },
) {
  const positions = useRef(new Map<string, number>());
  const lastFlashKey = useRef(flash.key);

  useLayoutEffect(() => {
    const root = containerRef.current;
    if (!root) return;
    const reduce = prefersReducedMotion();
    const rootTop = root.getBoundingClientRect().top;
    const next = new Map<string, number>();
    const flashNow = flash.key !== lastFlashKey.current;
    lastFlashKey.current = flash.key;

    root.querySelectorAll<HTMLElement>("[data-flip-id]").forEach((el) => {
      const rect = el.getBoundingClientRect();
      if (rect.height === 0) return; // hidden at this breakpoint
      const id = el.dataset.flipId as string;
      const top = rect.top - rootTop;
      next.set(id, top);
      const prev = positions.current.get(id);
      if (!reduce && prev !== undefined && Math.abs(prev - top) > 1) {
        el.animate([{ transform: `translateY(${prev - top}px)` }, { transform: "translateY(0)" }], {
          duration: 250,
          easing: "cubic-bezier(0.2, 0.8, 0.2, 1)",
        });
      }
      if (flashNow && flash.ids.has(id)) {
        el.animate([{ backgroundColor: "#fbf1dc" }, { backgroundColor: "#fbf1dc", offset: 0.4 }, { backgroundColor: "rgba(251,241,220,0)" }], {
          duration: reduce ? 1 : 3200,
          easing: "ease-out",
        });
      }
    });
    positions.current = next;
  });
}

/** Keeps Tab focus inside `ref` while active and returns focus to the opener on close. */
export function useFocusTrap(ref: RefObject<HTMLElement | null>, active: boolean, onEscape: () => void) {
  const onEscapeRef = useRef(onEscape);
  useEffect(() => {
    onEscapeRef.current = onEscape;
  }, [onEscape]);

  useEffect(() => {
    if (!active) return;
    const opener = document.activeElement as HTMLElement | null;
    const node = ref.current;
    const focusables = () =>
      Array.from(
        node?.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])') ?? [],
      ).filter((el) => !el.hasAttribute("disabled"));
    focusables()[0]?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onEscapeRef.current();
        return;
      }
      if (e.key !== "Tab") return;
      const els = focusables();
      if (els.length === 0) return;
      const first = els[0];
      const last = els[els.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      opener?.focus?.();
    };
  }, [active, ref]);
}
