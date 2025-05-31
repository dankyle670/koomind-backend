const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.BOT_EMAIL,
    pass: process.env.BOT_EMAIL_PASS,
  },
});

async function sendEmail(to, subject, text) {
  await transporter.sendMail({
    from: `"Koomind AI" <${process.env.BOT_EMAIL}>`,
    to,
    subject,
    text,
  });
}

module.exports = sendEmail;
