import express from 'express';
import path from 'path';

const app = express();
const PORT = 3000;

// Serve all static files from the current directory
app.use(express.static(process.cwd()));

// Fallback to index.html for SPA routing
app.get('*', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
