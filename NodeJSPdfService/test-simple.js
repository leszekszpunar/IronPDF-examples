import express from 'express';

const app = express();
const port = 3001;

app.get('/', (req, res) => {
  res.json({ message: 'Simple test server running' });
});

app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Simple test server running on port ${port}`);
});
