import mongoose from 'mongoose';

const historySchema = new mongoose.Schema({
  ticket: { type: mongoose.Schema.Types.ObjectId, ref: 'Ticket', required: true, index: true },
  previousState: { type: String, default: null },
  inputSymbol: { type: String, required: true },
  nextState: { type: String, required: true },
  performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  accepted: { type: Boolean, default: true },
  note: { type: String, trim: true, maxlength: 500 },
  timestamp: { type: Date, default: Date.now, index: true }
});

export default mongoose.model('TicketHistory', historySchema);
