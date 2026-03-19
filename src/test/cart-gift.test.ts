import { describe, it, expect } from "vitest";
import {
  addItemToCart,
  markOneUnitAsGift,
  unmarkOneGift,
  changeLineQty,
  removeCartLine,
  ensureAllLineIds,
  generateLineId,
} from "@/lib/cartUtils";
import type { CartItem } from "@/hooks/useVendas";

const makeProduct = (id = "prod1", nome = "Progressiva", preco = 100) => ({ id, nome, preco, custo: 10 });

describe("Cart gift/bonus line splitting", () => {
  it("addItemToCart creates a normal line with line_id", () => {
    const cart = addItemToCart([], makeProduct());
    expect(cart).toHaveLength(1);
    expect(cart[0].line_id).toBeTruthy();
    expect(cart[0].bonus).toBe(false);
    expect(cart[0].quantidade).toBe(1);
    expect(cart[0].subtotal).toBe(100);
  });

  it("addItemToCart increments existing normal line, not gift line", () => {
    let cart = addItemToCart([], makeProduct());
    // Mark it as gift
    cart = markOneUnitAsGift(cart, cart[0].line_id);
    expect(cart).toHaveLength(1);
    expect(cart[0].bonus).toBe(true);
    // Add same product again — should create a NEW normal line
    cart = addItemToCart(cart, makeProduct());
    expect(cart).toHaveLength(2);
    const normal = cart.find((i) => !i.bonus);
    const gift = cart.find((i) => i.bonus);
    expect(normal).toBeTruthy();
    expect(gift).toBeTruthy();
  });

  it("markOneUnitAsGift with qty=1 converts line to gift", () => {
    let cart = addItemToCart([], makeProduct());
    cart = markOneUnitAsGift(cart, cart[0].line_id);
    expect(cart).toHaveLength(1);
    expect(cart[0].bonus).toBe(true);
    expect(cart[0].subtotal).toBe(0);
  });

  it("markOneUnitAsGift with qty=2 splits into normal(1) + gift(1)", () => {
    let cart = addItemToCart([], makeProduct());
    cart = addItemToCart(cart, makeProduct()); // qty becomes 2
    expect(cart).toHaveLength(1);
    expect(cart[0].quantidade).toBe(2);

    cart = markOneUnitAsGift(cart, cart[0].line_id);
    expect(cart).toHaveLength(2);
    const normal = cart.find((i) => !i.bonus)!;
    const gift = cart.find((i) => i.bonus)!;
    expect(normal.quantidade).toBe(1);
    expect(normal.subtotal).toBe(100);
    expect(gift.quantidade).toBe(1);
    expect(gift.subtotal).toBe(0);
  });

  it("markOneUnitAsGift with qty=3, mark twice → normal(1) + gift(2)", () => {
    let cart = addItemToCart([], makeProduct());
    cart = addItemToCart(cart, makeProduct());
    cart = addItemToCart(cart, makeProduct()); // qty=3

    cart = markOneUnitAsGift(cart, cart.find((i) => !i.bonus)!.line_id);
    cart = markOneUnitAsGift(cart, cart.find((i) => !i.bonus)!.line_id);

    const normal = cart.find((i) => !i.bonus)!;
    const gift = cart.find((i) => i.bonus)!;
    expect(normal.quantidade).toBe(1);
    expect(gift.quantidade).toBe(2);
  });

  it("unmarkOneGift returns unit to normal line", () => {
    let cart = addItemToCart([], makeProduct());
    cart = addItemToCart(cart, makeProduct()); // qty=2
    cart = markOneUnitAsGift(cart, cart[0].line_id); // split: normal(1) + gift(1)

    const giftLine = cart.find((i) => i.bonus)!;
    cart = unmarkOneGift(cart, giftLine.line_id);

    // Should consolidate back to single normal line
    expect(cart).toHaveLength(1);
    expect(cart[0].bonus).toBe(false);
    expect(cart[0].quantidade).toBe(2);
    expect(cart[0].subtotal).toBe(200);
  });

  it("normal lines merge, gift lines merge, but normal and gift never merge", () => {
    let cart = addItemToCart([], makeProduct());
    cart = addItemToCart(cart, makeProduct()); // merges into qty=2
    expect(cart).toHaveLength(1);
    expect(cart[0].quantidade).toBe(2);

    // Split one as gift
    cart = markOneUnitAsGift(cart, cart[0].line_id);
    expect(cart).toHaveLength(2);

    // Add another of same product — should merge with normal, not gift
    cart = addItemToCart(cart, makeProduct());
    const normal = cart.find((i) => !i.bonus)!;
    const gift = cart.find((i) => i.bonus)!;
    expect(normal.quantidade).toBe(2);
    expect(gift.quantidade).toBe(1);
  });

  it("total only sums paid items, qty sums all", () => {
    let cart = addItemToCart([], makeProduct());
    cart = addItemToCart(cart, makeProduct()); // qty=2
    cart = markOneUnitAsGift(cart, cart[0].line_id); // normal(1) + gift(1)

    const totalPago = cart.filter((i) => !i.bonus).reduce((s, i) => s + i.subtotal, 0);
    const totalQty = cart.reduce((s, i) => s + i.quantidade, 0);
    expect(totalPago).toBe(100);
    expect(totalQty).toBe(2); // both count for stock
  });

  it("ensureAllLineIds adds line_id to legacy items", () => {
    const legacy = [{ produto_id: "x", nome: "Test", quantidade: 1, preco_original: 50, preco_vendido: 50, desconto: 0, bonus: false, subtotal: 50 }] as any;
    const result = ensureAllLineIds(legacy);
    expect(result[0].line_id).toBeTruthy();
  });

  it("removeCartLine removes by line_id", () => {
    let cart = addItemToCart([], makeProduct());
    cart = addItemToCart(cart, makeProduct("prod2", "Outro", 50));
    expect(cart).toHaveLength(2);
    cart = removeCartLine(cart, cart[0].line_id);
    expect(cart).toHaveLength(1);
  });

  it("changeLineQty changes quantity of specific line", () => {
    let cart = addItemToCart([], makeProduct());
    cart = changeLineQty(cart, cart[0].line_id, 2);
    expect(cart[0].quantidade).toBe(3);
    expect(cart[0].subtotal).toBe(300);
  });
});
