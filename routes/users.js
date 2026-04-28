import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  acceptFriendRequest,
  getUser,
  listFriendRequests,
  listFriends,
  listUsers,
  rejectFriendRequest,
  sendFriendRequest,
} from '../controllers/userController.js';

const router = express.Router();

router.get('/api/users', requireAuth, listUsers);

router.get('/api/user/:id', requireAuth, getUser);

router.post('/api/friends/request', requireAuth, sendFriendRequest);

router.post('/api/friends/accept', requireAuth, acceptFriendRequest);

router.post('/api/friends/reject', requireAuth, rejectFriendRequest);

router.get('/api/friends', requireAuth, listFriends);

router.get('/api/friends/requests', requireAuth, listFriendRequests);

export default router;
