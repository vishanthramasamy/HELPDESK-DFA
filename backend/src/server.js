import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import { connectDatabase } from './config/database.js';

const app = express();
const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173').split(',').map(value => value.trim());
app.use(cors({ origin(origin, callback) { if (!origin || allowedOrigins.includes(origin)) return callback(null, true); return callback(new Error('Origin is not allowed by CORS')); } }));
app.use(express.json({ limit: '1mb' }));
app.get('/api/health', (_req, res) => res.status(200).json({ status: 'ok', database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected', timestamp: new Date().toISOString() }));
app.get('/', (_req, res) => res.json({ service: 'Helpdesk API', health: '/api/health' }));
app.use((err, _req, res, _next) => { console.error(err.message); res.status(err.message.includes('CORS') ? 403 : 500).json({ error: 'Request failed' }); });

const port = Number(process.env.PORT) || 5000;
try {
  await connectDatabase();
  app.listen(port, '0.0.0.0', () => console.log(`API listening on ${port}`));
} catch (error) {
  console.error(`Startup failed: ${error.message}`);
  process.exit(1);
}
