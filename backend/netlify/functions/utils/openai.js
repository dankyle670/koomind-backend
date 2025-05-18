const OpenAI = require('openai');
require('dotenv').config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function summarizeAudioText(transcript) {
  // First, detect the language of the transcript
  const detectPrompt = `
What is the language of the following transcript? Reply only with "en" or "fr".

Transcript:
${transcript}
`;

  const detect = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages: [{ role: 'user', content: detectPrompt }],
  });

  const detectedLang = detect.choices[0].message.content.trim().toLowerCase();

  // Prepare language-specific prompt
  let prompt = "";

  if (detectedLang === "fr") {
    prompt = `
Tu es un assistant utile. Résume cette transcription de réunion et fournis une liste d’objectifs hebdomadaires clairs :

Transcription :
${transcript}

Réponds uniquement dans ce format JSON :
{
  "summary": "...",
  "objectives": [
    "Objectif 1",
    "Objectif 2",
    ...
  ]
}
`;
  } else {
    prompt = `
You are a helpful assistant. Summarize the following meeting transcript and list clear weekly objectives:

Transcript:
${transcript}

Respond in this JSON format only:
{
  "summary": "...",
  "objectives": [
    "Objective 1",
    "Objective 2",
    ...
  ]
}
`;
  }

  const completion = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages: [{ role: 'user', content: prompt }],
  });

  const raw = completion.choices[0].message.content;

  try {
    const parsed = JSON.parse(raw);
    return parsed;
  } catch (err) {
    throw new Error('Failed to parse AI response: ' + err.message);
  }
}

module.exports = { summarizeAudioText };
