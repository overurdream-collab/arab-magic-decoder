import { Link } from "@tanstack/react-router";
import { Package } from "lucide-react";
import { fmtYER } from "@/lib/catalog";

type Offer = { price_yer: number; condition: string; is_active: boolean };
export type PartRow = {
  id: string;
  oem_number: string;
  name_ar: string;
  name_en: string;
  image_url?: string | null;
  categories: { name_ar: string } | null;
  seller_offers: Offer[];
};

export function PartCard({ p, condition }: { p: PartRow; condition?: string }) {
  const offers = p.seller_offers.filter(
    (o) => o.is_active && (!condition || o.condition === condition),
  );
  const min = offers.length ? Math.min(...offers.map((o) => Number(o.price_yer))) : null;
  return (
    <Link
      to="/part/$id"
      params={{ id: p.id }}
      className="group flex flex-col rounded-xl border bg-card p-4 transition hover:border-primary hover:shadow-md"
    >
      <div className="mb-3 grid h-24 place-items-center rounded-lg bg-accent text-primary">
        {p.image_url ? (
          <img
            loading="lazy"
            src={p.image_url}
            alt={p.name_ar}
            className="h-24 w-full object-contain"
          />
        ) : (
          <Package className="h-10 w-10" />
        )}
      </div>
      <span className="text-xs text-muted-foreground">{p.categories?.name_ar}</span>
      <h3 className="font-bold leading-snug group-hover:text-primary">{p.name_ar}</h3>
      <span className="font-mono text-xs text-muted-foreground" dir="ltr">
        {p.oem_number}
      </span>
      <div className="mt-auto pt-3 text-sm">
        {min !== null ? (
          <>
            <span className="text-muted-foreground">يبدأ من </span>
            <b className="text-primary">{fmtYER(min)}</b>
            <span className="text-muted-foreground"> · {offers.length} عرض</span>
          </>
        ) : (
          <span className="text-muted-foreground">لا توجد عروض</span>
        )}
      </div>
    </Link>
  );
}
