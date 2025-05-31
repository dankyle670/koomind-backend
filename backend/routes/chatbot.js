const express = require('express');
const OpenAI = require('openai');
const nodemailer = require('nodemailer');
const KOOMIND_KNOWLEDGE = require('../config/koomindKnowledge');
require('dotenv').config();

const router = express.Router();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

function resolveEmail(nameOrEmail) {
  if (!nameOrEmail) return null;
  const lower = nameOrEmail.toLowerCase();
  return KOOMIND_KNOWLEDGE.teamEmails[lower] || nameOrEmail;
}

router.post('/chatbot', async (req, res) => {
  const { message, userEmail, userName, forceSendEmail, target, subject, body } = req.body;

  if (forceSendEmail && target) {
    const realTarget = resolveEmail(target);
    try {
      await transporter.verify();
      await transporter.sendMail({
        from: process.env.OFFICIAL_EMAIL,
        to: realTarget,
        subject: subject || 'Message de Seekadollars',
        text: body || ''
      });
      return res.json({
        reply: `✅ Email bien envoyé de ${process.env.OFFICIAL_EMAIL} à ${realTarget}.`
      });
    } catch (emailErr) {
      console.error("❌ Email failed:", emailErr.message);
      return res.json({
        reply: `❌ Échec de l'envoi à ${realTarget}. Vérifie l'adresse ou réessaie plus tard.`
      });
    }
  }

  const prompt = `
You are ${KOOMIND_KNOWLEDGE.assistantIdentity.name}, the internal assistant for the startup Seekadollars.

🌍 IMPORTANT:
- First, detect the language of the user's message (French or English).
- Then, always respond in **the same language**.
- Keep a friendly and helpful tone.

📨 Email rules:
- You only send emails from: ${KOOMIND_KNOWLEDGE.startupProject.officialEmail}
- You can send to anyone if a valid target email is provided or matched from the team list.
- Never send emails to ${KOOMIND_KNOWLEDGE.startupProject.officialEmail} unless clearly instructed.

📚 Context:
- Mission: ${KOOMIND_KNOWLEDGE.mission}
- Description: ${KOOMIND_KNOWLEDGE.startupProject.description}
- Team:
${Object.entries(KOOMIND_KNOWLEDGE.teamEmails).map(([name, email]) => `• ${name} => ${email}`).join('\n')}
- Goals: ${KOOMIND_KNOWLEDGE.goals.join(', ')}
- Features: ${Object.entries(KOOMIND_KNOWLEDGE.features).map(([k, v]) => `${k}: ${v}`).join(', ')}

🧑 Current user: ${userName || 'Unknown'} (${userEmail || 'No email provided'})

⚠️ You must reply in this STRICT JSON format:
{
  "response": "...",
  "action": "none" | "prepare_email" | "confirm_email" | "send_email",
  "target": "email@domain.com",
  "subject": "...",
  "body": "..."
}

User message:
"${message}"
`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }]
    });

    const content = completion.choices[0].message.content.trim();
    let parsed;

    try {
      parsed = JSON.parse(content);
    } catch (err) {
      console.error("❌ JSON parsing failed:", content);
      return res.json({
        reply: "❌ Je n'ai pas compris la demande. Reformule ou précise."
      });
    }

    if (parsed.action === 'send_email' && parsed.target) {
      const realTarget = resolveEmail(parsed.target);
      try {
        await transporter.verify();
        await transporter.sendMail({
          from: process.env.OFFICIAL_EMAIL,
          to: realTarget,
          subject: parsed.subject || 'Message de Seekadollars',
          text: parsed.body || ''
        });

        parsed.response += `\n✅ Email bien envoyé de ${process.env.OFFICIAL_EMAIL} à ${realTarget}.`;
      } catch (emailErr) {
        console.error('❌ Email send failed:', emailErr.message);
        parsed.response += `\n❌ Échec de l'envoi à ${realTarget}.`;
      }
    }

    const pendingEmail = parsed.action === 'prepare_email' ? {
      target: parsed.target,
      subject: parsed.subject,
      body: parsed.body
    } : null;

    return res.json({ reply: parsed.response, pendingEmail });
  } catch (err) {
    console.error('💥 OpenAI Error:', err.message);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
