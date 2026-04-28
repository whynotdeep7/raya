import User from '../models/User.js';

const PAGE_LIMIT = 12;

const toInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
};

const getRelationshipStatus = (targetUser, myId) => {
  const isFriend = targetUser.friends.some((idOrUser) => idOrUser.toString() === myId || idOrUser._id?.toString() === myId);
  const sentRequest = targetUser.friendRequests.some(
    (request) => request.from.toString() === myId && request.status === 'pending'
  );
  return isFriend ? 'friend' : sentRequest ? 'pending' : 'none';
};

export const listUsers = async (req, res) => {
  try {
    const { page = 1, gender, minAge, maxAge, location, search } = req.query;
    const pageNumber = toInt(page, 1);
    const skip = (pageNumber - 1) * PAGE_LIMIT;

    const filter = { _id: { $ne: req.user._id } };
    if (gender) filter.gender = gender;
    if (minAge || maxAge) {
      filter.age = {};
      if (minAge) filter.age.$gte = toInt(minAge);
      if (maxAge) filter.age.$lte = toInt(maxAge);
    }
    if (location) filter.location = { $regex: location, $options: 'i' };
    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName:  { $regex: search, $options: 'i' } },
        { profession:{ $regex: search, $options: 'i' } },
      ];
    }

    const users = await User.find(filter)
      .select('firstName lastName profilePic age gender location profession bio friends friendRequests')
      .skip(skip)
      .limit(PAGE_LIMIT)
      .sort({ createdAt: -1 });

    const total = await User.countDocuments(filter);
    const myId = req.user._id.toString();

    const annotated = users.map((user) => ({
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      profilePic: user.profilePic,
      age: user.age,
      gender: user.gender,
      location: user.location,
      profession: user.profession,
      bio: user.bio,
      relationshipStatus: getRelationshipStatus(user, myId),
    }));

    res.json({ users: annotated, total, page: pageNumber, pages: Math.ceil(total / PAGE_LIMIT) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

export const getUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password -googleId')
      .populate('friends', 'firstName lastName profilePic');
    if (!user) return res.status(404).json({ error: 'User not found' });

    res.json({
      user,
      relationshipStatus: getRelationshipStatus(user, req.user._id.toString()),
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

export const sendFriendRequest = async (req, res) => {
  try {
    const { toId } = req.body;
    if (toId === req.user._id.toString()) {
      return res.status(400).json({ error: 'Cannot send request to yourself' });
    }

    const target = await User.findById(toId);
    if (!target) return res.status(404).json({ error: 'User not found' });

    if (target.friends.includes(req.user._id)) {
      return res.status(400).json({ error: 'Already friends' });
    }

    const alreadySent = target.friendRequests.some(
      (r) => r.from.toString() === req.user._id.toString() && r.status === 'pending'
    );
    if (alreadySent) return res.status(400).json({ error: 'Request already sent' });

    target.friendRequests.push({ from: req.user._id, status: 'pending' });
    await target.save();

    res.json({ success: true, message: 'Friend request sent' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

export const acceptFriendRequest = async (req, res) => {
  try {
    const { fromId } = req.body;
    const me = await User.findById(req.user._id);
    const them = await User.findById(fromId);

    if (!me || !them) return res.status(404).json({ error: 'User not found' });

    const requestIndex = me.friendRequests.findIndex(
      (r) => r.from.toString() === fromId && r.status === 'pending'
    );
    if (requestIndex === -1) return res.status(400).json({ error: 'No pending request found' });

    me.friendRequests[requestIndex].status = 'accepted';
    if (!me.friends.includes(them._id)) me.friends.push(them._id);
    if (!them.friends.includes(me._id)) them.friends.push(me._id);

    await me.save();
    await them.save();

    res.json({ success: true, message: 'Friend request accepted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

export const rejectFriendRequest = async (req, res) => {
  try {
    const { fromId } = req.body;
    const me = await User.findById(req.user._id);
    if (!me) return res.status(404).json({ error: 'User not found' });

    const request = me.friendRequests.find(
      (r) => r.from.toString() === fromId && r.status === 'pending'
    );
    if (!request) return res.status(400).json({ error: 'No pending request found' });

    request.status = 'rejected';
    await me.save();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

export const listFriends = async (req, res) => {
  try {
    const me = await User.findById(req.user._id).populate('friends', 'firstName lastName profilePic isOnline lastSeen');
    res.json({ friends: me.friends });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

export const listFriendRequests = async (req, res) => {
  try {
    const me = await User.findById(req.user._id)
      .populate('friendRequests.from', 'firstName lastName profilePic age location profession');
    const pending = me.friendRequests.filter((r) => r.status === 'pending');
    res.json({ requests: pending });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};