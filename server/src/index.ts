import 'dotenv/config';
import http from 'http';
import express from 'express';
import cors from 'cors';
import { initSocket } from './socket';
import authRouter from './routes/auth';
import bondsRouter from './routes/bonds';
import tradesRouter from './routes/trades';
import portfolioRouter from './routes/portfolio';
import reportsRouter from './routes/reports';

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/auth', authRouter);
app.use('/api/bonds', bondsRouter);
app.use('/api/trades', tradesRouter);
app.use('/api/portfolio', portfolioRouter);
app.use('/api/reports', reportsRouter);

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

const httpServer = http.createServer(app);
initSocket(httpServer);

const PORT = process.env.PORT ?? 4000;
httpServer.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
