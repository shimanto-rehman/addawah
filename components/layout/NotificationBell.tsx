'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { NotificationPanel } from '@/components/notifications/NotificationPanel';
import { useNotifications } from '@/components/notifications/useNotifications';

const PANEL_WIDTH = 380;
const PANEL_GAP = 10;
const VIEWPORT_PAD = 12;

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [panelStyle, setPanelStyle] = useState<React.CSSProperties>({});
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const { data } = useNotifications(60_000);
  const unreadCount = data?.unreadCount ?? 0;

  useEffect(() => setMounted(true), []);

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current;
    const panel = panelRef.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const panelHeight = panel?.offsetHeight ?? 420;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const width = Math.min(PANEL_WIDTH, vw - VIEWPORT_PAD * 2);

    let left = rect.right - width;
    left = Math.max(VIEWPORT_PAD, Math.min(left, vw - width - VIEWPORT_PAD));

    let top = rect.bottom + PANEL_GAP;
    if (top + panelHeight > vh - VIEWPORT_PAD) {
      top = rect.top - panelHeight - PANEL_GAP;
    }
    top = Math.max(VIEWPORT_PAD, Math.min(top, vh - panelHeight - VIEWPORT_PAD));

    setPanelStyle({
      position: 'fixed',
      top,
      left,
      width,
      right: 'auto',
    });
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
    const frame = requestAnimationFrame(updatePosition);
    const ro = panelRef.current ? new ResizeObserver(updatePosition) : null;
    if (panelRef.current) ro?.observe(panelRef.current);

    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      cancelAnimationFrame(frame);
      ro?.disconnect();
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [open, updatePosition]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const panel = (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={panelRef}
          className="dawa-notif-bell__panel dawa-notif-bell__panel--portal"
          style={panelStyle}
          initial={{ opacity: 0, y: -8, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.98 }}
          transition={{ duration: 0.18 }}
          role="dialog"
          aria-label="Notifications"
        >
          <NotificationPanel variant="dropdown" onClose={() => setOpen(false)} />
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <div className="dawa-notif-bell">
      <button
        ref={triggerRef}
        type="button"
        className={`dawa-notif-bell__trigger${open ? ' is-open' : ''}`}
        onClick={() => setOpen((v) => !v)}
        aria-label={unreadCount > 0 ? `${unreadCount} unread notifications` : 'Notifications'}
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2c0 .5-.2 1-.6 1.4L4 17h5" />
          <path d="M10 20a2 2 0 0 0 4 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="dawa-notif-bell__badge" aria-hidden>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>
      {mounted && createPortal(panel, document.body)}
    </div>
  );
}
