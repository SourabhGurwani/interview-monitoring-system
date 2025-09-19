const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  sessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Session',
    required: true
  },
  timestamp: {
    type: Date,
    required: true,
    default: Date.now
  },
  type: {
    type: String,
    required: true,
    enum: ['info', 'warning', 'alert', 'success']
  },
  message: {
    type: String,
    required: true
  }
});

module.exports = mongoose.model('Event', eventSchema);