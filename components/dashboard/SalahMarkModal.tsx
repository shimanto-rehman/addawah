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
  SITE_LOGO_SRC,
  type PrayerName,
  type SalahKind,
} from '@/lib/constants';
import type { SalahCell } from '@/lib/salah-utils';

const HEADER_ID = 'salah-mark-modal-title';

type Update = { kind: SalahKind; unit: number; completed: boolean; inJamat?: boolean };

function formatRakats(count: number) {
  return `${count} Rakat`;
}

function BeadCaption({
  prayerKind,
  rakats,
  checked,
  wide,
}: {
  prayerKind: 'sunnah' | 'fard';
  rakats: number;
  checked: boolean;
  wide?: boolean;
}) {
  return (
    <span
      className={`dawa-salah-modal__bead-caption dawa-salah-modal__bead-caption--${prayerKind}${checked ? ' dawa-salah-modal__bead-caption--on' : ''}${wide ? ' dawa-salah-modal__bead-caption--wide' : ''}`}
    >
      {prayerKind === 'sunnah' && (
        <span className="dawa-salah-modal__bead-caption-kind">Sunnah</span>
      )}
      <span className="dawa-salah-modal__bead-caption-rakats">{formatRakats(rakats)}</span>
    </span>
  );
}

type Props = {
  open: boolean;
  onClose: () => void;
  prayer: PrayerName;
  dateKey: string;
  cell: SalahCell;
  gender: 'MALE' | 'FEMALE' | null;
  onConfirm: (updates: Update[]) => Promise<void>;
};

function BeadButton({
  checked,
  rakats,
  unit,
  variant,
  onToggle,
}: {
  checked: boolean;
  rakats: number;
  unit?: number;
  variant: 'sunnah' | 'fard';
  onToggle: () => void;
}) {
  const label =
    variant === 'fard'
      ? `${rakats} rakats fard`
      : `Sunnah unit ${(unit ?? 0) + 1}, ${rakats} rakats`;

  return (
    <button
      type="button"
      className={`dawa-salah-modal__bead dawa-salah-modal__bead--${variant}${checked ? ' dawa-salah-modal__bead--on' : ''}`}
      onClick={onToggle}
      aria-pressed={checked}
      aria-label={label}
    >
      <span className="dawa-salah-modal__bead-core" aria-hidden>
        {rakats}
      </span>
    </button>
  );
}

