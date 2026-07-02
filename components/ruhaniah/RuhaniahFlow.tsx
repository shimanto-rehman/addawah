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

type DuaTimelineEntry = {
  text: string;
  category: string;
  status: string;
  daysToAccept: number;
  dateStarted: string;
  dateResolved: string;
};

type DuaListItem = {
  id: string;
  text: string;
  category: string;
  status: string;
  dateStarted: string;
  dateResolved: string | null;
  daysWaiting: number | null;
};

type InsightsData = {
  fahmProfile: {
    totalQuestions: number;
    categoryScores: Record<string, number>;
    overallQAS: number;
    strongest: string | null;
    weakest: string | null;
    trend: string;
  } | null;
  taqwaHistory: { date: string; score: number }[];
  barakahHistory: { date: string; timeScore: number; rizqScore: number; healthScore: number; heartScore: number }[];
  duaStats: { total: number; answered: number; waiting: number; stored: number };
  duaTimeline: DuaTimelineEntry[];
  duaList: DuaListItem[];
};

const FAHM_QUESTIONS_URL = '/data/fahm-questions.json';

export function RuhaniahFlow() {
  const ctx = useRuhaniahData();
  const [submitting, setSubmitting] = useState(false);
  const [verse, setVerse] = useState<VerseResult | null>(null);
  const [insights, setInsights] = useState<InsightsData | null>(null);
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

  // Already completed today → show verse + insights
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
      // Insights come from the GET response
      if (ctx.data.insights) {
        setInsights({
          fahmProfile: ctx.data.fahmProfile ?? null,
          ...ctx.data.insights,
        });
      } else if (ctx.data.fahmProfile) {
        setInsights({
          fahmProfile: ctx.data.fahmProfile,
          taqwaHistory: [],
          barakahHistory: [],
          duaStats: { total: 0, answered: 0, waiting: 0, stored: 0 },
          duaTimeline: [],
          duaList: [],
        });
      }
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

      if (!res.ok) {
        const errBody = await res.json().catch(() => null);
        console.error('Ruhaniah submission failed:', res.status, errBody);
        throw new Error(errBody?.error || `Server error (${res.status})`);
      }

      const data = await res.json();
      if (data.verse) {
        setVerse(data.verse);
      }
      if (data.insights) {
        setInsights(data.insights);
      }
      setDone(true);
      ctx?.mutate();
    } catch (err) {
      console.error('Ruhaniah submission failed:', err);
    } finally {
      setSubmitting(false);
    }
  }, [submitting, canSubmit, taqwaScore, fahmResponses, barakahScores, newDuas, ctx]);

  // ─── Completed state ───
  if (done) {
    return (
      <div className="dawa-ruhaniah">
        <RuhaniahHeader />
        {verse ? (
          <RuhaniahVerse verse={verse} />
        ) : (
          <div className="dawa-step-card" style={{ textAlign: 'center', padding: '32px 16px' }}>
            <p style={{ fontSize: 40, marginBottom: 12 }}>✨</p>
            <h2 className="dawa-step-card__title">Alhamdulillah</h2>
            <p className="dawa-step-card__question">
              Your nightly check-in has been saved. Your verse will appear here tomorrow inshaAllah.
            </p>
          </div>
        )}

        {/* Insights below the verse */}
        <RuhaniahInsights insights={insights} fahmProfile={insights?.fahmProfile ?? ctx?.data?.fahmProfile ?? null} />
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
