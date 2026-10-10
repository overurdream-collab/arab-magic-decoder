import { Link } from "@tanstack/react-router";
import { Wrench } from "lucide-react";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 bg-secondary text-secondary-foreground">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link to="/" className="flex items-center gap-2 text-xl font-black">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground"><Wrench className="h-5 w-5" /></span>
          قِطَع
        </Link>
        <nav className="flex gap-5 text-sm font-semibold">
          <Link to="/" activeOptions={{ exact: true }} activeProps={{ className: "text-primary" }}>الرئيسية</Link>
          <Link to="/catalog" activeProps={{ className: "text-primary" }}>الكتالوج</Link>
          <Link to="/garage" activeProps={{ className: "text-primary" }}>سياراتي</Link>
        </nav>
      </div>
    </header>
  );
}
