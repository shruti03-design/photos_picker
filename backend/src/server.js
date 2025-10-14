const express = require('express');
const cors = require('cors');
const oauthRoutes = require('./routes/oauth');
const pickerRoutes = require('./routes/picker');

console.log('🚀 [Server] Starting Google Photos Picker Backend');

const app = express();

// CRITICAL: CORS must be configured BEFORE routes
console.log('🔧 [Server] Configuring CORS...');
app.use(cors({
  origin: ['http://localhost:8081', 'http://localhost:19006'], // Expo web ports
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
console.log('✅ [Server] CORS enabled for: localhost:8081, localhost:19006');

// Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`\n📥 [Server] ${timestamp}`);
  console.log(`   Method: ${req.method}`);
  console.log(`   Path: ${req.path}`);
  console.log(`   Origin: ${req.get('origin') || 'No origin'}`);
  if (Object.keys(req.query).length > 0) {
    console.log('   Query:', req.query);
  }
  next();
});

// Routes
console.log('🛣️ [Server] Registering routes...');
app.use('/api/oauth', oauthRoutes);
app.use('/api/picker', pickerRoutes);
console.log('✅ [Server] Routes registered');

// Health check
app.get('/health', (req, res) => {
  console.log('💓 [Server] Health check');
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    cors: 'enabled'
  });
});

// 404 handler
app.use((req, res) => {
  console.log('⚠️ [Server] 404:', req.method, req.path);
  res.status(404).json({ error: 'Not found', path: req.path });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('❌ [Server] Error:', err.message);
  console.error('❌ [Server] Stack:', err.stack);
  res.status(500).json({ 
    error: 'Internal server error',
    message: err.message 
  });
});

// Start server
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log('\n┌─────────────────────────────────────────────────┐');
  console.log('│   🚀 Google Photos Picker Backend Server       │');
  console.log('└─────────────────────────────────────────────────┘');
  console.log(`\n📡 Server running on:`);
  console.log(`   - http://localhost:${PORT}`);
  console.log(`   - http://127.0.0.1:${PORT}`);
  console.log(`   - http://0.0.0.0:${PORT}`);
  console.log('\n✅ CORS enabled for:');
  console.log('   - http://localhost:8081');
  console.log('   - http://localhost:19006');
  console.log('\n📍 Available endpoints:');
  console.log('   GET  /health');
  console.log('   GET  /api/oauth/url');
  console.log('   GET  /api/oauth/callback');
  console.log('   GET  /api/oauth/verify');
  console.log('   GET  /api/picker/session');
  console.log('   GET  /api/picker/poll');
  console.log('   GET  /api/picker/result');
  console.log('\n🧪 Test with:');
  console.log(`   curl http://localhost:${PORT}/health`);
  console.log('\n✅ Server is ready!\n');
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use!`);
    console.error('   Try: kill -9 $(lsof -ti:3000)');
  } else {
    console.error('❌ Server error:', error);
  }
  process.exit(1);
});

process.on('SIGTERM', () => {
  console.log('\n👋 [Server] Shutting down gracefully...');
  server.close(() => {
    console.log('✅ [Server] Server closed');
    process.exit(0);
  });
});