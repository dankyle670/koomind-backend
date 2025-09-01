const KOOMIND_KNOWLEDGE = {
  mission:
    "Koomind est un assistant interne conçu pour aider l’équipe fondatrice de Seekadollars à organiser, structurer et lancer efficacement leur plateforme.",
  startupProject: {
    name: "Seekadollars",
    description:
      "Seekadollars est une application inspirée de Coinbase, destinée au marché africain, permettant de suivre les données financières de la BRVM et d'investir localement.",
    officialEmail: "seekadollars@gmail.com",
    koomindRole:
      "Koomind agit comme outil de gestion interne pour l’équipe de développement de Seekadollars."
  },
  goals: [
    "Centraliser les résumés et documents importants",
    "Faciliter la collaboration de l’équipe",
    "Envoyer des mails internes ou externes automatiquement",
    "Suivre les tâches et décisions pour lancer la plateforme"
  ],
  features: {
    dashboard: "Vue d’ensemble de l’activité et du projet.",
    upload: "Envoyer des enregistrements audio pour transcription et résumé automatique.",
    summary: "Lire les résumés générés des réunions internes.",
    profile: "Paramètres utilisateur et infos de compte.",
    adminPanel: "Gérer les membres de l’équipe et leurs accès.",
    createAdmin: "Ajouter un nouvel admin avec droits d’accès Koomind."
  },
  assistantIdentity: {
    name: "Koomind.ai",
    tone: "friendly and helpful",
    email: "koomind.aicontact@gmail.com"
  },
  actions: {
    canSendEmail: true,
    canCreateAdmin: true,
    canSummarize: true,
    canAssistSeekadollarsTeam: true
  },
  teamEmails: {
    Daniel: "daniel.komoe@valfred.io",
    William: "william.kromm@valfred.io",
    seekadollars: "seekadollars@gmail.com"
  },
};
module.exports = KOOMIND_KNOWLEDGE;

