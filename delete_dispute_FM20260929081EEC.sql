-- ============================================================
-- SQL Xóa đơn khiếu nại FM20260929081EEC và reset trạng thái đơn hàng
-- Chạy script này trong Supabase Dashboard -> SQL Editor (nếu muốn xóa tận gốc trong DB)
-- ============================================================

-- 1. Tìm OrderId của mã đơn FM20260929081EEC
-- 2. Xóa bản ghi trong OrderDisputes liên quan tới đơn này
DELETE FROM "OrderDisputes"
WHERE "OrderId" IN (
    SELECT "OrderId" FROM "Orders" WHERE "OrderCode" = 'FM20260929081EEC'
);

-- 3. Cập nhật lại trạng thái đơn hàng thành hoàn tất (COMPLETED / PAID) thay vì REFUNDED
UPDATE "Orders"
SET "PayoutStatus" = 'PAID',
    "PaymentStatus" = 'PAID'
WHERE "OrderCode" = 'FM20260929081EEC';

