'use client';

import { StarRating } from '@/components/ui/StarRating';

const TESTIMONIALS = [
  {
    name: 'Fatima Rahman',
    location: 'London, UK',
    rating: 5,
    quote:
      'The mihrab tracker changed how I see my week. Gentle, beautiful, and never guilt-driven — exactly what I needed to stay consistent with Fajr.',
  },
  {
    name: 'Ahmad Khalil',
    location: 'Toronto, CA',
    rating: 5,
    quote:
      'Brotherhood reminders feel like a kind nudge from a friend, not a lecture. My small group finally prays on time more often together.',
  },
  {
    name: 'Yusuf Malik',
    location: 'Dubai, AE',
    rating: 5,
    quote:
      'Daily wisdom and the Hijri calendar make Addawah my morning anchor. Clean design, no clutter — worship stays the focus.',
  },
] as const;

export function PeopleFeedback() {
  return (
    <section className="dawa-section dawa-feedback" id="feedback" aria-labelledby="feedback-heading">
      <div className="dawa-section__head">
        <h2 className="dawa-section__title" id="feedback-heading">Loved by the ummah</h2>
        <p className="dawa-section__sub">
          Real stories from believers who use Addawah to pray together and grow in faith.
        </p>
      </div>

      <div className="dawa-feedback__summary">
        <StarRating rating={5} size="md" />
        <p className="dawa-feedback__score">
          <strong className="dawa-num">4.9</strong>
          <span>average rating</span>
        </p>
        <p className="dawa-feedback__count">From 2,400+ community members</p>
      </div>

      <div className="dawa-feedback__grid">
        {TESTIMONIALS.map((item) => (
          <blockquote
            key={item.name}
            className="dawa-feedback__card"
            cite={`${item.name}, ${item.location}`}
          >
            <StarRating rating={item.rating} size="sm" />
            <p className="dawa-feedback__quote">&ldquo;{item.quote}&rdquo;</p>
            <footer className="dawa-feedback__author">
              <span className="dawa-feedback__name">{item.name}</span>
              <span className="dawa-feedback__location">{item.location}</span>
            </footer>
          </blockquote>
        ))}
      </div>
    </section>
  );
}
