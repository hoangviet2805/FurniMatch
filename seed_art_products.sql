-- 1. Ensure Category "Tranh Treo Tường" exists
DECLARE @CategoryId INT;
SELECT @CategoryId = CategoryId FROM Categories WHERE Name = N'Tranh Treo Tường';

IF @CategoryId IS NULL
BEGIN
    INSERT INTO Categories (Name, Description)
    VALUES (N'Tranh Treo Tường', N'Tranh tráng gương ceramic pha lê, tranh canvas nghệ thuật và tranh phong thủy trang trí nội thất phòng khách, phòng ngủ.');
    SET @CategoryId = SCOPE_IDENTITY();
END

-- 2. Ensure Seller exists
DECLARE @SellerId INT;
SELECT @SellerId = UserId FROM Users WHERE Email = 'seller@furnimatch.com';

IF @SellerId IS NULL
BEGIN
    SELECT TOP 1 @SellerId = UserId FROM Users WHERE RoleId = (SELECT RoleId FROM Roles WHERE RoleName = 'SELLER');
END

-- Delete previous test art products if any
DELETE FROM ProductImages WHERE ImageUrl LIKE '/uploads/products/tranh-%';
DELETE FROM ProductVariants WHERE ProductId IN (SELECT ProductId FROM Products WHERE CategoryId = @CategoryId AND SellerId = @SellerId);
DELETE FROM Products WHERE CategoryId = @CategoryId AND SellerId = @SellerId;

-- =========================================================================
-- SẢN PHẨM 1: Bộ 3 Tranh Cửu Ngư Quần Hội & Sen Ngọc Bích
-- =========================================================================
DECLARE @Prod1 INT;
INSERT INTO Products (
    SellerId, CategoryId, Name, Description, Price, ProductionDays, CustomSizeSupported,
    Length, Width, Height, Status, CreatedAt, UpdatedAt
)
VALUES (
    @SellerId, @CategoryId,
    N'Bộ 3 Tranh Tráng Gương Pha Lê Cửu Ngư Quần Hội & Sen Ngọc',
    N'Bộ 3 tranh tráng gương pha lê cao cấp Cửu Ngư Quần Hội kết hợp đóa sen ngọc bích phát tài phát lộc. Bề mặt phủ bóng ceramic chống bám bụi, viền khung composite titan sang trọng, phù hợp trang trí phòng khách, phòng làm việc theo phong thủy thu hút tài lộc.',
    1850000, 3, 1,
    180, 5, 80, 'ACTIVE', GETUTCDATE(), GETUTCDATE()
);
SET @Prod1 = SCOPE_IDENTITY();

INSERT INTO ProductImages (ProductId, ImageUrl, IsThumbnail, DisplayOrder, CreatedAt)
VALUES (@Prod1, '/uploads/products/tranh-cuu-ngu-sen-ngoc.jpg', 1, 0, GETUTCDATE());

INSERT INTO ProductVariants (ProductId, SizeName, Length, Width, Height, ProductionDays, Price, Stock)
VALUES 
(@Prod1, N'Bộ 3 bức (40x60cm x3)', 120, 5, 60, 3, 1450000, 20),
(@Prod1, N'Bộ 3 bức tiêu chuẩn (50x70cm x3)', 150, 5, 70, 3, 1850000, 30),
(@Prod1, N'Bộ 3 bức đại (60x90cm x3)', 180, 5, 90, 4, 2450000, 15);

