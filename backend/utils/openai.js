// /utils/openai.js
const OpenAI = require('openai');
require('dotenv').config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function safeJSONParse(response) {
  try {
    const cleaned = response.replace(/```(json)?/g, '').trim();
    return JSON.parse(cleaned);
  } catch (err) {
    throw new Error('Failed to parse AI response: ' + err.message + "\nRaw:\n" + response);
  }
}

async function detectLanguage(transcript) {
  const prompt = `What is the language of the following text? Reply only with \"en\" or \"fr\".\n\n${transcript}`;
  const detect = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages: [{ role: 'user', content: prompt }],
  });
  const reply = detect.choices[0].message.content.trim().toLowerCase();
  return reply.includes("fr") ? "fr" : "en";
}

async function summarizeAudioText(transcript) {
  const lang = await detectLanguage(transcript);

  const prompt = lang === "fr"
    ? `Tu es un assistant utile. Résume cette transcription de réunion entre 3 personnes et fournis :
  - Un résumé extremement detailler 
  - Une liste d’objectifs hebdomadaires clairs
  - Une liste de toutes les questions que se posent les 3 personne pendant la réunion, en les mettant en évidence
  - Pour chaque question, propose une réponse possible ou des pistes de solution

Transcription :
${transcript}

Réponds uniquement dans ce format JSON :
{
  "summary": "...",
  "objectives": ["Objectif 1", "Objectif 2"],
  "questions": [
    {
      "question": "...",
      "suggestion": "..."
    }
  ]
}`
    : `You are a helpful assistant. Summarize the following meeting transcript between 3 people and provide:
  - An extremly details summary
  - A list of clear weekly objectives
  - A list of all questions asked during the meeting, highlighting them
  - For each question, suggest possible answers or tips to find the solution

Transcript:
${transcript}

Respond only in this JSON format:
{
  "summary": "...",
  "objectives": ["Objective 1", "Objective 2"],
  "questions": [
    {
      "question": "...",
      "suggestion": "..."
    }
  ]
}`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages: [{ role: 'user', content: prompt }],
  });

  const raw = completion.choices[0].message.content;
  return await safeJSONParse(raw);
}

module.exports = { summarizeAudioText };
