import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Search } from "lucide-react";
import { fetchCategories, searchParts } from "@/lib/catalog";
import { VehiclePicker } from "@/components/VehiclePicker";
import { PartCard, type PartRow } from "@/components/PartCard";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "قِطَع — ابحث عن قطع سيارتك برقم الهيكل" },
      {
        name: "description",
        content:
          "سوق قطع غيار السيارات في اليمن: بحث برقم الهيكل، قطع جديدة وتشليح، ومقارنة أسعار التجار.",
      },
      { property: "og:title", content: "قِطَع — قطع غيار سيارتك برقم الهيكل" },
      {
        property: "og:description",
        content: "قطع جديدة وتشليح ومقارنة أسعار التجار في صنعاء وعدن وتعز.",
      },
    ],
  }),
  component: Home,
});

function Home() {
  const nav = useNavigate();
  const [q, setQ] = useState("");
  const [cond, setCond] = useState<"" | "new" | "used">("");
  const { data: cats = [] } = useQuery({ queryKey: ["cats"], queryFn: fetchCategories });
  const { data: parts = [] } = useQuery({ queryKey: ["featured"], queryFn: () => searchParts({}) });
  const featured = (parts as unknown as (PartRow & { is_featured: boolean })[])
    .filter((p) => p.is_featured)
    .slice(0, 8);

  return (
    <main>
      <section className="bg-secondary text-secondary-foreground">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 md:grid-cols-2 md:items-center">
          <div>
            <h1 className="text-4xl font-black leading-tight md:text-5xl">
              القطعة الصحيحة
              <br />
              <span className="text-primary">لسيارتك من أول مرة</span>
            </h1>
            <p className="mt-4 opacity-80">
              أدخل رقم الهيكل أو اختر سيارتك، ونعرض لك فقط القطع المتوافقة مع مقارنة أسعار التجار.
            </p>
            <form
              className="mt-6 flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                nav({
                  to: "/catalog",
                  search: { q: q || undefined, condition: cond || undefined },
                });
              }}
            >
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="اسم القطعة أو رقم OEM"
                className="h-12 flex-1 rounded-lg bg-background px-4 text-foreground"
              />
              <button className="grid w-12 place-items-center rounded-lg bg-primary text-primary-foreground">
                <Search />
              </button>
            </form>
            <div className="mt-3 inline-flex rounded-lg bg-background/10 p-1 text-sm">
              {(
                [
                  ["", "الكل"],
                  ["new", "قطع جديدة"],
                  ["used", "تشليح"],
                ] as const
              ).map(([v, l]) => (
                <button
                  key={v}
                  onClick={() => setCond(v)}
                  className={`rounded-md px-4 py-1.5 font-semibold ${cond === v ? "bg-primary text-primary-foreground" : ""}`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>
          <VehiclePicker />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10">
        <h2 className="mb-4 text-2xl font-black">الفئات</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {cats.map((c) => (
            <Link
              key={c.id}
              to="/catalog"
              search={{ category: c.id }}
              className="rounded-xl border bg-card p-4 text-center font-bold transition hover:border-primary hover:text-primary"
            >
              <div className="mb-1 text-2xl">{c.icon}</div>
              {c.name_ar}
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16">
        <h2 className="mb-4 text-2xl font-black">قطع مميزة</h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {featured.map((p) => (
            <PartCard key={p.id} p={p} />
          ))}
        </div>
      </section>
    </main>
  );
}
