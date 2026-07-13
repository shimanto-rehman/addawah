'use client';

import Link from 'next/link';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { UserAvatar } from '@/components/profile/UserAvatar';
import { useApp } from '@/components/providers/AppProvider';
import type { SessionUser } from '@/lib/auth';

const PANEL_WIDTH = 220;
const PANEL_GAP = 10;
const VIEWPORT_PAD = 12;

type MenuItem =
  | { type: 'link'; href: string; label: string; icon: 'profile' | 'settings' | 'analytics' | 'notifications' | 'truth'; mobileOnly?: boolean }
  | { type: 'action'; label: string; icon: 'logout'; onClick: () => void };

function MenuIcon({ name }: { name: MenuItem['icon'] }) {
  const props = {
    width: 16,
    height: 16,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.75,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  };

  switch (name) {
    case 'profile':
      return (
        <svg {...props}>
          <circle cx="12" cy="8" r="3.5" />
          <path d="M5 20v-1a7 7 0 0 1 14 0v1" />
        </svg>
      );
    case 'settings':
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="3.25" />
          <path d="M12 2v2.25M12 19.75V22M4.22 4.22l1.59 1.59M18.19 18.19l1.59 1.59M2 12h2.25M19.75 12H22M4.22 19.78l1.59-1.59M18.19 5.81l1.59-1.59" />
        </svg>
      );
    case 'analytics':
      return (
        <svg {...props}>
          <path d="M4 20V10" />
          <path d="M10 20V4" />
          <path d="M16 20v-7" />
          <path d="M22 20V8" />
        </svg>
      );
    case 'notifications':
      return (
        <svg {...props}>
          <path d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2c0 .5-.2 1-.6 1.4L4 17h5" />
          <path d="M10 20a2 2 0 0 0 4 0" />
        </svg>
      );
    case 'truth':
      return (
        <svg {...props}>
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
          <path d="M8 7h8M8 11h6" />
        </svg>
      );
    case 'logout':
      return (
        <svg {...props}>
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <path d="M16 17l5-5-5-5" />
          <path d="M21 12H9" />
        </svg>
      );
  }
}

function buildMenuItems(logout: () => Promise<void>): MenuItem[] {
  return [
    { type: 'link', href: '/profile', label: 'Profile', icon: 'profile' },
    { type: 'link', href: '/settings', label: 'Settings', icon: 'settings' },
    { type: 'link', href: '/truth', label: 'Truth', icon: 'truth', mobileOnly: true },
    { type: 'link', href: '/analytics', label: 'Analytics', icon: 'analytics' },
    { type: 'link', href: '/notifications', label: 'Notifications', icon: 'notifications' },
    { type: 'action', label: 'Sign out', icon: 'logout', onClick: () => void logout() },
  ];
}

export function UserMenu({ user }: { user: SessionUser }) {
  const { logout } = useApp();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [panelStyle, setPanelStyle] = useState<React.CSSProperties>({});
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const items = buildMenuItems(logout);

  useEffect(() => setMounted(true), []);

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current;
    const panel = panelRef.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const panelHeight = panel?.offsetHeight ?? 240;
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

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const panel = (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={panelRef}
          className="dawa-user-menu__panel dawa-user-menu__panel--portal"
          style={panelStyle}
          initial={{ opacity: 0, y: -6, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -6, scale: 0.98 }}
          transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
          role="menu"
        >
          <div className="dawa-user-menu__head">
            <p className="dawa-user-menu__name">{user.name}</p>
            <p className="dawa-user-menu__email">{user.email}</p>
          </div>
          <ul className="dawa-user-menu__list">
            {items.map((item) => (
              <li
                key={item.label}
                className={item.type === 'link' && item.mobileOnly ? 'dawa-user-menu__item-wrap--mobile' : undefined}
              >
                {item.type === 'link' ? (
                  <Link
                    href={item.href}
                    className="dawa-user-menu__item"
                    role="menuitem"
                    onClick={() => setOpen(false)}
                  >
                    <span className="dawa-user-menu__item-icon">
                      <MenuIcon name={item.icon} />
                    </span>
                    {item.label}
                  </Link>
                ) : (
                  <button
                    type="button"
                    className="dawa-user-menu__item dawa-user-menu__item--danger"
                    role="menuitem"
                    onClick={() => {
                      setOpen(false);
                      item.onClick();
                    }}
                  >
                    <span className="dawa-user-menu__item-icon">
                      <MenuIcon name={item.icon} />
                    </span>
                    {item.label}
                  </button>
                )}
              </li>
            ))}
          </ul>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <div className="dawa-user-menu">
      <button
        ref={triggerRef}
        type="button"
        className={`dawa-user-menu__trigger${open ? ' is-open' : ''}`}
        onClick={() => setOpen((v) => !v)}
        aria-label="Account menu"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <UserAvatar
          userId={user.id}
          name={user.name}
          avatarColor={user.avatarColor}
          avatarUrl={user.avatarUrl}
          size={36}
        />
      </button>
      {mounted && createPortal(panel, document.body)}
    </div>
  );
}
