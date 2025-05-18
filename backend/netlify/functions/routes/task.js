const express = require('express');
const router = express.Router();
const Task = require('../models/Task');
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

// POST /api/tasks
router.post('/tasks', auth, async (req, res) => {
  const { title, description } = req.body;
  if (!title) return res.status(400).json({ message: 'Title is required' });

  try {
    const task = new Task({
      userId: req.user.id,
      title,
      description
    });
    await task.save();
    res.status(201).json({ message: 'Task created', task });
  } catch (err) {
    res.status(500).json({ message: 'Error creating task', error: err.message });
  }
});

// GET /api/tasks
router.get('/tasks', auth, async (req, res) => {
  try {
    const tasks = await Task.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching tasks' });
  }
});

// PUT /api/tasks/:id
router.put('/tasks/:id', auth, async (req, res) => {
  const { title, description, completed } = req.body;

  try {
    const updated = await Task.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { title, description, completed },
      { new: true }
    );
    if (!updated) return res.status(404).json({ message: 'Task not found' });
    res.json({ message: 'Task updated', task: updated });
  } catch (err) {
    res.status(500).json({ message: 'Error updating task' });
  }
});

// DELETE /api/tasks/:id
router.delete('/tasks/:id', auth, async (req, res) => {
  try {
    await Task.deleteOne({ _id: req.params.id, userId: req.user.id });
    res.json({ message: 'Task deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting task' });
  }
});

module.exports = router;
