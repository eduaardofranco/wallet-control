import { Router } from 'express';
import { authenticate } from '../middlewares/auth.js';
import { list, create, remove, update, listAll, createForTicker } from '../controllers/purchaseController.js';

const router = Router();
router.use(authenticate);
router.get('/', listAll);
router.post('/', createForTicker);
router.get('/:assetId', list);
router.post('/:assetId', create);
router.put('/:id', update);
router.delete('/:id', remove);

export default router;
