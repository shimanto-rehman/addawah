'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { loadCities, searchCities, type City } from '@/lib/city-dataset';
import type { ResolvedLocation } from '@/lib/location';

type GeoStatus = 'idle' | 'loading' | 'success' | 'error';

type LocationPickerProps = {
  open: boolean;
  onClose: () => void;
  /** Called with the resolved location. The parent decides persistence. */
  onConfirm: (location: ResolvedLocation) => void | Promise<void>;
  /** Optional initial value to show as the current selection. */
  initial?: Partial<ResolvedLocation>;
  /** Hide the geolocation button (e.g. on insecure origins where it can't work). */
  hideGeolocation?: boolean;
};

export function LocationPicker({
  open,
  onClose,
  onConfirm,
  initial,
  hideGeolocation,
}: LocationPickerProps) {
  const [cities, setCities] = useState<City[] | null>(null);
  const [datasetError, setDatasetError] = useState(false);
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [activeIndex, setActiveIndex] = useState(-1);
  const [selected, setSelected] = useState<City | null>(null);
  const [geoStatus, setGeoStatus] = useState<GeoStatus>('idle');
  const [geoMessage, setGeoMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const listboxId = 'dawa-location-results';
  const inputRef = useRef<HTMLInputElement>(null);

  // Lazy-load the city dataset the first time the picker opens.
  useEffect(() => {
    if (!open || cities || datasetError) return;
    let cancelled = false;
    loadCities()
      .then((rows) => {
        if (!cancelled) setCities(rows);
      })
      .catch(() => {
        if (!cancelled) setDatasetError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [open, cities, datasetError]);

  // Focus the search input shortly after opening.
  useEffect(() => {
    if (open) {
      const t = setTimeout(() => inputRef.current?.focus(), 60);
      return () => clearTimeout(t);
    }
    // Reset transient state on close.
    setQuery('');
    setDebounced('');
    setActiveIndex(-1);
    setSelected(null);
    setGeoStatus('idle');
    setGeoMessage('');
  }, [open]);

  // Debounce the query so we don't filter 10k rows on every keystroke.
  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 120);
    return () => clearTimeout(t);
  }, [query]);

  const results = useMemo(
    () => (cities && debounced ? searchCities(cities, debounced) : []),
    [cities, debounced],
  );

  // Clamp active index when the result set changes.
  useEffect(() => {
    setActiveIndex(results.length > 0 ? 0 : -1);
  }, [results]);

  const reverseGeocode = useCallback(
    async (lat: number, lng: number): Promise<{ city: string; country: string; countryCode: string }> => {
      // BigDataCloud's free reverse-geocoder — no API key, generous quota.
      const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('reverse-geocode failed');
      const data = (await res.json()) as {
        city?: string;
        locality?: string;
        principalSubdivision?: string;
        countryName?: string;
        countryCode?: string;
      };
      const city = data.city || data.locality || data.principalSubdivision || 'Unknown area';
      const country = data.countryName || '';
      const countryCode = (data.countryCode || '').toUpperCase();
      return { city, country, countryCode };
    },
    [],
  );

  const handleGeolocate = useCallback(() => {
    if (typeof window === 'undefined' || !('geolocation' in navigator) || !window.isSecureContext) {
      setGeoStatus('error');
      setGeoMessage('Geolocation needs a secure (HTTPS) connection. Use search instead.');
      return;
    }
    setGeoStatus('loading');
    setGeoMessage('Detecting your location…');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        let labels: { city: string; country: string; countryCode: string };
        try {
          labels = await reverseGeocode(latitude, longitude);
        } catch {
          labels = { city: 'Current location', country: '', countryCode: '' };
        }
        const tz =
          Intl.DateTimeFormat().resolvedOptions().timeZone ||
          (initial?.timeZone ?? '');
        setSelected({
          id: 'geo',
          name: labels.city,
          asciiName: labels.city,
          latitude,
          longitude,
          countryCode: labels.countryCode,
          countryName: labels.country || labels.countryCode || 'Unknown',
          timeZone: tz,
        });
        setGeoStatus('success');
        setGeoMessage(
          accuracy > 5000
            ? `Detected ±${Math.round(accuracy / 1000)}km — confirm or search for accuracy.`
            : `Detected ${labels.city}${labels.country ? ', ' + labels.country : ''}`,
        );
      },
      (err) => {
        setGeoStatus('error');
        setGeoMessage(
          err.code === err.PERMISSION_DENIED
            ? 'Permission denied. Search for your city instead.'
            : 'Could not detect location. Search for your city.',
        );
      },
      { enableHighAccuracy: true, timeout: 12_000, maximumAge: 60_000 },
    );
  }, [reverseGeocode, initial?.timeZone]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (results.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % results.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => (i - 1 + results.length) % results.length);
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault();
      setSelected(results[activeIndex]);
      setQuery('');
    }
  };

  const handleConfirm = async () => {
    if (!selected) return;
    const resolved: ResolvedLocation = {
      latitude: selected.latitude,
      longitude: selected.longitude,
      timeZone: selected.timeZone,
      city: selected.name,
      country: selected.countryName,
      countryCode: selected.countryCode,
    };
    setSubmitting(true);
    try {
      await onConfirm(resolved);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  const canConfirm = selected !== null && !submitting;
  const showResults = debounced.length >= 2 && cities !== null;

  return (
    <Modal open={open} onClose={onClose} panelClassName="dawa-location__panel" labelledBy="dawa-location-title">
      <div className="dawa-location__head">
        <div className="dawa-location__icon" aria-hidden>
          <PinIcon />
        </div>
        <div>
          <h2 className="dawa-location__title" id="dawa-location-title">
            Set your location
          </h2>
          <p className="dawa-location__subtitle">
            Accurate prayer times need your coordinates. We use them only to compute salah.
          </p>
        </div>
      </div>

      {!hideGeolocation && (
        <>
          <button
            type="button"
            className="dawa-btn dawa-btn--primary dawa-location__geo-btn"
            onClick={handleGeolocate}
            disabled={geoStatus === 'loading' || submitting}
          >
            {geoStatus === 'loading' ? 'Detecting…' : 'Use my current location'}
          </button>
          {geoStatus !== 'idle' && (
            <p className="dawa-location__geo-status" data-tone={geoStatus === 'error' ? 'error' : 'success'}>
              {geoStatus === 'loading' && <span className="dawa-location__geo-dot" />}
              {geoMessage}
            </p>
          )}
        </>
      )}

      <div className="dawa-location__divider">or search</div>

      <div className="dawa-location__search">
        <input
          ref={inputRef}
          type="text"
          className="dawa-input"
          placeholder="Search city — e.g. Dhaka, London, Istanbul"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          role="combobox"
          aria-expanded={showResults}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={activeIndex >= 0 ? `${listboxId}-opt-${activeIndex}` : undefined}
          autoComplete="off"
          spellCheck={false}
        />

        {showResults && (
          <div className="dawa-location__results" id={listboxId} role="listbox">
            {datasetError ? (
              <div className="dawa-location__state" data-tone="error">
                Couldn&apos;t load the city list. Try geolocation or reload.
              </div>
            ) : !cities ? (
              <div className="dawa-location__state">
                <div className="dawa-location__spinner" />
                Loading cities…
              </div>
            ) : results.length === 0 ? (
              <div className="dawa-location__state">No matches for &ldquo;{debounced}&rdquo;.</div>
            ) : (
              results.map((city, i) => (
                <button
                  key={city.id}
                  id={`${listboxId}-opt-${i}`}
                  type="button"
                  role="option"
                  aria-selected={i === activeIndex}
                  className="dawa-location__result"
                  onClick={() => {
                    setSelected(city);
                    setQuery('');
                  }}
                  onMouseEnter={() => setActiveIndex(i)}
                >
                  <span className="dawa-location__result-pin" aria-hidden>
                    <PinIcon />
                  </span>
                  <span className="dawa-location__result-text">
                    <span className="dawa-location__result-name">{city.name}</span>
                    <span className="dawa-location__result-country">{city.countryName}</span>
                  </span>
                  <span className="dawa-location__result-tz">
                    {city.timeZone.split('/').pop()?.replace(/_/g, ' ')}
                  </span>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {selected && (
        <div className="dawa-location__selected">
          <span className="dawa-location__result-pin" aria-hidden>
            <PinIcon />
          </span>
          <span>
            <span className="dawa-location__selected-name">{selected.name}</span>
            <span className="dawa-location__selected-meta">
              {' '}
              · {selected.countryName} · {selected.timeZone}
            </span>
          </span>
        </div>
      )}

      <div className="dawa-location__actions">
        <button type="button" className="dawa-btn dawa-btn--outline" onClick={onClose} disabled={submitting}>
          Cancel
        </button>
        <button
          type="button"
          className="dawa-btn dawa-btn--primary"
          onClick={handleConfirm}
          disabled={!canConfirm}
        >
          {submitting ? 'Saving…' : 'Confirm location'}
        </button>
      </div>
    </Modal>
  );
}

function PinIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden focusable={false}>
      <path
        d="M12 21s-6.5-5.4-6.5-10.4A6.5 6.5 0 0 1 12 4a6.5 6.5 0 0 1 6.5 6.6c0 5-6.5 10.4-6.5 10.4Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="10.5" r="2.4" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}
