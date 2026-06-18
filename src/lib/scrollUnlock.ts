export function installScrollUnlock(): () => void {
  if (typeof window === "undefined") return () => {};

  const readScrollY = () => window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0;
  const maxScrollY = () => Math.max(0, document.documentElement.scrollHeight - window.innerHeight);

  const hasScrollableParent = (target: EventTarget | null, deltaY: number) => {
    let node = target instanceof Element ? target : null;
    while (node && node !== document.body && node !== document.documentElement) {
      const style = window.getComputedStyle(node);
      const canScroll = /(auto|scroll)/.test(style.overflowY) && node.scrollHeight > node.clientHeight + 1;
      if (canScroll) {
        const atTop = node.scrollTop <= 0;
        const atBottom = node.scrollTop + node.clientHeight >= node.scrollHeight - 1;
        return deltaY < 0 ? !atTop : !atBottom;
      }
      node = node.parentElement;
    }
    return false;
  };

  const onWheel = (event: WheelEvent) => {
    if (event.defaultPrevented || event.deltaY === 0 || hasScrollableParent(event.target, event.deltaY)) return;
    const before = readScrollY();
    requestAnimationFrame(() => {
      const after = readScrollY();
      if (Math.abs(after - before) > 1) return;
      if ((event.deltaY < 0 && after <= 0) || (event.deltaY > 0 && after >= maxScrollY() - 1)) return;
      window.scrollBy({ top: event.deltaY, behavior: "auto" });
    });
  };

  let lastTouchY = 0;
  const onTouchStart = (event: TouchEvent) => {
    lastTouchY = event.touches[0]?.clientY ?? 0;
  };

  const onTouchMove = (event: TouchEvent) => {
    const touchY = event.touches[0]?.clientY ?? lastTouchY;
    const deltaY = lastTouchY - touchY;
    lastTouchY = touchY;
    if (Math.abs(deltaY) < 2 || event.defaultPrevented || hasScrollableParent(event.target, deltaY)) return;
    const before = readScrollY();
    requestAnimationFrame(() => {
      if (Math.abs(readScrollY() - before) > 1) return;
      window.scrollBy({ top: deltaY, behavior: "auto" });
    });
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return;
    const tag = event.target instanceof HTMLElement ? event.target.tagName : "";
    if (/INPUT|TEXTAREA|SELECT/.test(tag)) return;
    const amount = event.key === "PageDown" ? window.innerHeight * 0.85 : event.key === "PageUp" ? -window.innerHeight * 0.85 : 0;
    if (amount === 0) return;
    requestAnimationFrame(() => window.scrollBy({ top: amount, behavior: "auto" }));
  };

  window.addEventListener("wheel", onWheel, { capture: true, passive: true });
  window.addEventListener("touchstart", onTouchStart, { capture: true, passive: true });
  window.addEventListener("touchmove", onTouchMove, { capture: true, passive: true });
  window.addEventListener("keydown", onKeyDown, { capture: true });
  return () => {
    window.removeEventListener("wheel", onWheel, { capture: true });
    window.removeEventListener("touchstart", onTouchStart, { capture: true });
    window.removeEventListener("touchmove", onTouchMove, { capture: true });
    window.removeEventListener("keydown", onKeyDown, { capture: true });
  };
}