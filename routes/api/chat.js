import express from 'express';
import { requireAuth } from '../../middleware/auth.js';
import Chat from '../../models/Chat.js';
import Message from '../../models/Message.js';

const router = express.Router();

// Get messages for a specific chat
router.get('/:chatId/messages', requireAuth, async (req, res) => {
  try {
    const { chatId } = req.params;
    // Verify user is part of the chat
    const chat = await Chat.findOne({ _id: chatId, participants: req.user._id });
    if (!chat) return res.status(403).json({ error: 'Not authorized' });

    const messages = await Message.find({ chatId }).sort({ createdAt: 1 });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Create or get an existing chat with another user
router.post('/new', requireAuth, async (req, res) => {
  try {
    const { targetUserId } = req.body;
    
    // Check if chat already exists
    let chat = await Chat.findOne({
      participants: { $all: [req.user._id, targetUserId] }
    });

    if (!chat) {
      chat = await Chat.create({
        participants: [req.user._id, targetUserId]
      });
    }
    
    // Return populated chat
    chat = await chat.populate('participants', 'firstName lastName profilePic isOnline');
    res.json(chat);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create chat' });
  }
});

export default router;
