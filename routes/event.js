const express = require('express');
const router = express.Router();
const Event = require('../models/Event');

// Log a new event
router.post('/', async (req, res) => {
  try {
    const { sessionId, type, message } = req.body;
    
    const event = new Event({
      sessionId,
      type,
      message
    });
    
    await event.save();
    
    res.status(201).json({
      success: true,
      message: 'Event logged successfully',
      event: event
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error logging event',
      error: error.message
    });
  }
});

// Get events for a session
router.get('/session/:sessionId', async (req, res) => {
  try {
    const events = await Event.find({ sessionId: req.params.sessionId })
      .sort({ timestamp: -1 });
    
    res.json({
      success: true,
      events: events
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error retrieving events',
      error: error.message
    });
  }
});

module.exports = router;