'use client';

import { useCallback, useMemo, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { fireCelebrationConfetti } from '@/lib/confetti';
import {
  PRAYER_LABELS,
  PRAYER_ARABIC,
  SUNNAH_SLOTS,
  SUNNAH_UNIT_RAKATS,
  FARD_RAKATS,
  type PrayerName,
  type SalahKind,
} from '@/lib/constants';
import type { SalahCell } from '@/lib/salah-utils';

const HEADER_ID = 'salah-mark-modal-title';

type Update = { kind: SalahKind; unit: number; completed: boolean };

type Props = {
  open: boolean;
  onClose: () => void;
  prayer: PrayerName;
  dateKey: string;
  cell: SalahCell;
  onConfirm: (updates: Update[]) => Promise<void>;
};

export function SalahMarkModal({
  open,
  onClose,
  prayer,
  dateKey,
  cell,
  onConfirm,
}: Props) {
  const slots = SUNNAH_SLOTS[prayer];

  const [sunnahBefore, setSunnahBefore] = useState<boolean[]>(() => []);
  const [sunnahAfter, setSunnahAfter] = useState<boolean[]>(() => []);
  const [fard, setFard] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [busy, setBusy] = useState(false);

  // Sync state when modal opens or cell changes
  useMemo(() => {
    if (open) {
      setSunnahBefore([...cell.sunnahBefore]);
      setSunnahAfter([...cell.sunnahAfter]);
      setFard(cell.fard);
      setInitialized(true);
    } else {
      setInitialized(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, cell.fard, cell.sunnahBefore.length, cell.sunnahAfter.length]);

  const formattedDate = useMemo(() => {
    try {
      const [y, m, d] = dateKey.split('-').map(Number);
      return new Date(y, m - 1, d).toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return dateKey;
    }
  }, [dateKey]);

  const handleConfirm = useCallback(async () => {
    if (busy) return;
    setBusy(true);

    const updates: Update[] = [];

    // Sunnah before
    sunnahBefore.forEach((checked, unit) => {
      const wasDone = cell.sunnahBefore[unit] ?? false;
      if (checked !== wasDone) {
        updates.push({ kind: 'SUNNAH_BEFORE', unit, completed: checked });
      }
    });

    // Sunnah after
    sunnahAfter.forEach((checked, unit) => {
      const wasDone = cell.sunnahAfter[unit] ?? false;
      if (checked !== wasDone) {
        updates.push({ kind: 'SUNNAH_AFTER', unit, completed: checked });
      }
    });

    // Fard
    if (fard !== cell.fard) {
      updates.push({ kind: 'FARD', unit: 0, completed: fard });
    }

    try {
      await onConfirm(updates);
      if (updates.some((u) => u.completed)) {
        fireCelebrationConfetti();
      }
      onClose();
    } catch {
      // Error handled by parent
    } finally {
      setBusy(false);
    }
  }, [busy, sunnahBefore, sunnahAfter, fard, cell, onConfirm, onClose]);

  if (!initialized) return null;

  return (
    <div className="dawa-salah-modal">
      <Modal open={open} onClose={onClose} labelledBy={HEADER_ID}>
        {/* Header */}
        <div className="dawa-salah-modal__header">
          <button
            type="button"
            className="dawa-salah-modal__close"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            aria-label="Close"
          >
            ✕
          </button>
          <div className="dawa-salah-modal__icon">☪</div>
          <h3 className="dawa-salah-modal__prayer-name" id={HEADER_ID}>
            {PRAYER_LABELS[prayer]}
            <span className="dawa-salah-modal__prayer-arabic">
              {PRAYER_ARABIC[prayer]}
            </span>
          </h3>
          <p className="dawa-salah-modal__date">{formattedDate}</p>
        </div>

        {/* Body */}
        <div className="dawa-salah-modal__body">
          {/* Sunnah Before */}
          {slots.before > 0 && (
            <div className="dawa-salah-modal__section">
              <span className="dawa-salah-modal__section-label">
                Sunnah Before
              </span>
              {Array.from({ length: slots.before }, (_, unit) => (
                <label
                  key={`before-${unit}`}
                  className={`dawa-salah-modal__item${sunnahBefore[unit] ? ' dawa-salah-modal__item--checked' : ''}`}
                >
                  <span className="dawa-salah-modal__checkbox">
                    <input
                      type="checkbox"
                      checked={sunnahBefore[unit] ?? false}
                      onChange={() => {
                        setSunnahBefore((prev) => {
                          const next = [...prev];
                          next[unit] = !next[unit];
                          return next;
                        });
                      }}
                    />
                    <span className="dawa-salah-modal__check-visual">✓</span>
                  </span>
                  <span className="dawa-salah-modal__item-text">
                    <span className="dawa-salah-modal__item-label">
                      {SUNNAH_UNIT_RAKATS} Rakats Sunnah
                    </span>
                    <span className="dawa-salah-modal__item-desc">
                      Unit {unit + 1} of {slots.before}
                    </span>
                  </span>
                  <span className="dawa-salah-modal__rakat">
                    {SUNNAH_UNIT_RAKATS}R
                  </span>
                </label>
              ))}
            </div>
          )}

          {/* Fard */}
          <div className="dawa-salah-modal__section">
            <span className="dawa-salah-modal__section-label">
              Fard Prayer
            </span>
            <label
              className={`dawa-salah-modal__item${fard ? ' dawa-salah-modal__item--checked' : ''}`}
            >
              <span className="dawa-salah-modal__checkbox">
                <input
                  type="checkbox"
                  checked={fard}
                  onChange={() => setFard((prev) => !prev)}
                />
                <span className="dawa-salah-modal__check-visual">✓</span>
              </span>
              <span className="dawa-salah-modal__item-text">
                <span className="dawa-salah-modal__item-label">
                  {FARD_RAKATS[prayer]} Rakats Fard
                </span>
                <span className="dawa-salah-modal__item-desc">
                  Obligatory prayer
                </span>
              </span>
              <span className="dawa-salah-modal__rakat">
                {FARD_RAKATS[prayer]}R
              </span>
            </label>
          </div>

          {/* Sunnah After */}
          {slots.after > 0 && (
            <div className="dawa-salah-modal__section">
              <span className="dawa-salah-modal__section-label">
                Sunnah After
              </span>
              {Array.from({ length: slots.after }, (_, unit) => (
                <label
                  key={`after-${unit}`}
                  className={`dawa-salah-modal__item${sunnahAfter[unit] ? ' dawa-salah-modal__item--checked' : ''}`}
                >
                  <span className="dawa-salah-modal__checkbox">
                    <input
                      type="checkbox"
                      checked={sunnahAfter[unit] ?? false}
                      onChange={() => {
                        setSunnahAfter((prev) => {
                          const next = [...prev];
                          next[unit] = !next[unit];
                          return next;
                        });
                      }}
                    />
                    <span className="dawa-salah-modal__check-visual">✓</span>
                  </span>
                  <span className="dawa-salah-modal__item-text">
                    <span className="dawa-salah-modal__item-label">
                      {SUNNAH_UNIT_RAKATS} Rakats Sunnah
                    </span>
                    <span className="dawa-salah-modal__item-desc">
                      Unit {unit + 1} of {slots.after}
                    </span>
                  </span>
                  <span className="dawa-salah-modal__rakat">
                    {SUNNAH_UNIT_RAKATS}R
                  </span>
                </label>
              ))}
            </div>
          )}

          {/* Confirm Button */}
          <button
            type="button"
            className={`dawa-salah-modal__confirm${busy ? ' dawa-salah-modal__confirm--busy' : ''}`}
            disabled={busy}
            onClick={handleConfirm}
          >
            {busy ? 'Saving…' : '✓ Confirm Prayers'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
