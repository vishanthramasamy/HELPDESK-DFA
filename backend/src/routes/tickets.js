import { Router } from 'express';
import mongoose from 'mongoose';
import Ticket from '../models/Ticket.js';
import TicketHistory from '../models/TicketHistory.js';
import AuditLog from '../models/AuditLog.js';
import Comment from '../models/Comment.js';
import User from '../models/User.js';
import { authenticate, allowRoles } from '../middleware/auth.js';
import { STATES, INPUTS, TRANSITIONS, transition } from '../dfa/ticketDFA.js';

const router = Router();
router.use(authenticate);
const refs = 'name email role';
const visibleTo = (user) => user.role === 'ADMIN' ? {} : user.role === 'AGENT' ? { assignedTo: user._id } : { createdBy: user._id };
const ticketNumber = () => `HD-${new Date().getFullYear()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
const canSee = (ticket, user) => user.role === 'ADMIN' || ticket.createdBy._id?.equals?.(user._id) || ticket.createdBy.equals?.(user._id) || ticket.assignedTo?._id?.equals?.(user._id) || ticket.assignedTo?.equals?.(user._id);

router.get('/', async (req, res, next) => {
  try {
    const filter = { ...visibleTo(req.user) };
    if (req.query.state && STATES.includes(req.query.state)) filter.currentState = req.query.state;
    if (req.query.priority) filter.priority = req.query.priority;
    if (req.query.q) filter.$or = [
      { title: { $regex: req.query.q, $options: 'i' } },
      { ticketId: { $regex: req.query.q, $options: 'i' } },
      { description: { $regex: req.query.q, $options: 'i' } }
    ];
    const tickets = await Ticket.find(filter).sort({ updatedAt: -1 }).populate('createdBy', refs).populate('assignedTo', refs).limit(250);
    res.json({ tickets });
  } catch (error) { next(error); }
});

router.post('/', allowRoles('USER', 'ADMIN'), async (req, res, next) => {
  try {
    const { title, description, category, priority } = req.body;
    if (!title?.trim() || title.trim().length < 4 || !description?.trim() || description.trim().length < 8) {
      return res.status(400).json({ error: 'Add a title (at least 4 characters) and a clear description (at least 8 characters).' });
    }
    const ticket = await Ticket.create({ ticketId: ticketNumber(), title, description, category, priority, createdBy: req.user._id });
    await TicketHistory.create({ ticket: ticket._id, previousState: null, inputSymbol: 'CREATE', nextState: 'OPEN', performedBy: req.user._id, note: 'Ticket created' });
    await ticket.populate('createdBy', refs);
    res.status(201).json({ ticket });
  } catch (error) { next(error); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const ticket = await Ticket.findById(req.params.id).populate('createdBy', refs).populate('assignedTo', refs);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found.' });
    if (!canSee(ticket, req.user)) return res.status(403).json({ error: 'This ticket is not assigned to or owned by your account.' });
    const [history, comments] = await Promise.all([
      TicketHistory.find({ ticket: ticket._id }).sort({ timestamp: 1 }).populate('performedBy', refs),
      Comment.find({ ticket: ticket._id }).sort({ createdAt: 1 }).populate('user', refs)
    ]);
    res.json({ ticket, history, comments });
  } catch (error) { next(error); }
});

async function recordRejected(ticket, user, symbol, reason) {
  await AuditLog.create({ ticket: ticket?._id || null, ticketId: ticket?.ticketId || null, attemptedBy: user._id, attemptedAction: symbol, currentState: ticket?.currentState || null, result: 'REJECTED', reason });
}

router.patch('/:id/transition', async (req, res, next) => {
  const { action, note = '' } = req.body;
  try {
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found.' });
    const dfa = transition(ticket.currentState, action);
    let reason = dfa.error;
    if (dfa.valid) {
      const allowed = req.user.role === 'ADMIN'
        || (action === 'CANCEL' && req.user.role === 'USER' && ticket.createdBy.equals(req.user._id))
        || (['START', 'RESOLVE', 'REOPEN'].includes(action) && req.user.role === 'AGENT' && ticket.assignedTo?.equals(req.user._id))
        || (action === 'REOPEN' && req.user.role === 'USER' && ticket.createdBy.equals(req.user._id));
      if (!allowed) reason = 'Your role or ticket ownership does not allow this action.';
    }
    if (!dfa.valid || reason) {
      await recordRejected(ticket, req.user, action || 'UNKNOWN', reason);
      return res.status(409).json({ error: reason || 'Transition rejected.', transition: { currentState: ticket.currentState, inputSymbol: action, nextState: null, accepted: false } });
    }

    const session = await mongoose.startSession();
    let updated;
    try {
      await session.withTransaction(async () => {
        updated = await Ticket.findByIdAndUpdate(ticket._id, { currentState: dfa.nextState }, { new: true, runValidators: true, session });
        await TicketHistory.create([{ ticket: ticket._id, previousState: ticket.currentState, inputSymbol: action, nextState: dfa.nextState, performedBy: req.user._id, accepted: true, note }], { session });
      });
    } finally { await session.endSession(); }
    await updated.populate('createdBy', refs); await updated.populate('assignedTo', refs);
    res.json({ ticket: updated, transition: { ...dfa, accepted: true } });
  } catch (error) { next(error); }
});

router.patch('/:id/assign', allowRoles('ADMIN'), async (req, res, next) => {
  try {
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found.' });
    const { agentId } = req.body;
    const symbol = agentId ? (ticket.currentState === 'OPEN' ? 'ASSIGN' : 'REASSIGN') : 'UNASSIGN';
    const dfa = transition(ticket.currentState, symbol);
    if (!dfa.valid) { await recordRejected(ticket, req.user, symbol, dfa.error); return res.status(409).json({ error: dfa.error }); }
    const agent = agentId ? await User.findOne({ _id: agentId, role: 'AGENT', active: true }) : null;
    if (agentId && !agent) return res.status(400).json({ error: 'Choose an active support agent.' });
    const oldState = ticket.currentState;
    ticket.currentState = dfa.nextState;
    ticket.assignedTo = agent?._id || null;
    await ticket.save();
    await TicketHistory.create({ ticket: ticket._id, previousState: oldState, inputSymbol: symbol, nextState: dfa.nextState, performedBy: req.user._id, note: agent ? `Assigned to ${agent.name}` : 'Assignment removed' });
    await ticket.populate('createdBy', refs); await ticket.populate('assignedTo', refs);
    res.json({ ticket, transition: { ...dfa, accepted: true } });
  } catch (error) { next(error); }
});

router.get('/:id/history', async (req, res, next) => {
  try {
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found.' });
    if (!canSee(ticket, req.user)) return res.status(403).json({ error: 'Not allowed.' });
    const history = await TicketHistory.find({ ticket: ticket._id }).sort({ timestamp: 1 }).populate('performedBy', refs);
    res.json({ history });
  } catch (error) { next(error); }
});

router.get('/:id/comments', async (req, res, next) => {
  try {
    const ticket = await Ticket.findById(req.params.id).populate('createdBy').populate('assignedTo');
    if (!ticket) return res.status(404).json({ error: 'Ticket not found.' });
    if (!canSee(ticket, req.user)) return res.status(403).json({ error: 'Not allowed.' });
    const comments = await Comment.find({ ticket: ticket._id }).sort({ createdAt: 1 }).populate('user', refs);
    res.json({ comments });
  } catch (error) { next(error); }
});

router.post('/:id/comments', async (req, res, next) => {
  try {
    const ticket = await Ticket.findById(req.params.id).populate('createdBy').populate('assignedTo');
    if (!ticket) return res.status(404).json({ error: 'Ticket not found.' });
    if (!canSee(ticket, req.user)) return res.status(403).json({ error: 'Not allowed.' });
    if (!req.body.message?.trim()) return res.status(400).json({ error: 'Comment cannot be empty.' });
    const comment = await Comment.create({ ticket: ticket._id, user: req.user._id, message: req.body.message.trim() });
    await comment.populate('user', refs);
    res.status(201).json({ comment });
  } catch (error) { next(error); }
});

export { INPUTS, TRANSITIONS };
export default router;
