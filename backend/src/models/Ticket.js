import mongoose from 'mongoose';
import { STATES } from '../dfa/ticketDFA.js';

const ticketSchema = new mongoose.Schema({
  ticketId: { type: String, required: true, unique: true, index: true },
  title: { type: String, required: true, trim: true, minlength: 4, maxlength: 120 },
  description: { type: String, required: true, trim: true, minlength: 8, maxlength: 6000 },
  category: { type: String, enum: ['Account', 'Hardware', 'Software', 'Network', 'Other'], default: 'Other' },
  priority: { type: String, enum: ['Low', 'Medium', 'High', 'Urgent'], default: 'Medium', index: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  currentState: { type: String, enum: STATES, default: 'OPEN', index: true }
}, { timestamps: true });

ticketSchema.index({ currentState: 1, priority: 1, updatedAt: -1 });
export default mongoose.model('Ticket', ticketSchema);
