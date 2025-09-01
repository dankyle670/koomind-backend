const mongoose = require("mongoose");

const ConversationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: function() { return this.type === "channel"; } // obligatoire seulement pour channel
  },
  type: { type: String, enum: ["channel", "private"], required: true },
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  messages: [{ type: mongoose.Schema.Types.ObjectId, ref: "Message" }],
}, { timestamps: true });

module.exports = mongoose.model("Conversation", ConversationSchema);
