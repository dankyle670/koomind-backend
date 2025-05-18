const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const { authenticate, requireAdmin } = require('../middleware/auth');

// Login Route
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ message: 'Email and password required' });

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'User not found' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ message: 'Incorrect password' });

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.json({
      message: 'Login successful',
      token,
      userId: user._id,
      name: user.name,
      role: user.role,
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create user Route
router.post('/create-user', async (req, res) => {
  const { name, email, password, role } = req.body;

  if (!name || !email || !password)
    return res.status(400).json({ message: 'Name, email, and password are required' });

  try {
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ message: 'Email already exists' });
    }

    const hashed = await bcrypt.hash(password, 10);
    const newUser = new User({
      name,
      email,
      password: hashed,
      role: role === "admin" ? "admin" : "user", // default to 'user' if invalid
    });

    await newUser.save();
    res.status(201).json({ message: `${role} account created successfully` });
  } catch (err) {
    console.error('Create user error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ✅ Reset admin password (must be before /user/:id)
router.put('/user/reset-password', authenticate, requireAdmin, async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password || password.length < 6)
    return res.status(400).json({ message: 'Email and valid password required (min 6 chars)' });

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'User not found' });

    const hashed = await bcrypt.hash(password, 10);
    user.password = hashed;
    await user.save();

    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete User (admin only)
router.delete('/user/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const deleted = await User.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'User not found' });

    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    console.error('Delete user error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update User Info (admin only)
router.put('/user/:id', authenticate, requireAdmin, async (req, res) => {
  const { name, email } = req.body;

  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (name) user.name = name;
    if (email) user.email = email;

    await user.save();
    res.json({ message: 'User updated', user: { name: user.name, email: user.email } });
  } catch (err) {
    console.error('Update user error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get All Users (optional: admin-only)
router.get('/users', authenticate, requireAdmin, async (req, res) => {
  try {
    const users = await User.find({}, '-password');
    res.json(users);
  } catch (err) {
    console.error('Fetch users error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get Single User (optional: admin-only)
router.get('/user/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id, '-password');
    if (!user) return res.status(404).json({ message: 'User not found' });

    res.json(user);
  } catch (err) {
    console.error('Fetch user error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get current user
router.get("/me", authenticate, async (req, res) => {
  const user = await User.findById(req.user.id, "-password");
  if (!user) return res.status(404).json({ message: "User not found" });
  res.json(user);
});

// Update current user profile
router.put("/me", authenticate, async (req, res) => {
  const { bio, phone, linkedin } = req.body;
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.bio = bio;
    user.phone = phone;
    user.linkedin = linkedin;
    await user.save();

    res.json({ message: "Profile updated" });
  } catch (err) {
    res.status(500).json({ message: "Update failed" });
  }
});

// Get all admins
router.get("/admins", authenticate, requireAdmin, async (req, res) => {
  try {
    const admins = await User.find({ role: "admin" }, "-password");
    res.json(admins);
  } catch (err) {
    console.error("Error fetching admins:", err);
    res.status(500).json({ message: "Error fetching admins" });
  }
});

module.exports = router;
