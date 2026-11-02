\set ON_ERROR_STOP on
INSERT INTO public.categories(id,slug,name_ar,name_en) VALUES
('92000000-0000-4000-8000-000000000001','e2e-test','اختبار','E2E test');
INSERT INTO public.catalog_parts(id,category_id,oem_number,name_ar,name_en)
VALUES ('93000000-0000-4000-8000-000000000001','92000000-0000-4000-8000-000000000001','QITAA-E2E-001','قطعة اختبار رحلة الشراء','Qitaa E2E test part');
INSERT INTO public.sellers(id,owner_id,name,city,is_verified,seller_type)
VALUES ('94000000-0000-4000-8000-000000000001','91000000-0000-4000-8000-000000000003','متجر اختبار E2E','صنعاء',true,'new_parts');
INSERT INTO public.seller_offers(id,seller_id,part_id,price_yer,stock_qty,condition,quality_grade,is_active)
VALUES ('95000000-0000-4000-8000-000000000001','94000000-0000-4000-8000-000000000001','93000000-0000-4000-8000-000000000001',12500,5,'new','oem',true);
