import { Router } from 'express';
import { register, login } from '../controllers/users.controller';

const usersRouter = Router();

usersRouter.post('/register', register);
usersRouter.post('/login', login);

export { usersRouter as router };
