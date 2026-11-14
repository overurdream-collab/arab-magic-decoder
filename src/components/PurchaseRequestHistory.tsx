import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

type RequestEvent = {
  id: number;
  actor_id: string | null;
  from_status: string | null;
  to_status: string;
  review_note: string | null;
  occurred_at: string;
};

const EVENT_LABEL: Record<string, string> = {
  requested: "أرسل المشتري الطلب",
  accepted: "وافق التاجر وحجز الكمية",
  rejected: "رفض التاجر",
  cancelled: "ألغى المشتري الطلب",
  fulfilled: "أكد التاجر التجهيز أو التسليم",
};

export function PurchaseRequestHistory({ requestId }: { requestId: string }) {
  const [open, setOpen] = useState(false);
  const { data = [], isLoading, isError } = useQuery({
    queryKey: ["purchase-request-events", requestId],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("list_purchase_request_events", {
        _request_id: requestId,
      });
      if (error) throw error;
      return data as unknown as RequestEvent[];
    },
  });

  return (
    <div className="w-full">
      <button
        type="button"
        className="rounded-lg border px-3 py-2 text-sm"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        {open ? "إخفاء سجل الطلب" : "عرض سجل الطلب"}
      </button>
      {open && (
        <div className="mt-3 rounded-lg bg-muted/40 p-3">
          {isLoading && <p className="text-sm">جارٍ تحميل سجل الطلب…</p>}
          {isError && (
            <p role="alert" className="text-sm text-destructive">
              تعذر تحميل سجل الطلب.
            </p>
          )}
          {!isLoading && !isError && data.length === 0 && (
            <p className="text-sm text-muted-foreground">لا توجد أحداث مسجلة.</p>
          )}
          {!isLoading && !isError && data.length > 0 && (
            <ol className="space-y-3">
              {data.map((event) => (
                <li key={event.id} className="border-s-2 border-primary ps-3">
                  <p className="text-sm font-semibold">
                    {EVENT_LABEL[event.to_status] ?? event.to_status}
                  </p>
                  <time className="text-xs text-muted-foreground">
                    {new Date(event.occurred_at).toLocaleString("ar-YE")}
                  </time>
                  {event.review_note && (
                    <p className="mt-1 text-sm text-muted-foreground">
                      الملاحظة: {event.review_note}
                    </p>
                  )}
                </li>
              ))}
            </ol>
          )}
        </div>
      )}
    </div>
  );
}
