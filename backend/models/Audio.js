const mongoose = require("mongoose");

const audioSchema = new mongoose.Schema({
  transcript: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("Audio", audioSchema);
