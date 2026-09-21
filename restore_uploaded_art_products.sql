DECLARE @CategoryId int = (SELECT CategoryId FROM Categories WHERE Name = N'Tranh Treo Tường');
IF @CategoryId IS NULL
BEGIN
 INSERT INTO Categories(Name, Description) VALUES(N'Tranh Treo Tường', N'Tranh trang trí phòng khách và không gian sống.');
 SET @CategoryId = SCOPE_IDENTITY();
END
DECLARE @SellerId int = (SELECT UserId FROM Users WHERE Email = 'seller@furnimatch.com');

DECLARE @Products TABLE (Name nvarchar(200), Description nvarchar(max), Price decimal(18,2), L float, W float, H float, ImageUrl nvarchar(300));
INSERT INTO @Products VALUES
(N'Bộ 3 Tranh Cửu Ngư Ánh Kim', N'Bộ ba tranh cá chép ánh kim hiện đại, điểm nhấn sang trọng cho phòng khách.', 1650000, 150, 4, 70, N'/uploads/products/upload-cuu-ngu-anh-kim.jpg'),
(N'Tranh Phong Thủy Chữ An Hoa Mẫu Đơn', N'Tranh chữ An kết hợp hoa mẫu đơn vàng, mang ý nghĩa bình an và thịnh vượng.', 1450000, 120, 4, 60, N'/uploads/products/upload-chu-an-mau-don.jpg'),
(N'Bộ Đôi Tranh Lá Dương Xỉ & Hoa Hồng', N'Bộ tranh canvas đôi phong cách Scandinavian, phù hợp không gian hiện đại.', 1250000, 100, 3, 70, N'/uploads/products/upload-duong-xi-hoa-hong.jpg'),
(N'Tranh Sơn Thủy Hữu Tình', N'Tranh phong cảnh sơn thủy, thác nước và hạc mang nét đẹp thư thái.', 1950000, 140, 4, 80, N'/uploads/products/upload-son-thuy-huu-tinh.jpg'),
(N'Tranh Canvas Mái Nhà Cổ Hoa Trắng', N'Tranh canvas mái nhà cổ dưới tán hoa trắng, tạo không gian ấm áp.', 1350000, 120, 3, 70, N'/uploads/products/upload-mai-nha-co-hoa-trang.jpg'),
(N'Bộ 3 Tranh Sen Trắng & Cá Koi', N'Bộ ba tranh sen trắng và cá koi nổi bật trên nền tối, tượng trưng cho tài lộc.', 1750000, 150, 4, 70, N'/uploads/products/upload-sen-trang-ca-koi.jpg');

DECLARE @Name nvarchar(200), @Description nvarchar(max), @Price decimal(18,2), @L float, @W float, @H float, @ImageUrl nvarchar(300), @ProductId int;
DECLARE product_cursor CURSOR FOR SELECT Name, Description, Price, L, W, H, ImageUrl FROM @Products;
OPEN product_cursor; FETCH NEXT FROM product_cursor INTO @Name,@Description,@Price,@L,@W,@H,@ImageUrl;
WHILE @@FETCH_STATUS = 0
BEGIN
 IF NOT EXISTS (SELECT 1 FROM Products WHERE Name=@Name AND SellerId=@SellerId)
 BEGIN
  INSERT INTO Products(SellerId,CategoryId,Name,Description,Price,ProductionDays,CustomSizeSupported,Length,Width,Height,Status,CreatedAt,UpdatedAt) VALUES(@SellerId,@CategoryId,@Name,@Description,@Price,3,1,@L,@W,@H,'ACTIVE',GETUTCDATE(),GETUTCDATE());
  SET @ProductId=SCOPE_IDENTITY();
  INSERT INTO ProductImages(ProductId,ImageUrl,IsThumbnail,DisplayOrder,CreatedAt) VALUES(@ProductId,@ImageUrl,1,0,GETUTCDATE());
  INSERT INTO ProductVariants(ProductId,SizeName,Length,Width,Height,ProductionDays,Price,Stock) VALUES(@ProductId,N'Kích thước tiêu chuẩn',@L,@W,@H,3,@Price,20),(@ProductId,N'Kích thước lớn',@L+20,@W,@H+10,4,@Price+400000,12);
 END
 FETCH NEXT FROM product_cursor INTO @Name,@Description,@Price,@L,@W,@H,@ImageUrl;
END
CLOSE product_cursor; DEALLOCATE product_cursor;
SELECT ProductId,Name,Price,Status FROM Products WHERE SellerId=@SellerId AND CategoryId=@CategoryId ORDER BY ProductId;
