/**
 * Cart utility functions for proper gift/bonus line splitting.
 *
 * Rules:
 * - Each cart line has a unique `line_id`
 * - Lines with same `produto_id` but different `bonus` status are NEVER merged
 * - `markOneUnitAsGift` splits a normal line, moving 1 unit to a gift line
 * - `unmarkOneGift` moves 1 unit from a gift line back to a normal line
 */

import type { CartItem, KitItemRef } from "@/hooks/useVendas";

let _lineCounter = 0;
export function generateLineId(): string {
  _lineCounter += 1;
  return `line_${Date.now()}_${_lineCounter}_${Math.random().toString(36).slice(2, 6)}`;
}

/** Ensure a cart item has a line_id (backcompat for legacy carts) */
export function ensureLineId(item: CartItem): CartItem {
  if (item.line_id) return item;
  return { ...item, line_id: generateLineId() };
}

/** Ensure all items in cart have line_ids */
export function ensureAllLineIds(cart: CartItem[]): CartItem[] {
  let changed = false;
  const result = cart.map((item) => {
    if (item.line_id) return item;
    changed = true;
    return { ...item, line_id: generateLineId() };
  });
  return changed ? result : cart;
}

/** Recalculate subtotal for a line */
function recalcSubtotal(item: CartItem): CartItem {
  if (item.bonus) {
    return { ...item, subtotal: 0, preco_vendido: 0 };
  }
  return { ...item, subtotal: item.quantidade * item.preco_vendido - item.desconto };
}

/**
 * Add a product to cart. Only merges with existing NON-bonus lines of the same produto_id.
 */
export function addItemToCart(
  cart: CartItem[],
  produto: { id: string; nome: string; preco: number; custo?: number; is_kit?: boolean; kit_itens?: KitItemRef[] }
): CartItem[] {
  // Find existing non-bonus line for this product
  const existingIdx = cart.findIndex((i) => i.produto_id === produto.id && !i.bonus);
  if (existingIdx >= 0) {
    return cart.map((item, i) => {
      if (i !== existingIdx) return item;
      const newQty = item.quantidade + 1;
      return { ...item, quantidade: newQty, subtotal: newQty * item.preco_vendido - item.desconto };
    });
  }

  const newItem: CartItem = {
    line_id: generateLineId(),
    produto_id: produto.id,
    nome: produto.nome,
    quantidade: 1,
    preco_original: Number(produto.preco),
    preco_vendido: Number(produto.preco),
    desconto: 0,
    bonus: false,
    subtotal: Number(produto.preco),
    custo_unitario: Number(produto.custo ?? 0),
  };
  if (produto.is_kit && produto.kit_itens) {
    newItem.is_kit = true;
    newItem.kit_itens = produto.kit_itens;
  }
  return [...cart, newItem];
}

/**
 * Mark one unit from a normal line as gift.
 * - If line has qty > 1: decrement normal line, create/increment gift line
 * - If line has qty === 1: convert to gift or merge into existing gift line
 */
export function markOneUnitAsGift(cart: CartItem[], lineId: string): CartItem[] {
  const idx = cart.findIndex((i) => i.line_id === lineId);
  if (idx < 0) return cart;
  const line = cart[idx];
  if (line.bonus) return cart; // Already a gift line

  // Find existing gift line for same product
  const giftIdx = cart.findIndex((i) => i.produto_id === line.produto_id && i.bonus);

  let result = [...cart];

  if (line.quantidade === 1) {
    // Remove this normal line
    result.splice(idx, 1);
    if (giftIdx >= 0) {
      // Adjust giftIdx after splice
      const adjustedGiftIdx = giftIdx > idx ? giftIdx - 1 : giftIdx;
      result = result.map((item, i) => {
        if (i !== adjustedGiftIdx) return item;
        return recalcSubtotal({ ...item, quantidade: item.quantidade + 1 });
      });
    } else {
      // Create new gift line
      result.push(recalcSubtotal({
        ...line,
        line_id: generateLineId(),
        quantidade: 1,
        bonus: true,
        desconto: 0,
      }));
    }
  } else {
    // Decrement normal line
    result = result.map((item, i) => {
      if (i !== idx) return item;
      const newQty = item.quantidade - 1;
      return { ...item, quantidade: newQty, subtotal: newQty * item.preco_vendido - item.desconto };
    });
    if (giftIdx >= 0) {
      result = result.map((item, i) => {
        if (i !== giftIdx) return item;
        return recalcSubtotal({ ...item, quantidade: item.quantidade + 1 });
      });
    } else {
      result.push(recalcSubtotal({
        ...line,
        line_id: generateLineId(),
        quantidade: 1,
        bonus: true,
        desconto: 0,
      }));
    }
  }

  return result;
}

