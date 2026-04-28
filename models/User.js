import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  firstName:  { type: String, trim: true, default: '' },
  lastName:   { type: String, trim: true, default: '' },
  email:      { type: String, required: true, unique: true, lowercase: true, trim: true },
  password:   { type: String },   // null for Google-only accounts
  googleId:   { type: String },
  profilePic: { type: String, default: '' }, // filename in public/uploads/ OR Google photo URL

  // Profile / matchmaking fields
  age:        { type: Number, min: 18, max: 100 },
  gender:     { type: String, enum: ['Male', 'Female', 'Other', ''], default: '' },
  location:   { type: String, default: '' },
  profession: { type: String, default: '' },
  bio:        { type: String, default: '' },
  interests:  [{ type: String }],

  // Onboarding complete flag
  profileComplete: { type: Boolean, default: false },

  // Social
  friendRequests: [{
    from:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' },
    sentAt: { type: Date, default: Date.now },
  }],
  friends:  [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  isOnline: { type: Boolean, default: false },
  lastSeen: { type: Date, default: Date.now },
}, { timestamps: true });

// Hash password on save
userSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = async function (candidate) {
  if (!this.password) return false;
  return bcrypt.compare(candidate, this.password);
};

export default mongoose.model('User', userSchema);
