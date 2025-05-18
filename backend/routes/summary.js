const express = require('express');
const router = express.Router();
const Summary = require('../models/Summary');
const jwt = require('jsonwebtoken');

// Middleware to verify JWT
function auth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token' });

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (err) {
    res.status(403).json({ message: 'Invalid token' });
  }
}

// POST /api/summary - save a new summary
router.post('/summary', auth, async (req, res) => {
  const { title, summary, objectives } = req.body;

  if (!title || !summary || !objectives)
    return res.status(400).json({ message: 'Missing fields' });

  try {
    const newSummary = new Summary({
      userId: req.user.id,
      title,
      summary,
      objectives
    });
    await newSummary.save();
    res.status(201).json({ message: 'Summary saved' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error saving summary' });
  }
});

// GET /api/summary - get all summaries for user
router.get('/summary', auth, async (req, res) => {
  try {
    const summaries = await Summary.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.json(summaries);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching summaries' });
  }
});
// GET /api/summary/all - get all summaries (admins and users)
router.get("/summary/all", auth, async (req, res) => {
  try {
    const summaries = await Summary.find().sort({ createdAt: -1 });
    res.json(summaries);
  } catch (err) {
    res.status(500).json({ message: "Error fetching all summaries" });
  }
});


// GET /api/summary/:id - get one
router.get('/summary/:id', auth, async (req, res) => {
  try {
    const summary = await Summary.findOne({ _id: req.params.id, userId: req.user.id });
    if (!summary) return res.status(404).json({ message: 'Not found' });
    res.json(summary);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching summary' });
  }
});

// DELETE /api/summary/:id
router.delete('/summary/:id', auth, async (req, res) => {
  try {
    await Summary.deleteOne({ _id: req.params.id, userId: req.user.id });
    res.json({ message: 'Summary deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting summary' });
  }
});

// PUT /api/summary/:id - update summary
router.put('/summary/:id', auth, async (req, res) => {
    const { title, summary, objectives } = req.body;
    try {
      const updated = await Summary.findOneAndUpdate(
        { _id: req.params.id, userId: req.user.id },
        { title, summary, objectives },
        { new: true }
      );
      if (!updated) return res.status(404).json({ message: 'Summary not found' });
      res.json({ message: 'Summary updated', summary: updated });
    } catch (err) {
      console.error('Update error:', err);
      res.status(500).json({ message: 'Error updating summary' });
    }
  });

module.exports = router;
