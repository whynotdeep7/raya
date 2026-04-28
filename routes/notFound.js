import express from 'express';
import { renderNotFound } from '../controllers/errorController.js';

const router = express.Router();

router.use(renderNotFound);

export default router;