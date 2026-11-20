import { Router } from 'express';
import Ticket from '../models/Ticket.js';
import { authenticate } from '../middleware/auth.js';
import { STATES } from '../dfa/ticketDFA.js';

const router = Router();
router.use(authenticate);
router.get('/stats', async (req, res, next) => {
  try {
    const filter = req.user.role === 'ADMIN' ? {} : req.user.role === 'AGENT' ? { assignedTo: req.user._id } : { createdBy: req.user._id };
    const [total, grouped, urgent] = await Promise.all([
      Ticket.countDocuments(filter),
      Ticket.aggregate([{ $match: filter }, { $group: { _id: '$currentState', count: { $sum: 1 } } }]),
      Ticket.countDocuments({ ...filter, priority: { $in: ['High', 'Urgent'] } })
    ]);
    const byState = Object.fromEntries(STATES.map((state) => [state, 0]));
    grouped.forEach(({ _id, count }) => { byState[_id] = count; });
    res.json({ stats: { total, byState, highPriority: urgent } });
  } catch (error) { next(error); }
});
export default router;
