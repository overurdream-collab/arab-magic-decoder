import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

type Gap = { term: string; total_hits: number; last_day: string };

export function SearchGapAnalytics() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["admin-search-gaps"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_search_gap_summary");
      if (error) throw error;
      return data as unknown as Gap[];
    },
  });
  return (
    <section className="space-y-3 rounded-2xl border bg-card p-5">
      <h2 className="text-xl font-bold">ما الذي يبحث عنه العملاء ولا يجدونه؟</h2>
      <p className="text-sm text-muted-foreground">
        تجميع كلمات البحث التي لم تُظهر نتائج خلال آخر 30 يومًا. لا يتم تسجيل عناوين العملاء أو
        أرقام الهياكل أو معلومات الحسابات. الأرقام مؤشرات على الطلب وليست بيانات مبيعات فعلية.
      </p>
      {isLoading && <p>جاري تحميل مؤشرات الطلب…</p>}
      {isError && (
        <p role="alert" className="text-destructive">
          تعذر تحميل الإحصائيات. قد يحتاج ترحيل التحليلات إلى التفعيل.
        </p>
      )}
      {data && (
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="p-3">كلمة البحث</th>
                <th className="p-3">عدد مرات الرصد</th>
                <th className="p-3">آخر تاريخ</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row) => (
                <tr key={row.term} className="border-t">
                  <td className="p-3 font-semibold">{row.term}</td>
                  <td className="p-3">{row.total_hits}</td>
                  <td className="p-3">{row.last_day}</td>
                </tr>
              ))}
              {data.length === 0 && (
                <tr>
                  <td className="p-4 text-muted-foreground" colSpan={3}>
                    لا توجد عمليات بحث بلا نتائج مسجلة.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
