'use client';

import { motion } from 'framer-motion';

type VerseData = {
  ayahRef: string;
  arabic?: string;
  translation?: string;
  tafsir?: string;
  reflectionText: string;
  dawahText: string;
};

type Props = {
  verse: VerseData;
  onClose: () => void;
};

export function RuhaniahVerse({ verse, onClose }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="dawa-verse">
        <p className="dawa-verse__label">Your Ruhaniah Verse Tonight</p>

        <p className="dawa-verse__bismillah">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</p>

        {verse.arabic && (
          <p className="dawa-verse__arabic">{verse.arabic}</p>
        )}

        {verse.translation && (
          <p className="dawa-verse__translation">&ldquo;{verse.translation}&rdquo;</p>
        )}

        <p className="dawa-verse__ref">— {verse.ayahRef}</p>

        <div className="dawa-verse__divider" />

        <div className="dawa-verse__reflection">
          <p className="dawa-verse__card-label">Reflection</p>
          <p className="dawa-verse__card-text">{verse.reflectionText}</p>
        </div>

        <div className="dawa-verse__dawah">
          <p className="dawa-verse__card-label">Dawah Moment</p>
          <p className="dawa-verse__card-text">{verse.dawahText}</p>
        </div>

        <button
          type="button"
          className="dawa-verse__close-dua"
          onClick={onClose}
        >
          🤲 Close with Du&apos;a
        </button>
      </div>
    </motion.div>
  );
}
