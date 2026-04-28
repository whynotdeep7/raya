import 'dotenv/config';
import express from 'express';

import mongoose from 'mongoose';
import User from './models/User.js';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';

import { uploadsDir } from './config/upload.js';
import authRoutes from './routes/auth.js';
import notFoundRoutes from './routes/notFound.js';
import pageRoutes from './routes/pages.js';
import userRoutes from './routes/users.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const getGoogleProfilePhoto = (profile) => profile?.photos?.[0]?.value || profile?._json?.picture || '';

const app = express();


// ── MongoDB ────────────────────────────────────────────────────────────────
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => { console.error('❌ MongoDB error:', err); process.exit(1); });

// ── Passport Google OAuth ──────────────────────────────────────────────────
passport.use(new GoogleStrategy({
  clientID:     process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL:  '/auth/google/callback',
}, async (accessToken, refreshToken, profile, done) => {
  try {
    const googlePhoto = getGoogleProfilePhoto(profile);
    let user = await User.findOne({ googleId: profile.id });
    if (!user) {
      // Check if email already exists (manual signup + google link)
      user = await User.findOne({ email: profile.emails[0].value.toLowerCase() });
      if (user) {
        user.googleId = profile.id;
        if (!user.profilePic) user.profilePic = googlePhoto;
        await user.save();
      } else {
        user = await User.create({
          googleId:   profile.id,
          email:      profile.emails[0].value.toLowerCase(),
          firstName:  profile.name?.givenName || '',
          lastName:   profile.name?.familyName || '',
          profilePic: googlePhoto,
        });
      }
    } else if (!user.profilePic) {
      user.profilePic = googlePhoto;
      await user.save();
    }
    done(null, user);
  } catch (err) {
    done(err);
  }
}));

// ── Core Middleware ────────────────────────────────────────────────────────
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(uploadsDir));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());
app.use(passport.initialize());

// ── Routes ────────────────────────────────────────────────────────────────
app.use('/', authRoutes);
app.use('/', pageRoutes);
app.use('/', userRoutes);
app.use('/', notFoundRoutes);

// ── Start ──────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});