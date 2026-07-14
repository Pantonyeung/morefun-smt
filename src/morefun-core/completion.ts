import type { OrderMode, PendingIssue } from '../domain/types';

export type CompletionState = 'complete' | 'pending_allowed' | 'blocking_invalid' | 'reminder_only';

const BLOCKING_KINDS = new Set<PendingIssue['kind']>([
  'sold_out',
  'price_version',
  'invalid_product',
]);

export function classifyCompletion(issues: PendingIssue[], mode: OrderMode = 'takeaway'): CompletionState {
  if (!issues.length) return 'complete';
  if (issues.some((issue) => issue.severity === 'blocking' || BLOCKING_KINDS.has(issue.kind))) {
    return 'blocking_invalid';
  }
  if (mode === 'dinein' && issues.every((issue) => issue.kind === 'drink')) {
    return 'reminder_only';
  }
  return 'pending_allowed';
}

export function canAddToCart(issues: PendingIssue[], mode: OrderMode = 'takeaway'): boolean {
  return classifyCompletion(issues, mode) !== 'blocking_invalid';
}

export function canSubmitOrder(issues: PendingIssue[], mode: OrderMode = 'takeaway'): boolean {
  const state = classifyCompletion(issues, mode);
  return state === 'complete' || state === 'reminder_only';
}
