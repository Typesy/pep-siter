"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  useState,
  type ReactNode,
} from "react";

const CART_STORAGE_KEY = "pep-siter-cart-v1";

export type CartItem = {
  productId: string;
  slug: string;
  name: string;
  imageUrl: string | null;
  priceCents: number;
  quantity: number;
};

type CartContextValue = {
  items: CartItem[];
  itemCount: number;
  subtotalCents: number;
  addItem: (item: Omit<CartItem, "quantity">, quantity?: number) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  removeItem: (productId: string) => void;
  clearCart: () => void;
  isHydrated: boolean;
};

const CartContext = createContext<CartContextValue | null>(null);

function normalizeCents(value: unknown): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 0) {
    return 0;
  }
  return Math.round(numeric);
}

function normalizeQuantity(value: unknown): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return 1;
  }
  return Math.floor(numeric);
}

function normalizeItem(raw: Partial<CartItem>): CartItem | null {
  if (!raw.productId || !raw.slug || !raw.name) {
    return null;
  }
  return {
    productId: String(raw.productId),
    slug: String(raw.slug),
    name: String(raw.name),
    imageUrl: raw.imageUrl ? String(raw.imageUrl) : null,
    priceCents: normalizeCents(raw.priceCents),
    quantity: normalizeQuantity(raw.quantity),
  };
}

type CartProviderProps = {
  children: ReactNode;
};

function getInitialCart(): CartItem[] {
  if (typeof window === "undefined") {
    return [];
  }
  try {
    const raw = window.localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed
      .map((item) => normalizeItem(item as Partial<CartItem>))
      .filter((item): item is CartItem => Boolean(item));
  } catch {
    return [];
  }
}

export function CartProvider({ children }: CartProviderProps) {
  const [items, setItems] = useState<CartItem[]>(getInitialCart);
  const isHydrated = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  useEffect(() => {
    if (!isHydrated || typeof window === "undefined") {
      return;
    }
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  }, [items, isHydrated]);

  const value = useMemo<CartContextValue>(() => {
    const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
    const subtotalCents = items.reduce(
      (sum, item) => sum + item.priceCents * item.quantity,
      0,
    );

    return {
      items,
      itemCount,
      subtotalCents,
      addItem: (item, quantity = 1) => {
        const safeItem = normalizeItem({ ...item, quantity });
        if (!safeItem) {
          return;
        }
        setItems((prev) => {
          const existing = prev.find((row) => row.productId === safeItem.productId);
          if (!existing) {
            return [...prev, safeItem];
          }
          return prev.map((row) =>
            row.productId === safeItem.productId
              ? { ...row, quantity: row.quantity + safeItem.quantity }
              : row,
          );
        });
      },
      updateQuantity: (productId, quantity) => {
        const safeQuantity = Math.floor(quantity);
        if (safeQuantity <= 0) {
          setItems((prev) => prev.filter((item) => item.productId !== productId));
          return;
        }
        setItems((prev) =>
          prev.map((item) =>
            item.productId === productId
              ? { ...item, quantity: normalizeQuantity(safeQuantity) }
              : item,
          ),
        );
      },
      removeItem: (productId) => {
        setItems((prev) => prev.filter((item) => item.productId !== productId));
      },
      clearCart: () => {
        setItems([]);
      },
      isHydrated,
    };
  }, [items, isHydrated]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used inside CartProvider");
  }
  return context;
}
