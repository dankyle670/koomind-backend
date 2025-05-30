// scheduler.js
const cron = require('node-cron');
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');
const Summary = require('./models/Summary');
const User = require('./models/User');
require('dotenv').config();

// Connect to MongoDB if not already connected
if (mongoose.connection.readyState === 0) {
  mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  }).then(() => console.log("✅ Scheduler: MongoDB connected"))
    .catch(err => console.error("❌ Scheduler DB error:", err));
}

// Create nodemailer transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Schedule: Sunday + Wednesday at 18:00 (6:00 PM)
cron.schedule('0 18 * * 0,3', async () => {
  console.log("📅 Running scheduled summary dispatch...");

  try {
    // Get last 2 days of summaries
    const since = new Date();
    since.setDate(since.getDate() - 2);
    const summaries = await Summary.find({ createdAt: { $gte: since } });

    if (summaries.length === 0) {
      console.log("ℹ️ No new summaries to send.");
      return;
    }

    // Get all admin users
    const admins = await User.find({ role: 'admin' });

    if (admins.length === 0) {
      console.log("⚠️ No admin users found.");
      return;
    }

    const summaryList = summaries.map((s, i) => `
      <h3>${i + 1}. ${s.title}</h3>
      <p><strong>Résumé :</strong><br>${s.summary}</p>
      <p><strong>Objectifs :</strong><br>${s.objectives.join("<br>")}</p>
    `).join("<hr>");

    for (const admin of admins) {
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: admin.email,
        subject: '🧠 Nouveaux résumés de réunion - Koomind',
        html: `
          <p>Bonjour ${admin.name || 'Admin'},</p>
          <p>Voici les résumés des réunions enregistrées ces deux derniers jours :</p>
          ${summaryList}
          <p>— L'équipe Koomind</p>
        `,
      };

      await transporter.sendMail(mailOptions);
      console.log(`📬 Résumés envoyés à ${admin.email}`);
    }
  } catch (err) {
    console.error("❌ Erreur lors de l'envoi automatique des résumés :", err);
  }
});
