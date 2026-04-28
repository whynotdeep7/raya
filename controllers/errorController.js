import { getCurrentUser } from '../middleware/auth.js';

export const renderNotFound = async (req, res) => {
  res.status(404).render('404', {
    title: 'Page Not Found — Raya',
    currentUser: req.user || await getCurrentUser(req),
  });
};