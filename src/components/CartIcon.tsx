import { Link } from "@tanstack/react-router";
import { ShoppingCart } from "lucide-react";
import { useCart } from "@/context/CartContext";

export function CartIcon() {
  const { count } = useCart();
  return (
    <Link to="/cart" className="relative grid place-items-center w-10 h-10 rounded-full glass-strong text-primary hover:scale-105 transition-transform" aria-label="Cart">
      <ShoppingCart className="w-4 h-4" />
      {count > 0 && (
        <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 rounded-full bg-[var(--color-orange)] text-white text-[10px] font-semibold grid place-items-center">
          {count}
        </span>
      )}
    </Link>
  );
}
