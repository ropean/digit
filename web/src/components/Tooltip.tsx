import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

// Custom replacement for the native `title` attribute tooltip, which on most
// browsers/OSes only appears after a long (~1s+) hover delay and can't be
// themed. Any element with a `data-tip="..."` attribute gets a fast, themed
// tooltip via this single delegated listener — mount <TooltipHost /> once
// near the app root.
const SHOW_DELAY_MS = 60;
const MARGIN = 8;

export function TooltipHost() {
  const [text, setText] = useState<string | null>(null);
  const [pos, setPos] = useState({ top: 0, left: 0, flip: false });
  const targetRef = useRef<Element | null>(null);
  const timerRef = useRef<number | undefined>(undefined);
  const bubbleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const clearTimer = () => {
      if (timerRef.current != null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = undefined;
      }
    };

    const place = (el: Element) => {
      const rect = el.getBoundingClientRect();
      const bubble = bubbleRef.current;
      const bubbleHeight = bubble?.offsetHeight ?? 32;
      const flip = rect.top - bubbleHeight - MARGIN < 0;
      setPos({
        top: flip ? rect.bottom + MARGIN : rect.top - MARGIN,
        left: Math.min(Math.max(rect.left + rect.width / 2, 60), window.innerWidth - 60),
        flip,
      });
    };

    const hide = () => {
      clearTimer();
      targetRef.current = null;
      setText(null);
    };

    const onOver = (e: Event) => {
      const el = (e.target as Element)?.closest?.("[data-tip]");
      if (!el || el === targetRef.current) return;
      const tip = el.getAttribute("data-tip");
      if (!tip) return;
      clearTimer();
      targetRef.current = el;
      timerRef.current = window.setTimeout(() => {
        if (targetRef.current !== el) return;
        place(el);
        setText(tip);
      }, SHOW_DELAY_MS);
    };

    const onOut = (e: Event) => {
      const el = (e.target as Element)?.closest?.("[data-tip]");
      if (!el || el !== targetRef.current) return;
      const related = (e as MouseEvent).relatedTarget as Node | null;
      if (related && el.contains(related)) return;
      hide();
    };

    const onScroll = () => hide();

    document.addEventListener("mouseover", onOver);
    document.addEventListener("mouseout", onOut);
    document.addEventListener("focusin", onOver);
    document.addEventListener("focusout", onOut);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", hide);
    return () => {
      document.removeEventListener("mouseover", onOver);
      document.removeEventListener("mouseout", onOut);
      document.removeEventListener("focusin", onOver);
      document.removeEventListener("focusout", onOut);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", hide);
      clearTimer();
    };
  }, []);

  useEffect(() => {
    if (text != null && targetRef.current) {
      // Re-measure once the bubble has real content/size.
      const rect = targetRef.current.getBoundingClientRect();
      const bubbleHeight = bubbleRef.current?.offsetHeight ?? 32;
      const flip = rect.top - bubbleHeight - MARGIN < 0;
      setPos({
        top: flip ? rect.bottom + MARGIN : rect.top - MARGIN,
        left: Math.min(Math.max(rect.left + rect.width / 2, 60), window.innerWidth - 60),
        flip,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  return createPortal(
    <div
      ref={bubbleRef}
      className="tooltip-bubble"
      style={{
        top: pos.top,
        left: pos.left,
        transform: `translate(-50%, ${pos.flip ? "0" : "-100%"})`,
        opacity: text ? 1 : 0,
        visibility: text ? "visible" : "hidden",
      }}
    >
      {text}
    </div>,
    document.body,
  );
}
