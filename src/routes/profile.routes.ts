import { Router } from 'express';
import { editPassword, logout } from '../controllers/profile.controller';

export const router = Router();

router.put('/password', editPassword);
router.post('/logout', logout);
