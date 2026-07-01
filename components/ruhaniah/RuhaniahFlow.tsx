'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { RuhaniahHeader } from './RuhaniahHeader';
import { TaqwaPulse } from './TaqwaPulse';
import { FahmTest, pickTodaysQuestions } from './FahmTest';
import { BarakahMeter } from './BarakahMeter';
import { DuaLog } from './DuaLog';
import { RuhaniahVerse } from './RuhaniahVerse';
import { RuhaniahInsights } from './RuhaniahInsights';
import { useRuhaniahData } from './RuhaniahDataProvider';
import type { FahmResponseInput } from '@/lib/ruhaniah-validation';

type FahmQuestion = {
  id: string;
  category: string;
  text: string;
  options: { text: string; weight: number }[];
};

type DuaInput = {
  text: string;
  category: string;
  context?: string;
};

type VerseResult = {
  ayahRef: string;
  arabic?: string;
  translation?: string;
  tafsir?: string;
  reflectionText: string;
  dawahText: string;
  signals?: Record<string, unknown>;
};

const FAHM_QUESTIONS_URL = '/data/fahm-questions.json';

export function RuhaniahFlow() {
  const ctx = useRuhaniahData();
  const [submitting, setSubmitting] = useState(false);
  const [verse, setVerse] = useState<VerseResult | null>(null);
  const [done, setDone] = useState(false);

  // Taqwa
  const [taqwaScore, setTaqwaScore] = useState<number | null>(null);

  // Fahm
  const [todaysQuestions, setTodaysQuestions] = useState<FahmQuestion[]>([]);
  const [fahmResponses, setFahmResponses] = useState<FahmResponseInput[]>([]);

  // Barakah
  const [barakahScores, setBarakahScores] = useState({
    timeScore: 3,
    rizqScore: 3,
    healthScore: 3,
    heartScore: 3,
  });

  // Dua
  const [existingDuas, setExistingDuas] = useState<
    { id: string; text: string; category: string; status: string; dateStarted: string }[]
  >([]);
  const [newDuas, setNewDuas] = useState<DuaInput[]>([]);

  // Load Fahm questions
  useEffect(() => {
    fetch(FAHM_QUESTIONS_URL)
      .then((r) => r.json())
      .then((data: FahmQuestion[]) => setTodaysQuestions(pickTodaysQuestions(data)))
      .catch(console.error);
  }, []);

  // Load existing duas
  useEffect(() => {
    fetch('/api/ruhaniah/duas')
      .then((r) => r.json())
      .then((data) => { if (data.duas) setExistingDuas(data.duas); })
      .catch(console.error);
  }, []);

  // Already completed today → show verse
  useEffect(() => {
    if (ctx?.data?.completed && ctx.data.verse) {
      const v = ctx.data.verse;
      setVerse({
        ayahRef: v.ayahRef,
        arabic: v.arabic,
        translation: v.translation,
        tafsir: v.tafsir,
        reflectionText: v.reflectionText,
        dawahText: v.dawahText,
        signals: v.signals,
      });
      setDone(true);
    }
  }, [ctx?.data]);

  const allAnswered = fahmResponses.length === todaysQuestions.length && todaysQuestions.length > 0;
  const canSubmit = taqwaScore !== null && allAnswered;

  const handleAddDua = useCallback((dua: DuaInput) => {
    setNewDuas((prev) => [...prev, dua]);
  }, []);

  const handleRemoveNew = useCallback((index: number) => {
    setNewDuas((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleDuaStatusChange = useCallback((id: string, newStatus: string) => {
    setExistingDuas((prev) =>
      prev.map((d) => (d.id === id ? { ...d, status: newStatus } : d)),
    );
  }, []);

  const handleSubmit = useCallback(async () => {
    if (submitting || !canSubmit) return;
    setSubmitting(true);

    try {
      const res = await fetch('/api/ruhaniah', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taqwaScore,
          fahmResponses: fahmResponses.map((r) => ({
            questionId: r.questionId,
            answerIndex: r.answerIndex,
            weight: r.weight,
          })),
          barakahScores,
          duaEntries: newDuas,
        }),
      });

      if (!res.ok) throw new Error('Failed to submit');

      const data = await res.json();
      setVerse(data.verse);
      setDone(true);
      ctx?.mutate();
    } catch (err) {
      console.error('Ruhaniah submission failed:', err);
    } finally {
      setSubmitting(false);
    }
  }, [submitting, canSubmit, taqwaScore, fahmResponses, barakahScores, newDuas, ctx]);

  // ─── Completed state ───
  if (done && verse) {
    return (
      <div className="dawa-ruhaniah">
        <RuhaniahHeader />
        <RuhaniahVerse verse={verse} onClose={() => {}} />
      </div>
    );
  }

  // ─── Main scrollable page ───
  return (
    <div className="dawa-ruhaniah">
      <RuhaniahHeader />

      <div className="dawa-ruhaniah__sections">
        {/* 1. Taqwa Pulse */}
        <TaqwaPulse score={taqwaScore} onChange={setTaqwaScore} />

        {/* 2. Fahm Test */}
        {todaysQuestions.length > 0 && (
          <FahmTest
            questions={todaysQuestions}
            responses={fahmResponses}
            onResponse={setFahmResponses}
          />
        )}

        {/* 3. Barakah Meter */}
        <BarakahMeter scores={barakahScores} onChange={setBarakahScores} />

        {/* 4. Dua Log */}
        <DuaLog
          duas={existingDuas}
          newDuas={newDuas}
          onAddDua={handleAddDua}
          onRemoveNew={handleRemoveNew}
          onStatusChange={handleDuaStatusChange}
        />

        {/* 5. Insights (collapsible) */}
        <RuhaniahInsights />
      </div>

      {/* Single submit button */}
      <motion.div
        className="dawa-ruhaniah__submit-wrap"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <button
          type="button"
          className="dawa-ruhaniah__submit"
          onClick={handleSubmit}
          disabled={!canSubmit || submitting}
        >
          {submitting ? (
            <span className="dawa-ruhaniah__submit-spinner" />
          ) : (
            <>Complete Your Nightly Check-in ✨</>
          )}
        </button>
        {!canSubmit && !submitting && (
          <p className="dawa-ruhaniah__submit-hint">
            {taqwaScore === null
              ? 'Set your Taqwa Pulse to continue'
              : `Answer all 3 Fahm questions (${fahmResponses.length}/3)`}
          </p>
        )}
      </motion.div>
    </div>
  );
}
