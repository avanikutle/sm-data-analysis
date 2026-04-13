const express = require('express');
const cors = require('cors');
const fyersRouter = require('./routes/fyers');
const dhanRouter = require('./routes/dhan');

const app = express();
const PORT = 3001;

app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

app.use('/api/fyers', fyersRouter);
app.use('/api/dhan', dhanRouter);

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

app.listen(PORT, () => {
  console.log(`BrokerConnection server running on http://localhost:${PORT}`);
});
