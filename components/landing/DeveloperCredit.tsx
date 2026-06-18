'use client';

import { useState } from 'react';
import { DEVELOPER, getInitials } from '@/lib/constants';

export function DeveloperCredit() {
  const [photoFailed, setPhotoFailed] = useState(false);

  return (
    <section className="dawa-dev-credit" aria-label="Developer">
      <div className="dawa-dev-credit__inner">
        <div className="dawa-dev-credit__card">
          <div className="dawa-dev-credit__photo">
            {photoFailed ? (
              <span className="dawa-dev-credit__initials">{getInitials(DEVELOPER.name)}</span>
            ) : (
              <img
                src={DEVELOPER.photoSrc}
                alt={DEVELOPER.name}
                width={72}
                height={72}
                onError={() => setPhotoFailed(true)}
              />
            )}
          </div>
          <div className="dawa-dev-credit__text">
            <p className="dawa-dev-credit__label">Built by</p>
            <p className="dawa-dev-credit__name">{DEVELOPER.name}</p>
            <p className="dawa-dev-credit__role">{DEVELOPER.role}</p>
            <p className="dawa-dev-credit__bio">{DEVELOPER.bio}</p>
            <a
              className="dawa-dev-credit__link"
              href={DEVELOPER.portfolioUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              www.shimanto.online
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
