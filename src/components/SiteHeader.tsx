import { Link } from "@tanstack/react-router";
import { Wrench } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-primary/40 bg-secondary text-secondary-foreground">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
        <Link to="/" className="flex items-center gap-2 text-xl font-black">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground">
            <Wrench className="h-5 w-5" />
          </span>
          قِطَع
        </Link>
        <div className="flex items-center gap-2">
          <nav className="flex flex-wrap items-center justify-end gap-x-4 gap-y-2 text-sm font-semibold">
            <Link
              to="/"
              activeOptions={{ exact: true }}
              activeProps={{ className: "text-primary-bright" }}
            >
              الرئيسية
            </Link>
            <Link to="/catalog" activeProps={{ className: "text-primary-bright" }}>
              الكتالوج
            </Link>
            <Link to="/garage" activeProps={{ className: "text-primary-bright" }}>
              سياراتي
            </Link>
            <Link to="/seller" activeProps={{ className: "text-primary-bright" }}>
              للتجار
            </Link>
            <Link to="/admin" activeProps={{ className: "text-primary-bright" }}>
              الإدارة
            </Link>
          </nav>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
