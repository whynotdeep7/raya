import User from '../models/User.js';
import ContactMessage from '../models/ContactMessage.js';
import { getCurrentUser } from '../middleware/auth.js';

const parseInterests = (value = '') =>
  value.split(',').map((item) => item.trim()).filter(Boolean);

const toOptionalInt = (value) => (value ? Number.parseInt(value, 10) : undefined);

const getGreetingByHour = (hour) => {
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
};

const getDashboardData = async (userId) => {
  const me = await User.findById(userId)
    .populate('friends', 'firstName lastName profilePic isOnline profession location')
    .populate('friendRequests.from', 'firstName lastName profilePic age location profession');

  const pendingRequests = me.friendRequests.filter((request) => request.status === 'pending');
  return { me, pendingRequests };
};

const withViewer = async (req, data = {}) => ({
  ...data,
  currentUser: req.user || await getCurrentUser(req),
});

export const renderHome = async (req, res) => {
  const currentUser = req.user || await getCurrentUser(req);
  const greeting = getGreetingByHour(new Date().getHours());
  if (currentUser) {
    const { me, pendingRequests } = await getDashboardData(currentUser._id);
    return res.render('index', await withViewer(req, {
      title: 'Dashboard — Raya',
      friends: me.friends,
      pendingRequests,
      greeting,
      currentUser,
    }));
  }

  res.render('index', await withViewer(req, {
    title: 'Raya — Find Your Match',
    friends: [],
    pendingRequests: [],
    greeting,
    currentUser: null,
  }));
};

export const renderOnboarding = async (req, res) => {
  res.render('onboarding', await withViewer(req, {
    title: 'Complete your profile — Raya',
    error: null,
  }));
};

export const submitOnboarding = async (req, res) => {
  try {
    const { firstName, lastName, age, gender, location, profession, bio, interests } = req.body;

    if (!firstName || !firstName.trim()) {
      return res.render('onboarding', await withViewer(req, {
        title: 'Complete your profile — Raya',
        error: 'First name is required.',
      }));
    }

    const interestsList = interests ? parseInterests(interests) : [];

    const update = {
      firstName:       firstName.trim(),
      lastName:        (lastName || '').trim(),
      age:             toOptionalInt(age),
      gender:          gender || '',
      location:        (location || '').trim(),
      profession:      (profession || '').trim(),
      bio:             (bio || '').trim(),
      interests:       interestsList,
      profileComplete: true,
    };

    if (req.file) update.profilePic = req.file.filename;

    await User.findByIdAndUpdate(req.user._id, update);
    res.redirect('/');
  } catch (err) {
    console.error('Onboarding error:', err);
    res.render('onboarding', await withViewer(req, {
      title: 'Complete your profile — Raya',
      error: 'Something went wrong. Please try again.',
    }));
  }
};

export const renderDiscover = async (req, res) => {
  res.render('discover', await withViewer(req, {
    title: 'Discover — Raya',
  }));
};

export const renderProfile = async (req, res) => {
  const { me, pendingRequests } = await getDashboardData(req.user._id);
  res.render('profile', await withViewer(req, {
    title: 'My Profile — Raya',
    profileUser: me,
    pendingRequests,
  }));
};

export const submitProfileEdit = async (req, res) => {
  try {
    const { firstName, lastName, age, gender, location, profession, bio, interests } = req.body;
    const interestsList = interests ? parseInterests(interests) : [];
    const update = {
      firstName: firstName?.trim() || req.user.firstName,
      lastName:  lastName?.trim()  || req.user.lastName,
      age:       toOptionalInt(age),
      gender, location, profession, bio,
      interests: interestsList,
    };
    if (req.file) update.profilePic = req.file.filename;
    await User.findByIdAndUpdate(req.user._id, update);
    res.redirect('/profile');
  } catch (err) {
    console.error(err);
    res.redirect('/profile');
  }
};

export const renderUserProfile = async (req, res) => {
  try {
    // Load profile user without friends populated by default to protect privacy
    const profileUser = await User.findById(req.params.id)
      .select('-password -googleId');

    if (!profileUser) return res.status(404).render('404', await withViewer(req, { title: 'Not Found — Raya' }));

    // Determine viewer (currentUser) and relationship
    const viewer = req.user || await getCurrentUser(req);
    const viewerId = viewer ? viewer._id.toString() : null;

    // By default hide friend details from non-owners
    let isOwner = false;
    let isFriend = false;
    let sentRequest = false;

    if (viewerId) {
      isOwner = profileUser._id.toString() === viewerId;

      // Check if viewer has profileUser in their friends list (safer privacy-wise)
      const viewerDoc = await User.findById(viewerId).select('friends').populate('friends', '_id');
      if (viewerDoc && viewerDoc.friends) {
        isFriend = viewerDoc.friends.some((f) => f._id.toString() === profileUser._id.toString());
      }

      // Check if viewer sent a pending request to profileUser
      sentRequest = profileUser.friendRequests && profileUser.friendRequests.some(
        (r) => r.from.toString() === viewerId && r.status === 'pending'
      );
    }

    // If owner, populate friends with full details for display; otherwise don't expose list
    if (isOwner) {
      await profileUser.populate('friends', 'firstName lastName profilePic');
    } else {
      // hide friends field for non-owners
      profileUser.friends = [];
    }

    res.render('user', await withViewer(req, {
      title: `${profileUser.firstName} ${profileUser.lastName} — Raya`,
      profileUser,
      isOwner,
      relationshipStatus: isFriend ? 'friend' : sentRequest ? 'pending' : 'none',
    }));
  } catch {
    res.status(404).render('404', await withViewer(req, { title: 'Not Found — Raya' }));
  }
};

export const renderContact = async (req, res) => {
  res.render('contact', await withViewer(req, {
    title: 'Contact Us — Raya',
    success: false,
  }));
};

export const submitContact = async (req, res) => {
  try {
    const { name, email, message } = req.body;
    await ContactMessage.create({ name, email, message });
    res.render('contact', await withViewer(req, {
      title: 'Contact Us — Raya',
      success: true,
    }));
  } catch {
    res.render('contact', await withViewer(req, {
      title: 'Contact Us — Raya',
      success: false,
    }));
  }
};