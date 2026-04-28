import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  renderContact,
  renderDiscover,
  renderHome,
  renderOnboarding,
  renderProfile,
  renderUserProfile,
  submitContact,
  submitOnboarding,
  submitProfileEdit,
} from '../controllers/pageController.js';
import { upload } from '../config/upload.js';

const router = express.Router();

router.get('/', renderHome);

router.get('/onboarding', requireAuth, renderOnboarding);
router.post('/onboarding', requireAuth, upload.single('profilePic'), submitOnboarding);

router.get('/discover', requireAuth, renderDiscover);

router.get('/profile', requireAuth, renderProfile);
router.post('/profile/edit', requireAuth, upload.single('profilePic'), submitProfileEdit);

router.get('/user/:id', requireAuth, renderUserProfile);

router.get('/contact', renderContact);
router.post('/contact', submitContact);

export default router;