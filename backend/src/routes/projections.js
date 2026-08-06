import { Router } from 'express';
import { authenticate } from '../middlewares/auth.js';
import { list, upsert, remove } from '../controllers/projectionController.js';

const router = Router();
router.use(authenticate);
router.get('/:year', list);
router.put('/:assetId', upsert);
router.delete('/:id', remove);

export default router;
