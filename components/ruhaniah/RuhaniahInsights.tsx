'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FahmRadar } from './FahmRadar';
import { TaqwaTrend } from './TaqwaTrend';
import { DuaChart } from './DuaChart';
import { useRuhaniahData } from './RuhaniahDataProvider';

type HistoryData = {
  taqwaHistory: { date: string; score: number }[];
  barakahHistory: { date: string; timeScore: number; rizqScore: number; healthScore: number; heartScore: number }[];
  duaStats: { total: number; answered: number; waiting: number };
};

export function RuhaniahInsights() {
  const ctx = useRuhaniahData();
  const [history, setHistory] = useState<HistoryData | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open || history) return;
    fetch('/api/ruhaniah/history')
      .then((r) => r.json())
      .then((data) => setHistory(data))
      .catch(console.error);
  }, [open, history]);

  const fahmProfile = ctx?.data?.fahmProfile;

  return (
    <div className="dawa-insights">
      <button
        type="button"
        className="dawa-insights__toggle"
        onClick={() => setOpen(!open)}
      >
        <span className="dawa-insights__toggle-icon">📊</span>
        <span>Your Insights</span>
        <span className="dawa-insights__toggle-arrow" style={{ transform: open ? 'rotate(180deg)' : 'rotate(0)' }}>
          ▾
        </span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="dawa-insights__body"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            {/* Fahm Radar */}
            {fahmProfile && fahmProfile.totalQuestions > 0 && (
              <FahmRadar
                categoryScores={fahmProfile.categoryScores}
                strongest={fahmProfile.strongest}
                weakest={fahmProfile.weakest}
                trend={fahmProfile.trend}
                overallQAS={fahmProfile.overallQAS}
              />
            )}

            {/* Taqwa Trend */}
            {history && (
              <TaqwaTrend history={history.taqwaHistory} />
            )}

            {/* Dua Doughnut */}
            {history && (
              <DuaChart stats={history.duaStats} />
            )}

            {!fahmProfile && !history && (
              <p className="dawa-insights__loading">Loading insights…</p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
