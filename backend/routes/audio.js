const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const OpenAI = require("openai");
const ffmpegPath = require("@ffmpeg-installer/ffmpeg").path;
const ffmpeg = require("fluent-ffmpeg");
const mongoose = require("mongoose");
require("dotenv").config();

const { summarizeAudioText } = require("../utils/openai");
const Audio = require("../models/Audio");

const router = express.Router();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

ffmpeg.setFfmpegPath(ffmpegPath);

const storage = multer.memoryStorage();
const upload = multer({ storage });

const splitAudioIntoChunks = (inputPath, chunkDurationSec = 600) => {
  return new Promise((resolve, reject) => {
    const outputDir = path.join(__dirname, `../../chunks-${Date.now()}`);
    fs.mkdirSync(outputDir);

    ffmpeg(inputPath)
      .audioCodec("libvorbis") // transcode audio properly for webm
      .format("webm")
      .outputOptions([
        "-f", "segment",
        "-segment_time", chunkDurationSec,
      ])
      .output(path.join(outputDir, "chunk-%03d.webm"))
      .on("end", () => {
        const files = fs.readdirSync(outputDir).map(file => path.join(outputDir, file));
        resolve(files);
      })
      .on("error", (err) => {
        console.error("FFmpeg split error:", err.message);
        reject(err);
      })
      .run();
  });
};


// Route: Upload and transcribe audio
router.post("/upload", upload.single("audio"), async (req, res) => {
  const tempPath = path.join(__dirname, `../../temp-${Date.now()}.webm`);
  try {
    if (!req.file) return res.status(400).json({ message: "No audio file uploaded." });

    fs.writeFileSync(tempPath, req.file.buffer);
    const chunkPaths = await splitAudioIntoChunks(tempPath, 600); // 10 min

    const transcripts = [];
    for (const chunkPath of chunkPaths) {
      try {
        const transcription = await openai.audio.transcriptions.create({
          file: fs.createReadStream(chunkPath),
          model: "whisper-1",
          response_format: "text",
        });
        transcripts.push(transcription);
      } catch (err) {
        transcripts.push(`[Erreur de transcription pour ${path.basename(chunkPath)}]`);
      }
    }

    const fullTranscript = transcripts.join("\n\n");
    const newAudio = new Audio({ transcript: fullTranscript, createdAt: new Date() });
    const saved = await newAudio.save();

    fs.unlinkSync(tempPath);
    chunkPaths.forEach(p => fs.unlinkSync(p));
    fs.rmdirSync(path.dirname(chunkPaths[0]));

    res.status(200).json({ message: "Audio transcribed successfully.", id: saved._id, transcript: saved.transcript });
  } catch (err) {
    console.error("Transcription error:", err);
    if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
    res.status(500).json({ message: "Error during transcription", error: err.message });
  }
});

// Route: Summarize stored transcript (Optimized for 2h+)
router.get("/summarize/:id", async (req, res) => {
  try {
    const audio = await Audio.findById(req.params.id);
    if (!audio) return res.status(404).json({ message: "Transcript not found." });

    const fullText = audio.transcript;
    const words = fullText.trim().split(/\s+/);
    const chunkSize = 2500; // Smaller chunk size to reduce token overflow risk

    const chunks = [];
    for (let i = 0; i < words.length; i += chunkSize) {
      chunks.push(words.slice(i, i + chunkSize).join(" "));
    }

    const partialSummaries = [];
    for (const [i, chunk] of chunks.entries()) {
      try {
        const partSummary = await summarizeAudioText(chunk);
        partialSummaries.push(partSummary.summary);
      } catch (e) {
        console.warn(`Failed to summarize part ${i + 1}:`, e.message);
        partialSummaries.push(`[Erreur dans le résumé de la partie ${i + 1}]`);
      }
    }

    const globalSummary = await summarizeAudioText(partialSummaries.join("\n\n"));

    res.status(200).json({
      summary: globalSummary.summary,
      objectives: globalSummary.objectives,
      parts: partialSummaries.length,
    });
  } catch (err) {
    console.error("Summarization error:", err);
    res.status(500).json({ message: "Error during summarization", error: err.message });
  }
});

module.exports = router;
