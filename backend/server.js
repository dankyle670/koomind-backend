const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();
const http = require('http');
const { Server } = require('socket.io');

// Routes
const authRoutes = require('./routes/auth');
const audioRoutes = require('./routes/audio');
const summaryRoutes = require('./routes/summary');
const taskRoutes = require('./routes/task');
const chatbotRoutes = require('./routes/chatbot');
const textToAudioRoute = require('./routes/textToAudio');
const messengerRoutes = require('./routes/messenger');

const app = express();
const server = http.createServer(app);

// CORS
app.use(cors({
  origin: ['https://koomind-frontend.onrender.com', 'http://localhost:3000'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

// Routes
app.use('/api', authRoutes);
app.use('/api', audioRoutes);
app.use('/api', summaryRoutes);
app.use('/api', taskRoutes);
app.use('/api', chatbotRoutes);
app.use('/api', textToAudioRoute);
app.use('/api/messenger', messengerRoutes);

// --- Route pour récupérer tous les utilisateurs ---
app.get('/api/users', async (req, res) => {
  try {
    const User = require('./models/User');
    const users = await User.find({}, 'name email');
    res.json(users);
  } catch (error) {
    console.error('Erreur users:', error);
    res.status(500).json({ error: error.message });
  }
});

// --- Socket.io ---
const io = new Server(server, {
  cors: {
    origin: ['https://koomind-frontend.onrender.com', 'http://localhost:3000'],
    methods: ['GET', 'POST']
  }
});

// Middleware Socket.io pour vérifier le JWT
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) return next(new Error('Token manquant'));

  const jwt = require('jsonwebtoken');
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return next(new Error('Token invalide'));
    socket.user = user; // sauvegarde l'utilisateur dans socket
    next();
  });
});

io.on('connection', (socket) => {
  console.log(`✅ Utilisateur connecté: ${socket.id} | user: ${socket.user.id}`);

  socket.on('join', (conversationId) => {
    if (conversationId) {
      socket.join(conversationId);
      console.log(`📍 User ${socket.user.id} joined room ${conversationId}`);
    }
  });

  socket.on('message', async (msg) => {
    try {
      const Message = require('./models/Message');
      const Conversation = require('./models/Conversation');

      if (!msg.conversation || !msg.text) {
        return socket.emit('error', { message: 'Données manquantes pour le message' });
      }

      const newMessage = new Message({
        conversation: msg.conversation,
        author: socket.user.id, // <-- utilise le token pour l'auteur
        text: msg.text
      });

      const savedMessage = await newMessage.save();

      // Ajouter le message à la conversation
      const conversation = await Conversation.findById(msg.conversation);
      if (conversation) {
        conversation.messages.push(savedMessage._id);
        await conversation.save();
      }

      const populatedMessage = await Message.findById(savedMessage._id)
        .populate('author', 'name');

      io.to(msg.conversation).emit('message', {
        _id: populatedMessage._id,
        conversation: populatedMessage.conversation,
        author: {
          _id: populatedMessage.author._id,
          name: populatedMessage.author.name
        },
        text: populatedMessage.text,
        createdAt: populatedMessage.createdAt
      });

      console.log('✅ Message émis vers la room:', msg.conversation);

    } catch (err) {
      console.error('❌ Erreur socket message:', err);
      socket.emit('error', { message: 'Erreur lors de l\'envoi du message', error: err.message });
    }
  });

  socket.on('disconnect', () => {
    console.log(`❌ Utilisateur déconnecté: ${socket.user.id}`);
  });
});

// Launch server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
