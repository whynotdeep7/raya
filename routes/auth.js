import express from 'express';
import { googleAuth, googleCallback, logout, renderLoginPage, renderSignupPage, submitLogin, submitSignup } from '../controllers/authController.js';

const router = express.Router();

router.get('/signup', renderSignupPage);
router.post('/signup', submitSignup);

router.get('/login', renderLoginPage);
router.post('/login', submitLogin);

router.post('/logout', logout);

router.get('/auth/google', googleAuth);
router.get('/auth/google/callback', ...googleCallback);

export default router;
