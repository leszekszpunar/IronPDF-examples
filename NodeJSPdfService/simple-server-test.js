import express from 'express';

const app = express();
const port = 3000;

app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    message: 'Simple test server is running'
  });
});

app.listen(port, () => {
  console.log(`🚀 Simple test server running on http://localhost:${port}`);
  console.log(`🏥 Health check: http://localhost:${port}/health`);
}).on('error', (err) => {
  console.error('❌ Server failed to start:', err);
  process.exit(1);
});
