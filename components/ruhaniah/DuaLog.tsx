'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

type DuaItem = {
  id: string;
  text: string;
  category: string;
  status: string;
  dateStarted: string;
};

type DuaInput = {
  text: string;
  category: string;
  context?: string;
};

type Props = {
  duas: DuaItem[];
  newDuas: DuaInput[];
  onAddDua: (dua: DuaInput) => void;
  onRemoveNew: (index: number) => void;
  onStatusChange?: (id: string, newStatus: string) => void;
};

const STATUS_ICONS: Record<string, string> = {
  WAITING: '🕰️',
  ANSWERED_SAME: '🌸',
  ANSWERED_DIFFERENT: '🌿',
  STORED_AKHIRAH: '✨',
};

const STATUS_LABELS: Record<string, string> = {
  WAITING: 'Waiting',
  ANSWERED_SAME: 'Answered (as asked)',
  ANSWERED_DIFFERENT: 'Answered (different way)',
  STORED_AKHIRAH: 'Stored for Akhirah',
};

const ALL_STATUSES = ['WAITING', 'ANSWERED_SAME', 'ANSWERED_DIFFERENT', 'STORED_AKHIRAH'];

const CATEGORIES = [
  { value: 'GUIDANCE', label: 'Guidance' },
  { value: 'RIZQ', label: 'Rizq' },
  { value: 'HEALTH', label: 'Health' },
  { value: 'RELATIONSHIPS', label: 'Relationships' },
  { value: 'FORGIVENESS', label: 'Forgiveness' },
  { value: 'JANNAH', label: 'Jannah' },
  { value: 'DUNYA', label: 'Dunya' },
  { value: 'CUSTOM', label: 'Custom' },
];

function daysSince(dateStr: string): number {
  const start = new Date(dateStr);
  const now = new Date();
  return Math.floor((now.getTime() - start.getTime()) / 86400000);
}

export function DuaLog({ duas, newDuas, onAddDua, onRemoveNew, onStatusChange }: Props) {
  const [text, setText] = useState('');
  const [category, setCategory] = useState('GUIDANCE');
  const [expanded, setExpanded] = useState(false);
  const [remarkingId, setRemarkingId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    onAddDua({ text: text.trim(), category });
    setText('');
    setCategory('GUIDANCE');
    setExpanded(false);
  }

  const handleRemark = useCallback(async (duaId: string, newStatus: string) => {
    setUpdatingId(duaId);
    try {
      const res = await fetch('/api/ruhaniah/duas', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: duaId, status: newStatus }),
      });
      if (!res.ok) throw new Error('Failed to update');
      onStatusChange?.(duaId, newStatus);
    } catch (err) {
      console.error('Dua remark failed:', err);
    } finally {
      setUpdatingId(null);
      setRemarkingId(null);
    }
  }, [onStatusChange]);

  const allDuas = [
    ...newDuas.map((d, i) => ({
      id: `new-${i}`,
      text: d.text,
      category: d.category,
      status: 'WAITING' as const,
      dateStarted: new Date().toISOString(),
      isNew: true,
      newIdx: i,
    })),
    ...duas.map((d) => ({ ...d, isNew: false, newIdx: -1 })),
  ];

  return (
    <section className="dawa-step-card dawa-dua-card">
      <div className="dawa-dua-card__header">
        <h2 className="dawa-step-card__title">Dua Log</h2>
        <p className="dawa-step-card__subtitle">دعاء</p>
      </div>

      <p className="dawa-step-card__question">
        Any dua you want to log tonight? <span style={{ color: 'var(--text-dim)', fontWeight: 400 }}>(optional)</span>
      </p>

      {/* Inline add form */}
      {!expanded ? (
        <button
          type="button"
          className="dawa-dua-add-trigger"
          onClick={() => setExpanded(true)}
        >
          <span className="dawa-dua-add-trigger__icon">+</span>
          <span>Add a dua</span>
        </button>
      ) : (
        <form className="dawa-dua-inline-form" onSubmit={handleSubmit}>
          <input
            className="dawa-dua-inline-form__input"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="What are you asking Allah for?"
            maxLength={500}
            autoFocus
          />
          <div className="dawa-dua-inline-form__row">
            <select
              className="dawa-dua-inline-form__select"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
            <button
              type="button"
              className="dawa-dua-inline-form__cancel"
              onClick={() => { setExpanded(false); setText(''); }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="dawa-dua-inline-form__submit"
              disabled={!text.trim()}
            >
              Add 🤲
            </button>
          </div>
        </form>
      )}

      {/* Dua list */}
      {allDuas.length > 0 && (
        <ul className="dawa-dua-list">
          <AnimatePresence>
            {allDuas.slice(0, 10).map((dua) => (
              <motion.li
                key={dua.id}
                className="dawa-dua-item"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <span className="dawa-dua-item__icon">
                  {STATUS_ICONS[dua.status] || '🕰️'}
                </span>
                <span className="dawa-dua-item__text">{dua.text}</span>
                <span className="dawa-dua-item__meta">
                  {dua.isNew ? (
                    <button
                      type="button"
                      className="dawa-dua-item__remove"
                      onClick={() => onRemoveNew(dua.newIdx)}
                      aria-label="Remove"
                    >
                      ×
                    </button>
                  ) : (
                    <>
                      <span className="dawa-dua-item__days">{daysSince(dua.dateStarted)}d</span>
                      <button
                        type="button"
                        className="dawa-dua-item__remark"
                        onClick={() => setRemarkingId(remarkingId === dua.id ? null : dua.id)}
                        disabled={updatingId === dua.id}
                        aria-label="Update status"
                      >
                        {updatingId === dua.id ? '…' : '↻'}
                      </button>
                    </>
                  )}
                </span>

                {/* Status picker dropdown */}
                <AnimatePresence>
                  {remarkingId === dua.id && !dua.isNew && (
                    <motion.div
                      className="dawa-dua-remark"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      {ALL_STATUSES.map((s) => (
                        <button
                          key={s}
                          type="button"
                          className={`dawa-dua-remark__option${dua.status === s ? ' is-current' : ''}`}
                          onClick={() => handleRemark(dua.id, s)}
                          disabled={dua.status === s || updatingId === dua.id}
                        >
                          <span>{STATUS_ICONS[s]}</span>
                          <span>{STATUS_LABELS[s]}</span>
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}
    </section>
  );
}
