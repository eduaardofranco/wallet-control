import { Router } from 'express';
import { authenticate } from '../middlewares/auth.js';
import { list } from '../controllers/goalController.js';

const router = Router();
router.use(authenticate);
router.get('/:year', list);

export default router;
