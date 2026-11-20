import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { connectDatabase } from './config/database.js';
import User from './models/User.js';

const demoUsers = [
  { name: 'Helpdesk Admin', email: 'admin@helpdesk.local', role: 'ADMIN', password: 'Helpdesk123!' },
  { name: 'Alex Morgan', email: 'agent@helpdesk.local', role: 'AGENT', password: 'Helpdesk123!' },
  { name: 'Taylor Reed', email: 'user@helpdesk.local', role: 'USER', password: 'Helpdesk123!' }
];

try {
  await connectDatabase();
  for (const demo of demoUsers) {
    const existing = await User.findOne({ email: demo.email });
    if (!existing) await User.create({ ...demo, password: await bcrypt.hash(demo.password, 12) });
  }
  console.log('Demo accounts are ready (existing accounts were left unchanged).');
  await process.exit(0);
} catch (error) {
  console.error(`Seed failed: ${error.message}`);
  process.exit(1);
}
