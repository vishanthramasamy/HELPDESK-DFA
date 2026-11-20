export const STATES = Object.freeze(['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'CANCELLED']);
export const INPUTS = Object.freeze(['ASSIGN', 'START', 'REASSIGN', 'RESOLVE', 'REOPEN', 'CLOSE', 'CANCEL', 'UNASSIGN']);
export const FINAL_STATES = Object.freeze(['CLOSED', 'CANCELLED']);

// This table is the single source of truth for ticket lifecycle changes.
export const TRANSITIONS = Object.freeze({
  OPEN: Object.freeze({ ASSIGN: 'ASSIGNED', CANCEL: 'CANCELLED' }),
  ASSIGNED: Object.freeze({ START: 'IN_PROGRESS', UNASSIGN: 'OPEN', REASSIGN: 'ASSIGNED' }),
  IN_PROGRESS: Object.freeze({ REASSIGN: 'ASSIGNED', RESOLVE: 'RESOLVED' }),
  RESOLVED: Object.freeze({ REOPEN: 'IN_PROGRESS', CLOSE: 'CLOSED' }),
  CLOSED: Object.freeze({}),
  CANCELLED: Object.freeze({})
});

export function transition(currentState, inputSymbol) {
  if (!STATES.includes(currentState)) return { valid: false, nextState: null, error: `Unknown ticket state: ${currentState}` };
  if (!INPUTS.includes(inputSymbol)) return { valid: false, nextState: null, error: `Unknown action: ${inputSymbol}` };
  const nextState = TRANSITIONS[currentState][inputSymbol];
  if (!nextState) return { valid: false, nextState: null, error: `Action ${inputSymbol} is not allowed from ${currentState}.` };
  return { valid: true, currentState, inputSymbol, nextState, accepted: FINAL_STATES.includes(nextState) };
}
