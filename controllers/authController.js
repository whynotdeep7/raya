import passport from 'passport';
import User from '../models/User.js';
import { getCurrentUser, issueToken } from '../middleware/auth.js';

const normalizeEmail = (email = '') => email.toLowerCase();

export const renderSignupPage = async (req, res) => {
  if (await getCurrentUser(req)) return res.redirect('/');
  res.render('signup', { title: 'Join Raya', error: null, currentUser: null });
};

export const submitSignup = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password || password.length < 6) {
      return res.render('signup', { title: 'Join Raya', error: 'Please provide a valid email and password (min 6 chars).', currentUser: null });
    }

    const existing = await User.findOne({ email: normalizeEmail(email) });
    if (existing) {
      return res.render('signup', { title: 'Join Raya', error: 'An account with this email already exists.', currentUser: null });
    }

    const user = new User({ email: normalizeEmail(email), password });
    await user.save();

    issueToken(res, user._id);
    res.redirect('/onboarding');
  } catch (err) {
    console.error('Signup error:', err);
    res.render('signup', { title: 'Join Raya', error: 'Something went wrong. Please try again.', currentUser: null });
  }
};

export const renderLoginPage = async (req, res) => {
  if (await getCurrentUser(req)) return res.redirect('/');
  res.render('login', { title: 'Login — Raya', error: null, currentUser: null });
};

export const submitLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: normalizeEmail(email) });
    if (!user || !(await user.comparePassword(password))) {
      return res.render('login', { title: 'Login — Raya', error: 'Invalid email or password.', currentUser: null });
    }
    issueToken(res, user._id);
    if (!user.firstName) return res.redirect('/onboarding');
    res.redirect('/');
  } catch (err) {
    console.error('Login error:', err);
    res.render('login', { title: 'Login — Raya', error: 'Something went wrong.', currentUser: null });
  }
};

export const logout = (req, res) => {
  res.clearCookie('token');
  res.redirect('/');
};

export const googleAuth = passport.authenticate('google', { scope: ['profile', 'email'] });

export const googleCallback = [
  passport.authenticate('google', { failureRedirect: '/login', session: false }),
  (req, res) => {
    issueToken(res, req.user._id);
    if (!req.user.firstName) return res.redirect('/onboarding');
    res.redirect('/');
  },
];