-- =========================================================================
-- SẢN PHẨM 2: Tranh Canvas Mái Nhà Cổ & Cây Hoa Ban Nắng Ấm Tây Bắc
-- =========================================================================
DECLARE @Prod2 INT;
INSERT INTO Products (
    SellerId, CategoryId, Name, Description, Price, ProductionDays, CustomSizeSupported,
    Length, Width, Height, Status, CreatedAt, UpdatedAt
)
VALUES (
    @SellerId, @CategoryId,
    N'Tranh Canvas Mái Nhà Cổ & Cây Hoa Ban Nắng Ấm Tây Bắc',
    N'Tranh nghệ thuật tái hiện khung cảnh thanh bình vùng cao Tây Bắc với mái ngói rêu phong, tường vàng ấm áp và cây hoa ban trắng bung nở dưới ánh nắng vàng nhẹ. Chất liệu vải canvas kim tuyến cán bóng hoặc tráng gương chống ẩm mốc, khung viền gỗ sồi tự nhiên mộc mạc tinh tế.',
    1200000, 2, 1,
    120, 4, 80, 'ACTIVE', GETUTCDATE(), GETUTCDATE()
);
SET @Prod2 = SCOPE_IDENTITY();

INSERT INTO ProductImages (ProductId, ImageUrl, IsThumbnail, DisplayOrder, CreatedAt)
VALUES (@Prod2, '/uploads/products/tranh-hoa-ban-tay-bac.jpg', 1, 0, GETUTCDATE());

INSERT INTO ProductVariants (ProductId, SizeName, Length, Width, Height, ProductionDays, Price, Stock)
VALUES 
(@Prod2, N'Kích thước nhỏ (50x75cm)', 75, 4, 50, 2, 850000, 25),
(@Prod2, N'Kích thước vừa (60x90cm)', 90, 4, 60, 2, 1200000, 40),
(@Prod2, N'Kích thước lớn (80x120cm)', 120, 4, 80, 3, 1650000, 20);

-- =========================================================================
-- SẢN PHẨM 3: Tranh Tráng Gương Sơn Thủy Hữu Tình Thác Nước Tùng Hạc
-- =========================================================================
DECLARE @Prod3 INT;
INSERT INTO Products (
    SellerId, CategoryId, Name, Description, Price, ProductionDays, CustomSizeSupported,
    Length, Width, Height, Status, CreatedAt, UpdatedAt
)
VALUES (
    @SellerId, @CategoryId,
    N'Tranh Tráng Gương Sơn Thủy Hữu Tình Thác Nước Tùng Hạc',
    N'Bức tranh phong cảnh đại ngàn kỳ vĩ với thác nước luân chuyển tài lộc, đàn hạc tiên ngụ ý trường thọ và ánh bình minh rạng rỡ mang lại vượng khí cho gia chủ. Bề mặt tráng gương cao cấp siêu nét 8K, đèn LED hắt sáng viền lưng tạo chiều sâu cho không gian phòng khách hiện đại.',
    2350000, 4, 1,
    160, 5, 80, 'ACTIVE', GETUTCDATE(), GETUTCDATE()
);
SET @Prod3 = SCOPE_IDENTITY();

INSERT INTO ProductImages (ProductId, ImageUrl, IsThumbnail, DisplayOrder, CreatedAt)
VALUES (@Prod3, '/uploads/products/tranh-son-thuy-huu-tinh.jpg', 1, 0, GETUTCDATE());

INSERT INTO ProductVariants (ProductId, SizeName, Length, Width, Height, ProductionDays, Price, Stock)
VALUES 
(@Prod3, N'Kích thước 60x120cm', 120, 5, 60, 3, 1800000, 15),
(@Prod3, N'Kích thước 80x160cm', 160, 5, 80, 4, 2350000, 25),
(@Prod3, N'Kích thước 100x200cm Khổ Lớn', 200, 5, 100, 5, 3200000, 10);