export function SalahMarkModal({
  open,
  onClose,
  prayer,
  dateKey,
  cell,
  gender,
  onConfirm,
}: Props) {
  const slots = SUNNAH_SLOTS[prayer];

  const [sunnahBefore, setSunnahBefore] = useState<boolean[]>(() => []);
  const [sunnahAfter, setSunnahAfter] = useState<boolean[]>(() => []);
  const [fard, setFard] = useState(false);
  const [inJamat, setInJamat] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [busy, setBusy] = useState(false);

  useMemo(() => {
    if (open) {
      setSunnahBefore([...cell.sunnahBefore]);
      setSunnahAfter([...cell.sunnahAfter]);
      setFard(cell.fard);
      setInJamat(cell.inJamat ?? false);
      setInitialized(true);
    } else {
      setInitialized(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, cell.fard, cell.inJamat, cell.sunnahBefore.length, cell.sunnahAfter.length]);

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

  const totalUnits = slots.before + 1 + slots.after;
  const doneCount =
    sunnahBefore.filter(Boolean).length +
    (fard ? 1 : 0) +
    sunnahAfter.filter(Boolean).length;

  const handleConfirm = useCallback(async () => {
    if (busy) return;
    setBusy(true);

    const updates: Update[] = [];

    sunnahBefore.forEach((checked, unit) => {
      const wasDone = cell.sunnahBefore[unit] ?? false;
      if (checked !== wasDone) {
        updates.push({ kind: 'SUNNAH_BEFORE', unit, completed: checked });
      }
    });

    sunnahAfter.forEach((checked, unit) => {
      const wasDone = cell.sunnahAfter[unit] ?? false;
      if (checked !== wasDone) {
        updates.push({ kind: 'SUNNAH_AFTER', unit, completed: checked });
      }
    });

    if (fard !== cell.fard || inJamat !== (cell.inJamat ?? false)) {
      updates.push({ kind: 'FARD', unit: 0, completed: fard, inJamat: fard ? inJamat : false });
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
  }, [busy, sunnahBefore, sunnahAfter, fard, inJamat, cell, onConfirm, onClose]);

  if (!initialized) return null;

  return (
    <div className="dawa-salah-modal">
      <Modal open={open} onClose={onClose} labelledBy={HEADER_ID}>
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
          <div className="dawa-salah-modal__icon">
            <img src={SITE_LOGO_SRC} alt="" width={32} height={32} />
          </div>
          <h3 className="dawa-salah-modal__prayer-name" id={HEADER_ID}>
            {PRAYER_LABELS[prayer]}
            <span className="dawa-salah-modal__prayer-arabic">
              {PRAYER_ARABIC[prayer]}
            </span>
          </h3>
          <p className="dawa-salah-modal__date">{formattedDate}</p>
        </div>

        <div className="dawa-salah-modal__body">
          <div className="dawa-salah-modal__stage">
            <div className="dawa-salah-modal__meter" aria-live="polite">
              <div className="dawa-salah-modal__meter-track" aria-hidden>
                {Array.from({ length: totalUnits }, (_, i) => (
                  <span
                    key={i}
                    className={`dawa-salah-modal__meter-dot${i < doneCount ? ' dawa-salah-modal__meter-dot--on' : ''}`}
                  />
                ))}
              </div>
              <p className="dawa-salah-modal__meter-label">
                <span className="dawa-num">{doneCount}</span>
                <span className="dawa-salah-modal__meter-sep">/</span>
                <span className="dawa-num">{totalUnits}</span>
                {' '}marked
              </p>
            </div>

            <div className="dawa-salah-modal__strand" role="group" aria-label="Prayer units">
              <div className="dawa-salah-modal__strand-rail" aria-hidden />

              {slots.before > 0 && (
                <div className="dawa-salah-modal__strand-zone dawa-salah-modal__strand-zone--before">
                  <span className="dawa-salah-modal__zone-tag">Before</span>
                  <div className="dawa-salah-modal__bead-track">
                    <div className="dawa-salah-modal__bead-group">
                      {Array.from({ length: slots.before }, (_, unit) => (
                        <BeadButton
                          key={`before-${unit}`}
                          variant="sunnah"
                          rakats={SUNNAH_UNIT_RAKATS}
                          unit={unit}
                          checked={sunnahBefore[unit] ?? false}
                          onToggle={() => {
                            setSunnahBefore((prev) => {
                              const next = [...prev];
                              next[unit] = !next[unit];
                              return next;
                            });
                          }}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="dawa-salah-modal__rakat-row">
                    {Array.from({ length: slots.before }, (_, unit) => (
                      <BeadCaption
                        key={`before-r-${unit}`}
                        prayerKind="sunnah"
                        rakats={SUNNAH_UNIT_RAKATS}
                        checked={sunnahBefore[unit] ?? false}
                      />
                    ))}
                  </div>
                </div>
              )}

              <div className="dawa-salah-modal__strand-zone dawa-salah-modal__strand-zone--fard">
                <span className="dawa-salah-modal__zone-tag">Fard</span>
                <div className="dawa-salah-modal__bead-track">
                  <BeadButton
                    variant="fard"
                    rakats={FARD_RAKATS[prayer]}
                    checked={fard}
                    onToggle={() => setFard((prev) => !prev)}
                  />
                </div>
                <div className="dawa-salah-modal__rakat-row">
                  <BeadCaption
                    prayerKind="fard"
                    rakats={FARD_RAKATS[prayer]}
                    checked={fard}
                    wide
                  />
                </div>
              </div>

              {slots.after > 0 && (
                <div className="dawa-salah-modal__strand-zone dawa-salah-modal__strand-zone--after">
                  <span className="dawa-salah-modal__zone-tag">After</span>
                  <div className="dawa-salah-modal__bead-track">
                    <div className="dawa-salah-modal__bead-group">
                      {Array.from({ length: slots.after }, (_, unit) => (
                        <BeadButton
                          key={`after-${unit}`}
                          variant="sunnah"
                          rakats={SUNNAH_UNIT_RAKATS}
                          unit={unit}
                          checked={sunnahAfter[unit] ?? false}
                          onToggle={() => {
                            setSunnahAfter((prev) => {
                              const next = [...prev];
                              next[unit] = !next[unit];
                              return next;
                            });
                          }}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="dawa-salah-modal__rakat-row">
                    {Array.from({ length: slots.after }, (_, unit) => (
                      <BeadCaption
                        key={`after-r-${unit}`}
                        prayerKind="sunnah"
                        rakats={SUNNAH_UNIT_RAKATS}
                        checked={sunnahAfter[unit] ?? false}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {fard && (
              <label className="dawa-salah-modal__jamat">
                <input
                  type="checkbox"
                  checked={inJamat}
                  onChange={(e) => setInJamat(e.target.checked)}
                />
                {gender === 'FEMALE' ? 'Prayed in Awal Wakt' : 'Prayed in Jamat'}
              </label>
            )}

            <p className="dawa-salah-modal__hint">Tap each bead as you complete it</p>

            <button
              type="button"
              className={`dawa-salah-modal__confirm${busy ? ' dawa-salah-modal__confirm--busy' : ''}`}
              disabled={busy}
              onClick={handleConfirm}
            >
              {busy ? 'Marking…' : 'Mark'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
