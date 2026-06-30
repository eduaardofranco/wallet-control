import { Router } from 'express';
import { authenticate } from '../middlewares/auth.js';
import { list, getById, create, update, remove } from '../controllers/assetController.js';

const router = Router();
router.use(authenticate);
router.get('/', list);
router.get('/:id', getById);
router.post('/', create);
router.put('/:id', update);
router.delete('/:id', remove);

export default router;
