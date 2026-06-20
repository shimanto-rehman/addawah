export function chartTheme() {
  if (typeof window === 'undefined') {
    return {
      accent: '#e8c547',
      accentSoft: 'rgba(201, 162, 39, 0.12)',
      accentGlow: 'rgba(201, 162, 39, 0.35)',
      surface: '#121824',
      text: '#8a8070',
      grid: 'rgba(128, 128, 128, 0.14)',
      success: '#3ecf8e',
      warn: '#e8b923',
      danger: '#e05252',
    };
  }
  const s = getComputedStyle(document.documentElement);
  return {
    accent: s.getPropertyValue('--accent-bright').trim() || '#e8c547',
    accentSoft: s.getPropertyValue('--accent-soft').trim() || 'rgba(201, 162, 39, 0.12)',
    accentGlow: s.getPropertyValue('--accent-glow').trim() || 'rgba(201, 162, 39, 0.35)',
    surface: s.getPropertyValue('--surface-2').trim() || '#121824',
    text: s.getPropertyValue('--text-dim').trim() || '#8a8070',
    grid: 'rgba(128, 128, 128, 0.14)',
    success: s.getPropertyValue('--success').trim() || '#3ecf8e',
    warn: '#e8b923',
    danger: s.getPropertyValue('--danger').trim() || '#e05252',
  };
}
