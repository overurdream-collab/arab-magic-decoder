import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";
import { CONDITION, QUALITY, fetchCategories, searchParts } from "@/lib/catalog";
import { PartCard, type PartRow } from "@/components/PartCard";

const schema = z.object({
  q: z.string().optional(),
  category: z.string().optional(),
  model: z.string().optional(),
  year: z.coerce.number().optional(),
  condition: z.enum(["new", "used"]).optional(),
  quality: z.string().optional(),
  city: z.string().optional(),
});

export const Route = createFileRoute("/catalog")({
  validateSearch: schema,
  head: () => ({
    meta: [
      { title: "كتالوج قطع الغيار — قِطَع" },
      {
        name: "description",
        content: "تصفح قطع الغيار حسب الفئة والسيارة، وفلتر حسب جديد/تشليح والجودة والمدينة.",
      },
      { property: "og:title", content: "كتالوج قطع الغيار — قِطَع" },
      { property: "og:description", content: "فلاتر جديد وتشليح ووكالة ودرجة أولى والمدينة." },
    ],
  }),
  component: Catalog,
});

type Row = Omit<PartRow, "seller_offers"> & {
  seller_offers: (PartRow["seller_offers"][number] & {
    quality_grade: string;
    sellers: { city: string } | null;
  })[];
};

function Catalog() {
  const s = Route.useSearch();
  const nav = useNavigate({ from: "/catalog" });
  const set = (k: string, v?: string) => nav({ search: (p) => ({ ...p, [k]: v || undefined }) });
  const { data: cats = [] } = useQuery({ queryKey: ["cats"], queryFn: fetchCategories });
  const {
    data = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["search", s.q, s.category, s.model, s.year],
    queryFn: () => searchParts(s),
  });
  const rows = (data as unknown as Row[])
    .map((p) => ({
      ...p,
      seller_offers: p.seller_offers.filter(
        (o) =>
          (!s.condition || o.condition === s.condition) &&
          (!s.quality || o.quality_grade === s.quality) &&
          (!s.city || o.sellers?.city === s.city),
      ),
    }))
    .filter((p) => (!s.condition && !s.quality && !s.city) || p.seller_offers.length);
  const cities = [
    ...new Set(
      (data as unknown as Row[]).flatMap(
        (p) => p.seller_offers.map((o) => o.sellers?.city).filter(Boolean) as string[],
      ),
    ),
  ];
  const logged = useRef("");
  useEffect(() => {
    if (isLoading || isError || rows.length !== 0 || !s.q?.trim()) return;
    const key = JSON.stringify([s.q, s.category, s.model, s.year, s.condition, s.quality, s.city]);
    if (key === logged.current) return;
    logged.current = key;
    void supabase.rpc("record_zero_result_search", { _term: s.q.trim() });
  }, [
    isLoading,
    isError,
    rows.length,
    s.q,
    s.category,
    s.model,
    s.year,
    s.condition,
    s.quality,
    s.city,
  ]);
  const chip = (on: boolean) =>
    `rounded-full border px-3 py-1 text-sm ${on ? "border-primary bg-primary text-primary-foreground" : "bg-card"}`;

  return (
    <main className="mx-auto grid max-w-6xl gap-6 px-4 py-8 md:grid-cols-[240px_1fr]">
      <aside className="space-y-5">
        <input
          defaultValue={s.q}
          onKeyDown={(e) => e.key === "Enter" && set("q", e.currentTarget.value)}
          placeholder="ابحث بالاسم أو OEM"
          className="h-10 w-full rounded-lg border bg-card px-3"
        />
        <F t="النوع">
          {[["", "الكل"], ...Object.entries(CONDITION)].map(([v, l]) => (
            <button
              key={v}
              className={chip((s.condition ?? "") === v)}
              onClick={() => set("condition", v)}
            >
              {l}
            </button>
          ))}
        </F>
        <F t="الجودة">
          {[["", "الكل"], ...Object.entries(QUALITY)].map(([v, l]) => (
            <button
              key={v}
              className={chip((s.quality ?? "") === v)}
              onClick={() => set("quality", v)}
            >
              {l}
            </button>
          ))}
        </F>
        <F t="المدينة">
          {["", ...cities].map((c) => (
            <button key={c} className={chip((s.city ?? "") === c)} onClick={() => set("city", c)}>
              {c || "الكل"}
            </button>
          ))}
        </F>
        <F t="الفئة">
          {[{ id: "", name_ar: "الكل" }, ...cats].map((c) => (
            <button
              key={c.id}
              className={chip((s.category ?? "") === c.id)}
              onClick={() => set("category", c.id)}
            >
              {c.name_ar}
            </button>
          ))}
        </F>
      </aside>
      <section>
        <h1 className="mb-1 text-2xl font-black">النتائج</h1>
        {s.model && (
          <p className="mb-4 text-sm font-semibold text-primary">
            قائمة مرشحة حسب بيانات توافق أولية؛ أكّد الملاءمة مع التاجر
            {s.year ? ` (${s.year})` : ""}
          </p>
        )}
        {isLoading ? (
          <p className="text-muted-foreground">جارٍ التحميل…</p>
        ) : rows.length === 0 ? (
          <p className="text-muted-foreground">لا توجد قطع مطابقة.</p>
        ) : (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
            {rows.map((p) => (
              <PartCard key={p.id} p={p} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function F({ t, children }: { t: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-2 text-sm font-bold">{t}</h3>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}
