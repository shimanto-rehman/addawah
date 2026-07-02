'use client';

import { useEffect, useId, useRef, useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { UserAvatar } from '@/components/profile/UserAvatar';
import { userProfilePath } from '@/lib/user-public-stats';
import { sanitizeUsername } from '@/lib/validation';
import { Shimmer } from '@/components/ui/Shimmer';

const fetcher = (url: string) => fetch(url, { cache: 'no-store' }).then((r) => r.json());

const SEARCH_HINTS = ['yusuf_a', 'fatima_k', 'omar_h', 'aisha_r'];

type SearchResult = {
  id: string;
  name: string;
  username: string;
  avatarColor: string;
  avatarUrl: string | null;
  connectionStatus: 'none' | 'connected' | 'pending_sent' | 'pending_received';
};

type UsernameSearchProps = {
  onRequestConnect: (username: string) => void;
  connectBusy?: boolean;
  variant?: 'default' | 'compact';
};

function highlightMatch(text: string, query: string) {
  if (!query) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx < 0) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="dawa-user-search__mark">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  );
}

function statusLabel(status: SearchResult['connectionStatus']) {
  switch (status) {
    case 'connected':
      return 'Connected';
    case 'pending_sent':
      return 'Pending';
    case 'pending_received':
      return 'Respond';
    default:
      return null;
  }
}

export function UsernameSearch({
  onRequestConnect,
  connectBusy = false,
  variant = 'default',
}: UsernameSearchProps) {
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [focused, setFocused] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebounced(sanitizeUsername(query.replace(/^@/, '')));
    }, 260);
    return () => window.clearTimeout(timer);
  }, [query]);

  const searchKey =
    debounced.length >= 2 ? `/api/friends/search?q=${encodeURIComponent(debounced)}` : null;

  const { data, isLoading, isValidating } = useSWR<{ results: SearchResult[] }>(
    searchKey,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 300 },
  );

  const results = data?.results ?? [];
  const hasQuery = debounced.length >= 2;
  const searching = hasQuery && (isLoading || (isValidating && results.length === 0));
  const showResults = hasQuery && (focused || query.length > 0);

  useEffect(() => {
    setActiveIndex(-1);
  }, [debounced, results.length]);

  function applyHint(username: string) {
    setQuery(username);
    inputRef.current?.focus();
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!showResults || results.length === 0) {
      if (e.key === 'Escape') inputRef.current?.blur();
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % results.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => (i <= 0 ? results.length - 1 : i - 1));
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault();
      const hit = results[activeIndex];
      if (hit) window.location.href = userProfilePath(hit.username);
    } else if (e.key === 'Escape') {
      inputRef.current?.blur();
    }
  }

  const compact = variant === 'compact';

  return (
    <div className={`dawa-user-search${compact ? ' dawa-user-search--compact' : ''}`}>
      {compact && <span className="dawa-user-search__label">Connect</span>}
      <div className="dawa-user-search__bar">
        <span className="dawa-user-search__at" aria-hidden>@</span>
        <input
          ref={inputRef}
          id={`${listId}-input`}
          type="text"
          inputMode="search"
          enterKeyHint="search"
          className="dawa-user-search__input"
          placeholder={compact ? 'Find username' : 'Search username'}
          value={query}
          onChange={(e) => setQuery(e.target.value.replace(/\s/g, ''))}
          onFocus={() => setFocused(true)}
          onBlur={() => window.setTimeout(() => setFocused(false), 160)}
          onKeyDown={onKeyDown}
          autoComplete="off"
          spellCheck={false}
          role="combobox"
          aria-expanded={showResults}
          aria-controls={`${listId}-listbox`}
          aria-autocomplete="list"
        />
        {hasQuery && isValidating && (
          <span className="dawa-user-search__spinner" aria-hidden />
        )}
      </div>

      {!compact && !hasQuery && (
        <p className="dawa-user-search__hints">
          Try{' '}
          {SEARCH_HINTS.map((name, i) => (
            <span key={name}>
              {i > 0 && ', '}
              <button type="button" className="dawa-user-search__hint" onClick={() => applyHint(name)}>
                @{name}
              </button>
            </span>
          ))}
        </p>
      )}

      {showResults && (
        <div className="dawa-user-search__panel" role="listbox" id={`${listId}-listbox`}>
          {searching ? (
            <div className="dawa-user-search__shimmer">
              {Array.from({ length: 3 }, (_, i) => (
                <div key={i} className="dawa-user-search__shimmer-row">
                  <Shimmer variant="avatar" />
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <Shimmer variant="text" width="120px" />
                    <Shimmer variant="text-sm" width="80px" />
                  </div>
                  <Shimmer variant="button" width="70px" />
                </div>
              ))}
            </div>
          ) : results.length === 0 ? (
            <p className="dawa-user-search__state">
              No users found for <strong>@{debounced}</strong>
            </p>
          ) : (
            <ul className="dawa-user-search__results">
              {results.map((person, index) => {
                const profileHref = userProfilePath(person.username);
                const status = statusLabel(person.connectionStatus);
                const isActive = index === activeIndex;

                return (
                  <li key={person.id} role="option" aria-selected={isActive}>
                    <div className={`dawa-user-search__row${isActive ? ' is-active' : ''}`}>
                      <Link href={profileHref} className="dawa-user-search__profile">
                        <UserAvatar
                          userId={person.id}
                          name={person.name}
                          avatarColor={person.avatarColor}
                          avatarUrl={person.avatarUrl}
                          size={44}
                        />
                        <span className="dawa-user-search__meta">
                          <span className="dawa-user-search__name">{person.name}</span>
                          <span className="dawa-user-search__username">
                            @{highlightMatch(person.username, debounced)}
                          </span>
                        </span>
                      </Link>
                      <div className="dawa-user-search__actions">
                        {status ? (
                          <span className={`dawa-user-search__pill is-${person.connectionStatus}`}>
                            {status}
                          </span>
                        ) : (
                          <button
                            type="button"
                            className="dawa-btn dawa-btn--primary dawa-btn--sm"
                            disabled={connectBusy}
                            onClick={() => onRequestConnect(person.username)}
                          >
                            Connect
                          </button>
                        )}
                        <Link href={profileHref} className="dawa-user-search__link">
                          Profile
                        </Link>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