-- =========================================================================
-- SẢN PHẨM 4: Bộ Đôi Tranh Canvas Scandinavian Dương Xỉ & Hoa Hồng
-- =========================================================================
DECLARE @Prod4 INT;
INSERT INTO Products (
    SellerId, CategoryId, Name, Description, Price, ProductionDays, CustomSizeSupported,
    Length, Width, Height, Status, CreatedAt, UpdatedAt
)
VALUES (
    @SellerId, @CategoryId,
    N'Bộ Đôi Tranh Canvas Scandinavian Dương Xỉ Nhiệt Đới & Hoa Hồng',
    N'Bộ 2 tranh đối xứng phong cách Scandinavian tối giản hiện đại, kết hợp hài hòa giữa sắc xanh mướt của lá dương xỉ rừng nhiệt đới và sắc hồng dịu dàng của bụi hoa hồng Pháp. Mang lại cảm giác thư thái, gần gũi thiên nhiên cho phòng ngủ, phòng khách hoặc căn hộ studio.',
    950000, 2, 1,
    100, 3, 70, 'ACTIVE', GETUTCDATE(), GETUTCDATE()
);
SET @Prod4 = SCOPE_IDENTITY();

INSERT INTO ProductImages (ProductId, ImageUrl, IsThumbnail, DisplayOrder, CreatedAt)
VALUES (@Prod4, '/uploads/products/tranh-duong-xi-hoa-hong.jpg', 1, 0, GETUTCDATE());

INSERT INTO ProductVariants (ProductId, SizeName, Length, Width, Height, ProductionDays, Price, Stock)
VALUES 
(@Prod4, N'Bộ 2 bức (40x60cm x2)', 80, 3, 60, 2, 750000, 30),
(@Prod4, N'Bộ 2 bức tiêu chuẩn (50x70cm x2)', 100, 3, 70, 2, 950000, 50),
(@Prod4, N'Bộ 2 bức lớn (60x90cm x2)', 120, 3, 90, 3, 1350000, 20);

-- =========================================================================
-- SẢN PHẨM 5: Tranh Phong Thủy Chữ An Thư Pháp & Hoa Mẫu Đơn Kim Hoàng
-- =========================================================================
DECLARE @Prod5 INT;
INSERT INTO Products (
    SellerId, CategoryId, Name, Description, Price, ProductionDays, CustomSizeSupported,
    Length, Width, Height, Status, CreatedAt, UpdatedAt
)
VALUES (
    @SellerId, @CategoryId,
    N'Tranh Phong Thủy Chữ An Thư Pháp & Hoa Mẫu Đơn Kim Hoàng',
    N'Bức tranh nghệ thuật thư pháp chữ "An" kết hợp câu chúc "Gia đình vạn sự bình yên - Tài vô lộc đến phúc duyên tràn đầy" và chùm hoa mẫu đơn mạ vàng sang trọng. Biểu trưng cho cuộc sống an lành, thịnh vượng, phú quý và hạnh phúc viên mãn. Rất thích hợp làm quà tân gia, mừng thọ hoặc bài trí phòng khách gia đình.',
    2100000, 3, 1,
    140, 4, 70, 'ACTIVE', GETUTCDATE(), GETUTCDATE()
);
SET @Prod5 = SCOPE_IDENTITY();

INSERT INTO ProductImages (ProductId, ImageUrl, IsThumbnail, DisplayOrder, CreatedAt)
VALUES (@Prod5, '/uploads/products/tranh-chu-an-mau-don.jpg', 1, 0, GETUTCDATE());

INSERT INTO ProductVariants (ProductId, SizeName, Length, Width, Height, ProductionDays, Price, Stock)
VALUES 
(@Prod5, N'Kích thước 50x100cm', 100, 4, 50, 3, 1500000, 15),
(@Prod5, N'Kích thước 60x120cm', 120, 4, 60, 3, 1850000, 25),
(@Prod5, N'Kích thước 70x140cm Tiêu Chuẩn', 140, 4, 70, 3, 2100000, 20);

SELECT p.ProductId, p.Name, c.Name AS CategoryName, p.Price, pi.ImageUrl
FROM Products p
JOIN Categories c ON p.CategoryId = c.CategoryId
LEFT JOIN ProductImages pi ON p.ProductId = pi.ProductId AND pi.IsThumbnail = 1
WHERE p.CategoryId = @CategoryId;
