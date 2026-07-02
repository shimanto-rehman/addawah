'use client';

import { motion } from 'framer-motion';
import { FahmRadar } from './FahmRadar';
import { TaqwaTrend } from './TaqwaTrend';
import { BarakahTrend } from './BarakahTrend';
import { DuaTimeline } from './DuaTimeline';

type FahmProfile = {
  totalQuestions: number;
  categoryScores: Record<string, number>;
  overallQAS: number;
  strongest: string | null;
  weakest: string | null;
  trend: string;
} | null;

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
  taqwaHistory: { date: string; score: number }[];
  barakahHistory: { date: string; timeScore: number; rizqScore: number; healthScore: number; heartScore: number }[];
  duaStats: { total: number; answered: number; waiting: number; stored: number };
  duaTimeline: DuaTimelineEntry[];
  duaList: DuaListItem[];
} | null;

type Props = {
  insights: InsightsData;
  fahmProfile: FahmProfile;
};

const sectionVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.15 + i * 0.1, duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  }),
};

export function RuhaniahInsights({ insights, fahmProfile }: Props) {
  const hasFahm = fahmProfile && fahmProfile.totalQuestions > 0;
  const hasTaqwa = insights && insights.taqwaHistory.length > 0;
  const hasBarakah = insights && insights.barakahHistory.length > 0;
  const hasDuas = insights && insights.duaStats.total > 0;
  const hasAnyData = hasFahm || hasTaqwa || hasBarakah || hasDuas;

  return (
    <motion.div
      className="dawa-insights"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.5 }}
    >
      {/* Section header */}
      <div className="dawa-insights__head">
        <div className="dawa-insights__head-glow" />
        <h2 className="dawa-insights__head-title">Your Inner State</h2>
        <p className="dawa-insights__head-sub">A mirror of your deen journey — track where you stand, where you grow</p>
      </div>

      <div className="dawa-insights__grid">
        {/* Fahm Radar */}
        {hasFahm && (
          <motion.div custom={0} variants={sectionVariants} initial="hidden" animate="visible">
            <FahmRadar
              categoryScores={fahmProfile!.categoryScores}
              strongest={fahmProfile!.strongest}
              weakest={fahmProfile!.weakest}
              trend={fahmProfile!.trend}
              overallQAS={fahmProfile!.overallQAS}
            />
          </motion.div>
        )}

        {/* Taqwa Trend */}
        {hasTaqwa && (
          <motion.div custom={1} variants={sectionVariants} initial="hidden" animate="visible">
            <TaqwaTrend history={insights!.taqwaHistory} />
          </motion.div>
        )}

        {/* Barakah Flow */}
        {hasBarakah && (
          <motion.div custom={2} variants={sectionVariants} initial="hidden" animate="visible">
            <BarakahTrend history={insights!.barakahHistory} />
          </motion.div>
        )}

        {/* Dua Garden & Graveyard */}
        {hasDuas && (
          <motion.div custom={3} variants={sectionVariants} initial="hidden" animate="visible">
            <DuaTimeline
              duaTimeline={insights!.duaTimeline}
              duaList={insights!.duaList}
              duaStats={insights!.duaStats}
            />
          </motion.div>
        )}

        {/* Empty state */}
        {!hasAnyData && (
          <motion.div
            custom={0}
            variants={sectionVariants}
            initial="hidden"
            animate="visible"
            className="dawa-insights__empty"
          >
            <span className="dawa-insights__empty-icon">🌱</span>
            <p className="dawa-insights__empty-text">
              Complete your first check-in to see your inner state come alive
            </p>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
