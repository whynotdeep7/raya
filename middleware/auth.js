import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const TOKEN_COOKIE = 'token';

const getUserFromToken = async (token) => {
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return User.findById(decoded.id).select('-password');
  } catch {
    return null;
  }
};

export const getCurrentUser = async (req) => getUserFromToken(req.cookies?.[TOKEN_COOKIE]);

export const requireAuth = async (req, res, next) => {
  try {
    const user = await getCurrentUser(req);
    if (!user) return res.redirect('/login');

    req.user = user;
    res.locals.currentUser = user;
    next();
  } catch {
    res.clearCookie(TOKEN_COOKIE);
    return res.redirect('/login');
  }
};

export const issueToken = (res, userId) => {
  const token = jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
  res.cookie(TOKEN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
};
