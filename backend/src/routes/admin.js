import { Router } from 'express';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import Ticket from '../models/Ticket.js';
import AuditLog from '../models/AuditLog.js';
import { authenticate, allowRoles } from '../middleware/auth.js';

const router = Router();
router.use(authenticate, allowRoles('ADMIN'));
router.get('/users', async (_req, res, next) => {
  try { res.json({ users: await User.find().select('name email role active createdAt').sort({ createdAt: -1 }).limit(500) }); }
  catch (error) { next(error); }
});
router.post('/agents', async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    if (!name?.trim() || !/^\S+@\S+\.\S+$/.test(email || '') || !password || password.length < 8) return res.status(400).json({ error: 'Enter agent name, valid email, and password of at least 8 characters.' });
    const user = await User.create({ name, email, password: await bcrypt.hash(password, 12), role: 'AGENT' });
    res.status(201).json({ user: { id: user._id, name: user.name, email: user.email, role: user.role, active: user.active } });
  } catch (error) { next(error); }
});
router.patch('/users/:id/active', async (req, res, next) => {
  try {
    if (req.user._id.equals(req.params.id)) return res.status(400).json({ error: 'You cannot deactivate your own account.' });
    const user = await User.findByIdAndUpdate(req.params.id, { active: Boolean(req.body.active) }, { new: true }).select('name email role active');
    if (!user) return res.status(404).json({ error: 'User not found.' });
    res.json({ user });
  } catch (error) { next(error); }
});
router.patch('/tickets/:id/priority', async (req, res, next) => {
  try {
    if (!['Low', 'Medium', 'High', 'Urgent'].includes(req.body.priority)) return res.status(400).json({ error: 'Invalid priority.' });
    const ticket = await Ticket.findByIdAndUpdate(req.params.id, { priority: req.body.priority }, { new: true, runValidators: true }).populate('createdBy', 'name email role').populate('assignedTo', 'name email role');
    if (!ticket) return res.status(404).json({ error: 'Ticket not found.' });
    res.json({ ticket });
  } catch (error) { next(error); }
});
router.get('/audit', async (_req, res, next) => {
  try { res.json({ logs: await AuditLog.find().sort({ timestamp: -1 }).limit(250).populate('attemptedBy', 'name email role') }); }
  catch (error) { next(error); }
});
export default router;
