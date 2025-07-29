import express from 'express';
import { signup, signin, logout, changePassword, } from '../controllers/auth.controller.js';

const router = express.Router();

router.post('/signup', signup);
router.post('/signin', signin);
router.post('/logout', logout);
router.post('/change-password', changePassword);

export default router;