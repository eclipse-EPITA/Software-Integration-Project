import { Router } from 'express';
import { signup, signin, logout, getProfile } from '../controllers/auth.controller';
import verifyToken from '../middleware/authentication';

const router = Router();

router.post('/signup', signup);
router.post('/login', signin);
router.get('/logout', logout);
router.get('/me', verifyToken, getProfile);

export { router };
