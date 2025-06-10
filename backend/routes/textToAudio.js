// routes/textToAudio.js
const express = require('express');
const gTTS = require('gtts');

const router = express.Router();

router.post('/text-to-audio', (req, res) => {
  const { text } = req.body;
  if (!text || text.trim().length === 0) return res.status(400).send("Text is required");

  try {
    const gtts = new gTTS(text, 'en');
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Disposition', 'inline; filename=\"speech.mp3\"');
    gtts.stream().pipe(res);
  } catch (error) {
    console.error('TTS error:', error);
    res.status(500).send('TTS conversion failed');
  }
});

module.exports = router;
