import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema({
  ticket: { type: mongoose.Schema.Types.ObjectId, ref: 'Ticket', default: null, index: true },
  ticketId: { type: String, default: null },
  attemptedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  attemptedAction: { type: String, required: true },
  currentState: { type: String, default: null },
  result: { type: String, enum: ['REJECTED', 'ACCEPTED'], required: true },
  reason: { type: String, default: '' },
  timestamp: { type: Date, default: Date.now, index: true }
});

export default mongoose.model('AuditLog', auditLogSchema);
