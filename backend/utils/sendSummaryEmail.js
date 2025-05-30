const User = require('../models/User');
const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

/**
 * Sends a summary email to all admin users
 * @param {Object} summary - { title, summary, objectives }
 */
const sendSummaryEmail = async ({ title, summary, objectives }) => {
  try {
    const admins = await User.find({ role: 'admin' });
    if (!admins.length) {
      console.warn("Aucun admin trouvé pour l'envoi d'email.");
      return;
    }

    const summaryHTML = `
      <h3>${title}</h3>
      <p><strong>Résumé :</strong><br>${summary}</p>
      <p><strong>Objectifs :</strong><br>${objectives.join('<br>')}</p>
    `;

    for (const admin of admins) {
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: admin.email,
        subject: 'Nouveau résumé de réunion - Koomind',
        html: `
          <p>Bonjour ${admin.name || 'Admin'},</p>
          <p>Un nouveau résumé de réunion a été ajouté :</p>
          ${summaryHTML}
          <p>— L'équipe Koomind</p>
        `,
      });
      console.log(`Email envoyé à ${admin.email}`);
    }
  } catch (err) {
    console.error('Erreur envoi email résumé aux admins :', err);
  }
};

module.exports = sendSummaryEmail;
