\set ON_ERROR_STOP on
INSERT INTO public.categories(id,slug,name_ar,name_en) VALUES
('92000000-0000-4000-8000-000000000001','e2e-test','اختبار','E2E test');
INSERT INTO public.catalog_parts(id,category_id,oem_number,name_ar,name_en)
VALUES ('93000000-0000-4000-8000-000000000001','92000000-0000-4000-8000-000000000001','QITAA-E2E-001','قطعة اختبار رحلة الشراء','Qitaa E2E test part');
INSERT INTO public.sellers(id,owner_id,name,seller_type,city,is_verified)
VALUES ('94000000-0000-4000-8000-000000000001', '__SELLER_ID__','متجر اختبار E2E','new_parts','صنعاء',true);
INSERT INTO public.seller_offers(id,seller_id,part_id,price_yer,stock_qty,condition,quality_grade,is_active)
VALUES ('95000000-0000-4000-8000-000000000001','94000000-0000-4000-8000-000000000001','93000000-0000-4000-8000-000000000001',12500,5,'new','oem',true);

-- Synthetic vehicle reference rows used only by the isolated browser E2E.
INSERT INTO public.vehicle_makes(id,name_ar,name_en,country,wmi_codes) VALUES
('96000000-0000-4000-8000-000000000001','شركة اختبار E2E','Qitaa E2E Motors','Testland',ARRAY['TST']);
INSERT INTO public.vehicle_models(id,make_id,name_ar,name_en,year_start,year_end,engine,body_type) VALUES
('97000000-0000-4000-8000-000000000001','96000000-0000-4000-8000-000000000001','طراز اختبار E2E','Qitaa E2E Model',2018,2026,'1.6L','sedan');
