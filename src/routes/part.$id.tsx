import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BadgeCheck, MapPin, Package, Star, Truck } from "lucide-react";
import { CONDITION, QUALITY, fetchPart, fmtYER } from "@/lib/catalog";

export const Route = createFileRoute("/part/$id")({
  head: () => ({
    meta: [
      { title: "تفاصيل القطعة ومقارنة الأسعار — قِطَع" },
      { name: "description", content: "مواصفات القطعة والسيارات المتوافقة ومقارنة أسعار التجار." },
      { property: "og:title", content: "تفاصيل القطعة — قِطَع" },
      { property: "og:description", content: "قارن أسعار التجار للقطعة نفسها." },
    ],
  }),
  component: PartPage,
});

function PartPage() {
  const { id } = Route.useParams();
  const { data: p, isLoading } = useQuery({ queryKey: ["part", id], queryFn: () => fetchPart(id) });
  if (isLoading) return <p className="p-10 text-center text-muted-foreground">جارٍ التحميل…</p>;
  if (!p) return <p className="p-10 text-center">القطعة غير موجودة. <Link to="/catalog" className="text-primary">عودة للكتالوج</Link></p>;
  const offers = [...p.seller_offers].filter((o) => o.is_active).sort((a, b) => Number(a.price_yer) - Number(b.price_yer));
  const specs = Object.entries((p.specs ?? {}) as Record<string, unknown>);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="grid gap-8 md:grid-cols-[1fr_1.4fr]">
        <div className="grid h-64 place-items-center rounded-2xl bg-accent text-primary"><Package className="h-24 w-24" /></div>
        <div>
          <span className="text-sm text-muted-foreground">{p.categories?.name_ar}</span>
          <h1 className="text-3xl font-black">{p.name_ar}</h1>
          <p className="text-muted-foreground" dir="ltr">{p.name_en}</p>
          <p className="mt-3 text-sm">رقم OEM: <b className="font-mono" dir="ltr">{p.oem_number}</b></p>
          {p.alt_numbers.length > 0 && <p className="text-sm text-muted-foreground">أرقام بديلة: <span className="font-mono" dir="ltr">{p.alt_numbers.join(" · ")}</span></p>}
          {p.description_ar && <p className="mt-3">{p.description_ar}</p>}
          {specs.length > 0 && <dl className="mt-4 grid grid-cols-2 gap-2 text-sm">{specs.map(([k, v]) => <div key={k} className="rounded-lg bg-card p-2"><dt className="text-muted-foreground">{k}</dt><dd className="font-semibold">{String(v)}</dd></div>)}</dl>}
          <h3 className="mt-5 font-bold">السيارات المتوافقة</h3>
          <div className="mt-2 flex flex-wrap gap-2">
            {p.part_fitments.map((f, i) => <span key={i} className="rounded-full bg-secondary px-3 py-1 text-xs text-secondary-foreground">{f.vehicle_models?.vehicle_makes?.name_ar} {f.vehicle_models?.name_ar} {f.year_from}–{f.year_to}</span>)}
          </div>
        </div>
      </div>

      <h2 className="mb-3 mt-10 text-2xl font-black">مقارنة أسعار التجار ({offers.length})</h2>
      <div className="space-y-3">
        {offers.map((o, i) => (
          <div key={o.id} className={`flex flex-wrap items-center gap-4 rounded-xl border bg-card p-4 ${i === 0 ? "border-primary" : ""}`}>
            <div className="min-w-48 flex-1">
              <div className="flex items-center gap-1 font-bold">{o.sellers?.name}{o.sellers?.is_verified && <BadgeCheck className="h-4 w-4 text-primary" />}</div>
              <div className="flex gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{o.sellers?.city}</span>
                <span className="flex items-center gap-1"><Star className="h-3 w-3" />{o.sellers?.rating}</span>
              </div>
            </div>
            <span className="rounded-md bg-accent px-2 py-1 text-xs font-semibold">{CONDITION[o.condition] ?? o.condition}</span>
            <span className="rounded-md bg-muted px-2 py-1 text-xs">{QUALITY[o.quality_grade] ?? o.quality_grade}</span>
            <span className="text-xs text-muted-foreground">{o.warranty_months ? `ضمان ${o.warranty_months} شهر` : "بدون ضمان"}</span>
            <span className="flex items-center gap-1 text-xs text-muted-foreground"><Truck className="h-3 w-3" />{o.delivery_days} يوم</span>
            <b className="text-lg text-primary">{fmtYER(Number(o.price_yer))}</b>
            {i === 0 && <span className="text-xs font-bold text-primary">الأرخص</span>}
          </div>
        ))}
      </div>
    </main>
  );
}
