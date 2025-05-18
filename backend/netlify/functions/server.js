const serverless = require('serverless-http');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();
const authRoutes = require('./routes/auth');
const audioRoutes = require('./routes/audio');
const summaryRoutes = require('./routes/summary');
const app = express();

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

 let isConnected = false;
 const connectWithRetry = async () => {
   if (!isConnected) {
     try {
       await mongoose.connect(process.env.MONGODB_URI, {
         useNewUrlParser: true,
         useUnifiedTopology: true,
         serverSelectionTimeoutMS: 5000,
       });
       isConnected = true;
       console.log('MongoDB connected');
     } catch (err) {
       console.error('MongoDB error:', err);
       setTimeout(connectWithRetry, 5000);
     }
   }
 };
 connectWithRetry();

// ===== Routes =====
app.use('/api', authRoutes);
app.use('/api', audioRoutes);
app.use('/api', summaryRoutes);


module.exports.app = app;

if (process.env.NODE_ENV === 'development') {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`server running at http://localhost:${PORT}`);
  });
} else {
  module.exports.handler = serverless(app);
}
