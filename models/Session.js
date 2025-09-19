const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
  startTime: {
    type: Date,
    required: true,
    default: Date.now
  },
  endTime: {
    type: Date
  },
  duration: {
    type: Number // in milliseconds
  },
  candidateName: {
    type: String,
    default: 'Unknown Candidate'
  },
  events: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event'
  }],
  summary: {
    totalEvents: Number,
    noFaceEvents: Number,
    lookingAwayEvents: Number,
    multipleFaceEvents: Number,
    suspiciousObjectEvents: Number
  }
});

module.exports = mongoose.model('Session', sessionSchema);