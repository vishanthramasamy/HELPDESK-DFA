import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { STATES, INPUTS, FINAL_STATES, TRANSITIONS, transition } from '../dfa/ticketDFA.js';

const router = Router();
router.use(authenticate);
router.get('/definition', (_req, res) => res.json({ definition: { states: STATES, alphabet: INPUTS, initialState: 'OPEN', finalStates: FINAL_STATES, transitions: TRANSITIONS } }));
router.get('/transition-table', (_req, res) => res.json({ states: STATES, inputs: INPUTS, finalStates: FINAL_STATES, transitions: TRANSITIONS }));
router.post('/simulate', (req, res) => {
  const start = req.body.initialState || 'OPEN';
  const sequence = Array.isArray(req.body.sequence) ? req.body.sequence : [];
  if (!STATES.includes(start)) return res.status(400).json({ error: 'Choose a valid initial state.' });
  if (sequence.length > 50) return res.status(400).json({ error: 'Simulation is limited to 50 symbols.' });
  const path = [start]; let current = start;
  for (let index = 0; index < sequence.length; index += 1) {
    const result = transition(current, String(sequence[index]).toUpperCase());
    if (!result.valid) return res.json({ accepted: false, path, failedAt: index, error: result.error, currentState: current, inputSymbol: sequence[index] });
    current = result.nextState; path.push(current);
  }
  res.json({ accepted: FINAL_STATES.includes(current), path, currentState: current, finalState: FINAL_STATES.includes(current) });
});
export default router;
