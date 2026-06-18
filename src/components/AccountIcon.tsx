import { Link, useNavigate } from "@tanstack/react-router";
import { User, LogOut } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export function AccountIcon() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate({ to: "/" });
  };

  return (
    <div className="flex items-center gap-1.5">
      <Link
        to={user ? "/dashboard" : "/login"}
        className="grid place-items-center w-10 h-10 rounded-full glass-strong text-primary hover:scale-105 transition-transform"
        aria-label={user ? "My dashboard" : "Login"}
        title={user ? "My dashboard" : "Login"}
      >
        <User className="w-4 h-4" />
      </Link>
      {user && (
        <button
          onClick={handleLogout}
          className="grid place-items-center w-10 h-10 rounded-full glass-strong text-foreground hover:text-[var(--color-destructive)] hover:scale-105 transition-transform"
          aria-label="Sign out"
          title="Sign out"
        >
          <LogOut className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
