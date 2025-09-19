const express = require('express');
const router = express.Router();
const Session = require('../models/Session');
const Event = require('../models/Event');

// Start a new session
router.post('/start', async (req, res) => {
  try {
    const { candidateName } = req.body;
    
    const session = new Session({
      candidateName: candidateName || 'Unknown Candidate'
    });
    
    await session.save();
    
    res.status(201).json({
      success: true,
      message: 'Session started successfully',
      sessionId: session._id
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error starting session',
      error: error.message
    });
  }
});

// End a session
router.post('/end', async (req, res) => {
  try {
    const { sessionId } = req.body;
    
    const session = await Session.findById(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }
    
    session.endTime = new Date();
    session.duration = session.endTime - session.startTime;
    
    // Get event counts for summary
    const events = await Event.find({ sessionId });
    
    session.summary = {
      totalEvents: events.length,
      noFaceEvents: events.filter(e => e.message.includes('No face detected')).length,
      lookingAwayEvents: events.filter(e => e.message.includes('Looking away')).length,
      multipleFaceEvents: events.filter(e => e.message.includes('Multiple faces detected')).length,
      suspiciousObjectEvents: events.filter(e => e.message.includes('Suspicious object detected')).length
    };
    
    await session.save();
    
    res.json({
      success: true,
      message: 'Session ended successfully',
      session: session
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error ending session',
      error: error.message
    });
  }
});

// Get session details
router.get('/:id', async (req, res) => {
  try {
    const session = await Session.findById(req.params.id).populate('events');
    
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }
    
    res.json({
      success: true,
      session: session
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error retrieving session',
      error: error.message
    });
  }
});

module.exports = router;