import { supabase } from "@/integrations/supabase/client";

export const fmtYER = (n: number) => `${Math.round(n).toLocaleString("ar-YE")} ر.ي`;

export const QUALITY: Record<string, string> = {
  oem: "وكالة أصلي",
  first_grade: "تجاري درجة أولى",
  aftermarket: "بديل معتمد",
  used: "تشليح",
};
export const CONDITION: Record<string, string> = { new: "جديد", used: "تشليح" };

export async function fetchCategories() {
  const { data, error } = await supabase.from("categories").select("*").order("sort_order");
  if (error) throw error;
  return data;
}

export async function fetchMakes() {
  const { data, error } = await supabase
    .from("vehicle_makes")
    .select("id,name_ar,name_en,vehicle_models(id,name_ar,name_en,year_start,year_end)")
    .order("name_ar");
  if (error) throw error;
  return data;
}

export type SearchArgs = {
  q?: string | undefined;
  category?: string | undefined;
  model?: string | undefined;
  year?: number | undefined;
};

export async function searchParts(a: SearchArgs) {
  let partIds: string[] | null = null;
  if (a.model) {
    let f = supabase.from("part_fitments").select("part_id").eq("model_id", a.model);
    if (a.year) f = f.lte("year_from", a.year).gte("year_to", a.year);
    const { data, error } = await f;
    if (error) throw error;
    partIds = [...new Set(data.map((d) => d.part_id))];
    if (!partIds.length) return [];
  }
  let q = supabase
    .from("catalog_parts")
    .select(
      "id,oem_number,name_ar,name_en,is_featured,category_id,categories(name_ar,icon),seller_offers(price_yer,condition,quality_grade,is_active,sellers(city,name,is_verified))",
    );
  if (partIds) q = q.in("id", partIds);
  if (a.category) q = q.eq("category_id", a.category);
  if (a.q) {
    const s = a.q.replace(/[%,()]/g, " ").trim();
    q = q.or(`name_ar.ilike.%${s}%,name_en.ilike.%${s}%,oem_number.ilike.%${s}%`);
  }
  const { data, error } = await q.limit(60);
  if (error) throw error;
  // Defense in depth: an unverified shop must not appear in public price comparisons.
  return data.map((part) => ({
    ...part,
    seller_offers: part.seller_offers.filter(
      (offer) => offer.is_active && offer.sellers?.is_verified,
    ),
  }));
}

export async function fetchPart(id: string) {
  const { data, error } = await supabase
    .from("catalog_parts")
    .select(
      "*,categories(name_ar,icon),part_fitments(year_from,year_to,vehicle_models(name_ar,vehicle_makes(name_ar))),seller_offers(*,sellers(*))",
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    ...data,
    seller_offers: data.seller_offers.filter(
      (offer) => offer.is_active && offer.sellers?.is_verified,
    ),
  };
}
