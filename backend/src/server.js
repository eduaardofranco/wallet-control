import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import assetRoutes from './routes/assets.js';
import dividendRoutes from './routes/dividends.js';
import dashboardRoutes from './routes/dashboard.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/assets', assetRoutes);
app.use('/api/dividends', dividendRoutes);
app.use('/api/dashboard', dashboardRoutes);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
