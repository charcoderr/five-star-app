// 5StarX Brand Colours
export const colours = {
  gold: '#C9A84C',
  goldLight: '#D4B96A',
  goldDark: '#A8863A',
  charcoal: '#666B6F',
  charcoalDark: '#2C2C2E',
  charcoalLight: '#8A8F94',
  black: '#1A1A1A',
  white: '#FFFFFF',
  offWhite: '#F8F8F6',
  border: '#E0E0E0',
  error: '#D94F4F',
  success: '#4CAF50',
  textPrimary: '#1A1A1A',
  textSecondary: '#666B6F',
  textMuted: '#9E9E9E',

  // Score colours (Poor → Excellent)
  scorePoor: '#D94F4F',
  scoreFair: '#F5A623',
  scoreGood: '#4CAF50',
  scoreExcellent: '#C9A84C',
};

// Scoring system (matches Buck's Bar proforma 0–3)
export const SCORE_LABELS = ['Poor', 'Fair', 'Good', 'Excellent'] as const;
export type ScoreLabel = typeof SCORE_LABELS[number];
export const SCORE_VALUES: Record<ScoreLabel, number> = {
  Poor: 0,
  Fair: 1,
  Good: 2,
  Excellent: 3,
};
