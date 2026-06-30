import { Router } from 'express';
import { authenticate } from '../middlewares/auth.js';
import { overview } from '../controllers/dashboardController.js';

const router = Router();
router.use(authenticate);
router.get('/', overview);

export default router;
