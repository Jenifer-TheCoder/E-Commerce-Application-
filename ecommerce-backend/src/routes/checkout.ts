import express from 'express';
import { authMiddleware } from '../middleware/auth';
import { checkout, getOrders } from '../controllers/checkoutController';

const router = express.Router();

router.use(authMiddleware);

router.post('/', checkout);
router.get('/orders', getOrders);

export default router;