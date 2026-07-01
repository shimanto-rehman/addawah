'use client';

import { useState } from 'react';

type DuaInput = {
  text: string;
  category: string;
  context?: string;
};

type Props = {
  onSubmit: (dua: DuaInput) => void;
  onClose: () => void;
};

const CATEGORIES = [
  { value: 'RIZQ', label: 'Rizq / Provision' },
  { value: 'HEALTH', label: 'Health' },
  { value: 'RELATIONSHIPS', label: 'Relationships' },
  { value: 'GUIDANCE', label: 'Guidance' },
  { value: 'FORGIVENESS', label: 'Forgiveness' },
  { value: 'JANNAH', label: 'Jannah' },
  { value: 'DUNYA', label: 'Dunya' },
  { value: 'CUSTOM', label: 'Custom' },
];

export function DuaFormModal({ onSubmit, onClose }: Props) {
  const [text, setText] = useState('');
  const [category, setCategory] = useState('GUIDANCE');
  const [context, setContext] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    onSubmit({
      text: text.trim(),
      category,
      context: context.trim() || undefined,
    });
    setText('');
    setContext('');
    onClose();
  }

  return (
    <div
      className="dawa-dua-modal__overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <form className="dawa-dua-modal" onSubmit={handleSubmit}>
        <h3 className="dawa-dua-modal__title">🤲 Add a Dua</h3>

        <div className="dawa-dua-modal__field">
          <label className="dawa-dua-modal__label" htmlFor="dua-text">
            What are you asking Allah for?
          </label>
          <textarea
            id="dua-text"
            className="dawa-dua-modal__textarea"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="e.g., Help me wake up for Tahajjud…"
            maxLength={500}
            required
          />
        </div>

        <div className="dawa-dua-modal__field">
          <label className="dawa-dua-modal__label" htmlFor="dua-category">
            Category
          </label>
          <select
            id="dua-category"
            className="dawa-dua-modal__select"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        <div className="dawa-dua-modal__field">
          <label className="dawa-dua-modal__label" htmlFor="dua-context">
            Context (optional)
          </label>
          <input
            id="dua-context"
            className="dawa-dua-modal__input"
            value={context}
            onChange={(e) => setContext(e.target.value)}
            placeholder="What prompted this dua?"
            maxLength={500}
          />
        </div>

        <div className="dawa-dua-modal__actions">
          <button type="button" className="dawa-dua-modal__cancel" onClick={onClose}>
            Cancel
          </button>
          <button
            type="submit"
            className="dawa-dua-modal__submit"
            disabled={!text.trim()}
          >
            Add Dua 🤲
          </button>
        </div>
      </form>
    </div>
  );
}
