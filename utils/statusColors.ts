import { colours } from './theme';

export interface StatusConfig {
  label: string;
  colour: string;
}

export const USER_STATUS: Record<string, StatusConfig> = {
  active:             { label: 'Active',   colour: colours.scoreGood },
  pending_approval:   { label: 'Pending',  colour: colours.scoreFair },
  suspended:          { label: 'Suspended', colour: colours.error },
};

export const SUBSCRIPTION_STATUS: Record<string, StatusConfig> = {
  active:   { label: 'Active',   colour: colours.scoreGood },
  trial:    { label: 'Trial',    colour: colours.scoreFair },
  inactive: { label: 'Inactive', colour: colours.error },
};

export const SLOT_STATUS: Record<string, StatusConfig> = {
  open:      { label: 'Open',      colour: colours.gold },
  claimed:   { label: 'Claimed',   colour: colours.scoreFair },
  completed: { label: 'Completed', colour: colours.scoreGood },
  cancelled: { label: 'Cancelled', colour: colours.textMuted },
};

export const ASSIGNMENT_STATUS: Record<string, StatusConfig> = {
  pending:   { label: 'Pending',   colour: colours.scoreFair },
  confirmed: { label: 'Confirmed', colour: colours.gold },
  completed: { label: 'Completed', colour: colours.scoreGood },
  cancelled: { label: 'Cancelled', colour: colours.textMuted },
};

export const REPORT_STATUS: Record<string, StatusConfig> = {
  draft:     { label: 'Draft',     colour: colours.textMuted },
  submitted: { label: 'Submitted', colour: colours.scoreFair },
  reviewed:  { label: 'Reviewed',  colour: colours.scoreGood },
};

export const VOUCHER_STATUS: Record<string, StatusConfig> = {
  issued:   { label: 'Issued',   colour: colours.gold },
  redeemed: { label: 'Redeemed', colour: colours.scoreGood },
  expired:  { label: 'Expired',  colour: colours.textMuted },
};

export const NOTE_TYPE: Record<string, StatusConfig> = {
  general:     { label: 'General',     colour: colours.charcoal },
  admin:       { label: 'Admin only',  colour: colours.gold },
  commercial:  { label: 'Commercial',  colour: colours.scoreGood },
  performance: { label: 'Performance', colour: colours.scoreFair },
};

export function getStatus(
  map: Record<string, StatusConfig>,
  key: string | null | undefined,
  fallback: StatusConfig = { label: '—', colour: colours.textMuted },
): StatusConfig {
  if (!key) return fallback;
  return map[key] ?? fallback;
}
