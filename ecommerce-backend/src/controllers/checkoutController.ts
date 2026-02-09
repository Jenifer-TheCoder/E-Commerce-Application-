import { Request, Response } from 'express';
import { supabase } from '../config/supabase';

export const checkout = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    // Get cart items with product details
    const { data: cartItems, error: cartError } = await supabase
      .from('carts')
      .select(`
        id,
        quantity,
        product_id,
        products (
          id,
          name,
          price,
          stock
        )
      `)
      .eq('user_id', userId);

    if (cartError) throw cartError;

    if (!cartItems || cartItems.length === 0) {
      return res.status(400).json({ error: 'Cart is empty' });
    }

    // Validate stock for all items
    const stockErrors = [];
    for (const item of cartItems) {
      const product = (item as any).products;
      if (product.stock < item.quantity) {
        stockErrors.push(`${product.name}: only ${product.stock} available`);
      }
    }

    if (stockErrors.length > 0) {
      return res.status(400).json({ 
        error: 'Insufficient stock for some items',
        details: stockErrors
      });
    }

    // Calculate total (ALWAYS on server - never trust client)
    const total = cartItems.reduce((sum, item: any) => {
      return sum + (item.products.price * item.quantity);
    }, 0);

    // Create order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        user_id: userId,
        total_amount: total,
        status: 'pending'
      })
      .select()
      .single();

    if (orderError) throw orderError;

    // Create order items
    const orderItems = cartItems.map((item: any) => ({
      order_id: order.id,
      product_id: item.product_id,
      quantity: item.quantity,
      price_at_purchase: item.products.price
    }));

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems);

    if (itemsError) throw itemsError;

    // Update product stock
    for (const item of cartItems) {
      const product = (item as any).products;
      const { error: stockError } = await supabase
        .from('products')
        .update({ stock: product.stock - item.quantity })
        .eq('id', item.product_id);

      if (stockError) throw stockError;
    }

    // Clear cart
    const { error: clearError } = await supabase
      .from('carts')
      .delete()
      .eq('user_id', userId);

    if (clearError) throw clearError;

    res.json({
      message: 'Order created successfully',
      order: {
        id: order.id,
        total: total.toFixed(2),
        status: order.status,
        created_at: order.created_at
      }
    });
  } catch (error) {
    console.error('Checkout error:', error);
    res.status(500).json({ error: 'Checkout failed' });
  }
};

// Get user's orders
export const getOrders = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    const { data: orders, error } = await supabase
      .from('orders')
      .select(`
        id,
        total_amount,
        status,
        created_at,
        order_items (
          quantity,
          price_at_purchase,
          products (
            name,
            image_url
          )
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({ orders });
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
};