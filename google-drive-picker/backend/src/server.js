const express = require('express');
const cors = require('cors');
const oauthRoutes = require('./routes/oauth');
const driveRoutes = require('./routes/drive');

const app = express();

app.use(cors({
  origin: ['http://localhost:8081', 'http://localhost:19006'],
  credentials: true,
}));

app.use(express.json());

// Routes
app.use('/api/oauth', oauthRoutes);
app.use('/api/drive', driveRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🚀 Google Drive Backend Server`);
  console.log(`📡 Running on: http://localhost:${PORT}`);
  console.log(`✅ Ready!\n`);
});