/**
 * Unmark one unit from a gift line back to normal.
 * - Decrements gift line (removes if qty becomes 0)
 * - Increments or creates a normal line for the same product
 */
export function unmarkOneGift(cart: CartItem[], lineId: string): CartItem[] {
  const idx = cart.findIndex((i) => i.line_id === lineId);
  if (idx < 0) return cart;
  const line = cart[idx];
  if (!line.bonus) return cart; // Not a gift line

  // Find existing normal line for same product
  const normalIdx = cart.findIndex((i) => i.produto_id === line.produto_id && !i.bonus);

  let result = [...cart];

  if (line.quantidade === 1) {
    // Remove gift line
    result.splice(idx, 1);
  } else {
    // Decrement gift line
    result = result.map((item, i) => {
      if (i !== idx) return item;
      return recalcSubtotal({ ...item, quantidade: item.quantidade - 1 });
    });
  }

  // Adjust normalIdx after potential splice
  const adjustedNormalIdx = (line.quantidade === 1 && normalIdx > idx) ? normalIdx - 1 : normalIdx;

  if (adjustedNormalIdx >= 0 && adjustedNormalIdx < result.length) {
    result = result.map((item, i) => {
      if (i !== adjustedNormalIdx) return item;
      const newQty = item.quantidade + 1;
      return { ...item, quantidade: newQty, subtotal: newQty * item.preco_vendido - item.desconto };
    });
  } else {
    // Create new normal line
    result.push(recalcSubtotal({
      ...line,
      line_id: generateLineId(),
      quantidade: 1,
      bonus: false,
      desconto: 0,
      preco_vendido: line.preco_original,
    }));
  }

  return result;
}

/**
 * Update a cart item by line_id, recalculating subtotal.
 */
export function updateCartItem(cart: CartItem[], lineId: string, updates: Partial<CartItem>): CartItem[] {
  return cart.map((item) => {
    if (item.line_id !== lineId) return item;
    
    const merged = { ...item, ...updates };
    if (merged.bonus) {
      merged.subtotal = 0;
    } else {
      merged.subtotal = merged.quantidade * merged.preco_vendido - merged.desconto;
    }
    return merged;
  });
}

/**
 * Change quantity of a specific line.
 */
export function changeLineQty(cart: CartItem[], lineId: string, delta: number): CartItem[] {
  return cart.map((item) => {
    if (item.line_id !== lineId) return item;
    const newQty = Math.max(1, item.quantidade + delta);
    
    if (item.bonus) {
      return { ...item, quantidade: newQty, subtotal: 0 };
    }

    let newDesconto = item.desconto;
    // If there was an auto-discount (price edited), adjust it proportionally to new quantity
    if (item.preco_vendido < item.preco_original) {
      newDesconto = (item.preco_original - item.preco_vendido) * newQty;
    }

    return { 
      ...item, 
      quantidade: newQty, 
      desconto: newDesconto,
      subtotal: newQty * item.preco_vendido - newDesconto 
    };
  });
}

/**
 * Remove a line by line_id.
 */
export function removeCartLine(cart: CartItem[], lineId: string): CartItem[] {
  return cart.filter((i) => i.line_id !== lineId);
}
