const express = require('express');
const router = express.Router();
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const User = require('../models/User');
const jwt = require('jsonwebtoken');

// Middleware d'authentification
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Token manquant' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Token invalide' });
    }
    req.user = user;
    next();
  });
};

// GET - Récupérer toutes les conversations de l'utilisateur
router.get('/conversations', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    console.log('🔍 Récupération des conversations pour:', userId);

    const conversations = await Conversation.find({
      participants: userId
    })
    .populate('participants', 'name email')
    .sort({ updatedAt: -1 });

    console.log('📋 Conversations trouvées:', conversations.length);
    
    // DEBUG: Afficher les conversations sans messages
    conversations.forEach((conv, index) => {
      console.log(`📁 Conversation ${index + 1}:`, {
        id: conv._id,
        name: conv.name,
        type: conv.type,
        participants: conv.participants.map(p => p.name),
        messagesCount: conv.messages?.length || 0
      });
    });

    // CRUCIAL: Récupérer les messages pour chaque conversation
    const conversationsWithMessages = await Promise.all(
      conversations.map(async (conv) => {
        console.log(`🔄 Récupération des messages pour conversation ${conv._id}`);
        
        const messages = await Message.find({ conversation: conv._id })
          .populate('author', 'name')
          .sort({ createdAt: 1 });
        
        console.log(`📨 Messages trouvés pour ${conv._id}:`, messages.length);
        
        // DEBUG: Afficher chaque message
        messages.forEach((msg, idx) => {
          console.log(`  Message ${idx + 1}:`, {
            id: msg._id,
            author: msg.author?.name,
            text: msg.text.substring(0, 50) + '...',
            date: msg.createdAt
          });
        });
        
        const result = {
          ...conv.toObject(),
          messages: messages.map(msg => ({
            _id: msg._id,
            conversation: msg.conversation,
            author: {
              _id: msg.author._id,
              name: msg.author.name
            },
            text: msg.text,
            createdAt: msg.createdAt
          }))
        };
        
        console.log(`✅ Conversation ${conv._id} avec ${result.messages.length} messages formatés`);
        return result;
      })
    );

    console.log('🎯 RÉPONSE FINALE - Conversations avec messages:', 
      conversationsWithMessages.map(c => ({ 
        id: c._id, 
        name: c.name || 'Private', 
        messagesCount: c.messages.length 
      }))
    );

    res.json(conversationsWithMessages);
  } catch (error) {
    console.error('❌ Erreur lors de la récupération des conversations:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
});

// POST - Créer une nouvelle conversation
router.post('/conversations', authenticateToken, async (req, res) => {
  try {
    const { name, type, participants, participantId } = req.body;
    const userId = req.user.id;
    
    console.log('🆕 Création de conversation:', { name, type, participants, participantId });

    let conversationData = {
      type,
      participants: [userId]
    };

    if (type === 'channel') {
      if (!name || !participants || participants.length === 0) {
        return res.status(400).json({ 
          message: 'Un channel doit avoir un nom et au moins un participant' 
        });
      }
      
      conversationData.name = name;
      conversationData.participants = [...new Set([userId, ...participants])];
      
    } else if (type === 'private') {
      if (!participantId) {
        return res.status(400).json({ 
          message: 'Une conversation privée doit avoir un participant' 
        });
      }

      // Vérifier si une conversation privée existe déjà
      const existingConv = await Conversation.findOne({
        type: 'private',
        participants: { 
          $all: [userId, participantId],
          $size: 2 
        }
      }).populate('participants', 'name email');

      if (existingConv) {
        console.log('🔄 Conversation privée existante trouvée');
        const messages = await Message.find({ conversation: existingConv._id })
          .populate('author', 'name')
          .sort({ createdAt: 1 });
        
        return res.json({
          ...existingConv.toObject(),
          messages: messages.map(msg => ({
            _id: msg._id,
            conversation: msg.conversation,
            author: { _id: msg.author._id, name: msg.author.name },
            text: msg.text,
            createdAt: msg.createdAt
          }))
        });
      }

      conversationData.participants = [userId, participantId];
    }

    const conversation = new Conversation(conversationData);
    await conversation.save();
    await conversation.populate('participants', 'name email');

    console.log('✅ Nouvelle conversation créée:', conversation._id);

    res.status(201).json({
      ...conversation.toObject(),
      messages: []
    });
  } catch (error) {
    console.error('❌ Erreur lors de la création de la conversation:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
});

// DELETE - Supprimer une conversation
router.delete('/conversations/:id', authenticateToken, async (req, res) => {
  try {
    const conversationId = req.params.id;
    const userId = req.user.id;

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ message: 'Conversation non trouvée' });
    }

    if (conversation.type === 'private') {
      return res.status(403).json({ message: 'Impossible de supprimer une conversation privée' });
    }

    // Supprimer tous les messages associés
    await Message.deleteMany({ conversation: conversationId });
    await Conversation.findByIdAndDelete(conversationId);

    console.log('🗑️ Conversation supprimée:', conversationId);
    res.json({ message: 'Conversation supprimée avec succès' });
  } catch (error) {
    console.error('❌ Erreur lors de la suppression:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
});

module.exports = router;