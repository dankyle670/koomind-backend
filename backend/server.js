const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

// Routes
const authRoutes = require('./routes/auth');
const audioRoutes = require('./routes/audio');
const summaryRoutes = require('./routes/summary');
const taskRoutes = require('./routes/task');

const app = express();

// CORS Configuration pour autoriser ton frontend déployé
app.use(cors({
  origin: ['https://koomind-frontend.onrender.com', 'http://localhost:3000'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB connected'))
  .catch((err) => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

// Routes
app.use('/api', authRoutes);
app.use('/api', audioRoutes);
app.use('/api', summaryRoutes);
app.use('/api', taskRoutes);

// Launch server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
