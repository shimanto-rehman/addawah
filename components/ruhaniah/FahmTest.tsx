'use client';

import { useCallback } from 'react';
import { motion } from 'framer-motion';

type FahmQuestion = {
  id: string;
  category: string;
  text: string;
  options: { text: string; weight: number }[];
};

type FahmResponse = {
  questionId: string;
  answerIndex: number;
  weight: number;
};

type Props = {
  questions: FahmQuestion[];
  responses: FahmResponse[];
  onResponse: (responses: FahmResponse[]) => void;
};

const SEEN_KEY = 'fahm_seen_v1';
const MAX_HISTORY = 120;

function getSeenQuestions(): Set<string> {
  try {
    const raw = localStorage.getItem(SEEN_KEY);
    return new Set<string>(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

function saveSeenQuestions(ids: string[]) {
  try {
    localStorage.setItem(SEEN_KEY, JSON.stringify(ids.slice(-MAX_HISTORY)));
  } catch {
    // localStorage full — ignore
  }
}

/** Pick 3 random questions avoiding recently seen ones */
export function pickTodaysQuestions(allQuestions: FahmQuestion[]): FahmQuestion[] {
  const seen = getSeenQuestions();
  const available = allQuestions.filter((q) => !seen.has(q.id));

  let pool: FahmQuestion[];
  if (available.length < 3) {
    pool = [...allQuestions];
    localStorage.setItem(SEEN_KEY, '[]');
  } else {
    pool = available;
  }

  // Fisher-Yates shuffle
  const shuffled = [...pool];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  const selected = shuffled.slice(0, 3);
  saveSeenQuestions(Array.from(seen).concat(selected.map((q) => q.id)));
  return selected;
}

const CATEGORY_LABELS: Record<string, string> = {
  QADR: 'قدر · Qadr',
  TRUTH: 'حق · Truth',
  DAWAH: 'دعوة · Dawah',
  NAFS: 'نفس · Nafs',
  AKHIRAH: 'آخرة · Akhirah',
  SABR_SHUKR: 'صبر وشكر · Sabr',
  ILM: 'علم · Knowledge',
  SOCIAL: 'معاملات · Social',
};

export function FahmTest({ questions, responses, onResponse }: Props) {
  const handleSelect = useCallback(
    (questionId: string, optionIndex: number, weight: number) => {
      const newResponse: FahmResponse = { questionId, answerIndex: optionIndex, weight };
      const updated = responses.filter((r) => r.questionId !== questionId);
      updated.push(newResponse);
      onResponse(updated);
    },
    [responses, onResponse],
  );

  return (
    <section className="dawa-step-card dawa-fahm-card">
      <div className="dawa-fahm-card__header">
        <h2 className="dawa-step-card__title">Fahm Test</h2>
        <p className="dawa-step-card__subtitle">فهم</p>
      </div>

      <p className="dawa-step-card__question">
        Reflect on each — there are no wrong answers.
      </p>

      <div className="dawa-fahm-list">
        {questions.map((question, qi) => {
          const selected = responses.find((r) => r.questionId === question.id);
          return (
            <motion.div
              key={question.id}
              className="dawa-fahm-item"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: qi * 0.08 }}
            >
              <span className="dawa-fahm-item__badge">
                {CATEGORY_LABELS[question.category] || question.category}
              </span>
              <p className="dawa-fahm-item__text">
                <span className="dawa-fahm-item__num">{qi + 1}.</span>
                {question.text}
              </p>
              <ul className="dawa-fahm-item__options">
                {question.options.map((opt, oi) => (
                  <li key={oi}>
                    <motion.button
                      type="button"
                      className={`dawa-fahm-option${selected?.answerIndex === oi ? ' is-selected' : ''}`}
                      onClick={() => handleSelect(question.id, oi, opt.weight)}
                      whileTap={{ scale: 0.98 }}
                      aria-pressed={selected?.answerIndex === oi}
                    >
                      <span className="dawa-fahm-option__radio" />
                      <span className="dawa-fahm-option__text">{opt.text}</span>
                    </motion.button>
                  </li>
                ))}
              </ul>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
