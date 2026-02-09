import { Request, Response } from 'express';
import { supabase } from '../config/supabase';

// Get user's cart with product details
export const getCart = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    const { data: cartItems, error } = await supabase
      .from('carts')
      .select(`
        id,
        quantity,
        product_id,
        products (
          id,
          name,
          price,
          image_url,
          stock
        )
      `)
      .eq('user_id', userId);

    if (error) throw error;

    // Calculate cart total
    const total = cartItems?.reduce((sum, item: any) => {
      return sum + (item.products.price * item.quantity);
    }, 0) || 0;

    res.json({
      cart: cartItems,
      total: total.toFixed(2)
    });
  } catch (error) {
    console.error('Get cart error:', error);
    res.status(500).json({ error: 'Failed to fetch cart' });
  }
};

// Add item to cart
export const addToCart = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { product_id, quantity } = req.body;

    // Validate input
    if (!product_id || !quantity || quantity < 1) {
      return res.status(400).json({ error: 'Invalid product_id or quantity' });
    }

    // Check if product exists and has sufficient stock
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('stock, name')
      .eq('id', product_id)
      .single();

    if (productError || !product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    if (product.stock < quantity) {
      return res.status(400).json({ 
        error: `Insufficient stock. Only ${product.stock} available` 
      });
    }

    // Check if item already in cart
    const { data: existingItem } = await supabase
      .from('carts')
      .select('id, quantity')
      .eq('user_id', userId)
      .eq('product_id', product_id)
      .single();

    if (existingItem) {
      // Update quantity
      const newQuantity = existingItem.quantity + quantity;
      
      if (product.stock < newQuantity) {
        return res.status(400).json({ 
          error: `Cannot add ${quantity} more. Only ${product.stock - existingItem.quantity} available` 
        });
      }

      const { error: updateError } = await supabase
        .from('carts')
        .update({ quantity: newQuantity, updated_at: new Date().toISOString() })
        .eq('id', existingItem.id);

      if (updateError) throw updateError;

      return res.json({ message: 'Cart updated', quantity: newQuantity });
    }

    // Add new item to cart
    const { data: newItem, error: insertError } = await supabase
      .from('carts')
      .insert({
        user_id: userId,
        product_id,
        quantity
      })
      .select()
      .single();

    if (insertError) throw insertError;

    res.status(201).json({ 
      message: 'Item added to cart', 
      item: newItem 
    });
  } catch (error) {
    console.error('Add to cart error:', error);
    res.status(500).json({ error: 'Failed to add item to cart' });
  }
};

// Update cart item quantity
export const updateCartItem = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const { quantity } = req.body;

    if (!quantity || quantity < 1) {
      return res.status(400).json({ error: 'Quantity must be at least 1' });
    }

    // Get cart item with product info
    const { data: cartItem, error: fetchError } = await supabase
      .from('carts')
      .select('product_id, products(stock)')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (fetchError || !cartItem) {
      return res.status(404).json({ error: 'Cart item not found' });
    }

    // Check stock
    const productStock = (cartItem as any).products.stock;
    if (productStock < quantity) {
      return res.status(400).json({ 
        error: `Insufficient stock. Only ${productStock} available` 
      });
    }

    // Update quantity
    const { error: updateError } = await supabase
      .from('carts')
      .update({ quantity, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', userId);

    if (updateError) throw updateError;

    res.json({ message: 'Cart item updated' });
  } catch (error) {
    console.error('Update cart error:', error);
    res.status(500).json({ error: 'Failed to update cart item' });
  }
};

// Remove item from cart
export const removeCartItem = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const { error } = await supabase
      .from('carts')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) throw error;

    res.json({ message: 'Item removed from cart' });
  } catch (error) {
    console.error('Remove cart item error:', error);
    res.status(500).json({ error: 'Failed to remove item from cart' });
  }
};

// Clear entire cart
export const clearCart = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    const { error } = await supabase
      .from('carts')
      .delete()
      .eq('user_id', userId);

    if (error) throw error;

    res.json({ message: 'Cart cleared' });
  } catch (error) {
    console.error('Clear cart error:', error);
    res.status(500).json({ error: 'Failed to clear cart' });
  }
};