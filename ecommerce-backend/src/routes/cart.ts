import express from 'express';
import { authMiddleware } from '../middleware/auth';
import { 
  getCart, 
  addToCart, 
  updateCartItem, 
  removeCartItem,
  clearCart 
} from '../controllers/cartController';

const router = express.Router();

// All cart routes require authentication
router.use(authMiddleware);

router.get('/', getCart);
router.post('/add', addToCart);
router.put('/update/:id', updateCartItem);
router.delete('/remove/:id', removeCartItem);
router.delete('/clear', clearCart);

export default router;