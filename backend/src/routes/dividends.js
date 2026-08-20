import { Router } from 'express';
import { authenticate } from '../middlewares/auth.js';
import { list, create, remove, summary, listAll, createForTicker } from '../controllers/dividendController.js';

const router = Router();
router.use(authenticate);
router.get('/summary', summary);
router.get('/', listAll);
router.post('/', createForTicker);
router.get('/:assetId', list);
router.post('/:assetId', create);
router.delete('/:id', remove);

export default router;
