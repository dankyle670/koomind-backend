const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const OpenAI = require("openai");
const mongoose = require("mongoose");
require("dotenv").config();

const { summarizeAudioText } = require("../utils/openai");
const Audio = require("../models/Audio");

const router = express.Router();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const storage = multer.memoryStorage();
const upload = multer({ storage });

// Route: Upload and transcribe audio
router.post("/upload", upload.single("audio"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No audio file uploaded." });
    }

    const tempFilePath = path.join(__dirname, `../../temp-${Date.now()}.webm`);
    fs.writeFileSync(tempFilePath, req.file.buffer);

    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(tempFilePath),
      model: "whisper-1",
      response_format: "text",
    });

    fs.unlinkSync(tempFilePath);

    const newAudio = new Audio({
      transcript: transcription,
      createdAt: new Date(),
    });

    const saved = await newAudio.save();

    // ✅ Log the saved ID for debugging
    console.log("✅ Saved transcription with ID:", saved._id);

    res.status(200).json({
      message: "Audio transcribed successfully.",
      id: saved._id,
      transcript: saved.transcript,
    });
  } catch (err) {
    console.error("Transcription error:", err);
    res.status(500).json({ message: "Error during transcription", error: err.message });
  }
});

// Route: Summarize stored transcript
router.get("/summarize/:id", async (req, res) => {
  try {
    const audio = await Audio.findById(req.params.id);
    if (!audio) {
      return res.status(404).json({ message: "Transcript not found." });
    }

    const fullText = audio.transcript;
    const words = fullText.trim().split(/\s+/);
    const chunkSize = 3000;

    // Step 1: Split into parts
    const chunks = [];
    for (let i = 0; i < words.length; i += chunkSize) {
      chunks.push(words.slice(i, i + chunkSize).join(" "));
    }

    // Step 2: Summarize each chunk
    const partialSummaries = [];
    for (const chunk of chunks) {
      const partSummary = await summarizeAudioText(chunk);
      partialSummaries.push(partSummary.summary);
    }

    // Step 3: Global summary of partials
    const finalSummary = await summarizeAudioText(partialSummaries.join("\n\n"));

    res.status(200).json({
      summary: finalSummary.summary,
      objectives: finalSummary.objectives,
      parts: partialSummaries.length,
    });
  } catch (err) {
    console.error("Summarization error:", err);
    res.status(500).json({ message: "Error during summarization", error: err.message });
  }
});

module.exports = router;
