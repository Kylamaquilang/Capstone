"use client";
import { createContext, useContext, useState } from "react";

const CartContext = createContext();

export function CartProvider({ children }) {
  const [cartItems, setCartItems] = useState([]);

  // Add product to cart
  const addToCart = (product) => {
    setCartItems((prev) => {
      const existing = prev.find(
        (item) =>
          item.name === product.name &&
          item.size === product.size // Only match same size
      );
      if (existing) {
        // If product with same size already in cart, update qty
        return prev.map((item) =>
          item.name === product.name && item.size === product.size
            ? { ...item, quantity: item.quantity + product.quantity }
            : item
        );
      } else {
        return [...prev, product];
      }
    });
  };

  // Remove product
  const removeFromCart = (name, size) => {
    setCartItems((prev) =>
      prev.filter((item) => !(item.name === name && item.size === size))
    );
  };

  // Update quantity
  const updateQuantity = (name, size, qty) => {
    setCartItems((prev) =>
      prev.map((item) =>
        item.name === name && item.size === size
          ? { ...item, quantity: qty }
          : item
      )
    );
  };

  return (
    <CartContext.Provider
      value={{ cartItems, addToCart, removeFromCart, updateQuantity }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  return useContext(CartContext);
}
