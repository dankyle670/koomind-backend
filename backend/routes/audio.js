const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const OpenAI = require("openai");
require("dotenv").config();

const { summarizeAudioText } = require("../utils/openai");

const router = express.Router();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const storage = multer.memoryStorage();
const upload = multer({ storage });

router.post("/upload", upload.single("audio"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No audio file uploaded." });
    }

    // Save to temporary file
    const tempFilePath = path.join(__dirname, `../../temp-${Date.now()}.webm`);
    fs.writeFileSync(tempFilePath, req.file.buffer);

    // Whisper requires a real fs.ReadStream
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(tempFilePath),
      model: "whisper-1",
      response_format: "text",
    });

    // Clean up
    fs.unlinkSync(tempFilePath);

    // Summarize
    const aiResponse = await summarizeAudioText(transcription);

    res.status(200).json({
      summary: aiResponse.summary,
      objectives: aiResponse.objectives,
    });
  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).json({ message: "Error processing audio", error: err.message });
  }
});

module.exports = router;
