using FurniMatch.Api.Models;
using System.Linq;

namespace FurniMatch.Api.Data
{
    public static class SampleDataSeeder
    {
        public static void SeedAdditionalSellersAndProducts(FurniMatchDbContext context)
        {
            var sellerRole = context.Roles.FirstOrDefault(r => r.RoleName == "SELLER");
            if (sellerRole == null) return;
            
            var artCategory = context.Categories.FirstOrDefault(c => c.Name.Contains("Tranh"));
            if (artCategory == null) return;

            string[] imagePaths = new[] { 
                "/uploads/products/tree_house.jpg", 
                "/uploads/products/lotus_fish.jpg", 
                "/uploads/products/golden_fish.jpg", 
                "/uploads/products/waterfall.jpg", 
                "/uploads/products/golden_peony.jpg" 
            };

            string[] productNames = new[] {
                "Tranh Canvas Mái Nhà Cổ & Cây Hoa Ban Nắng Ấm",
                "Bộ 3 Tranh Tráng Gương Hoa Sen Ngọc & Cá Chép",
                "Bộ 3 Tranh Tráng Gương Cá Chép Vàng Nghệ Thuật",
                "Tranh Sơn Thủy Hữu Tình Thác Nước Đại Ngàn",
                "Tranh Phong Thủy Chữ An & Hoa Mẫu Đơn Kim Hoàng"
            };

            for (int i = 1; i <= 7; i++)
            {
                string email = $"seller{i}@furnimatch.com";
                if (!context.Users.Any(u => u.Email == email))
                {
                    var sellerUser = new User
                    {
                        FullName = $"Xưởng Tranh Nghệ Thuật {i}",
                        Email = email,
                        Phone = $"09876543{i:D2}",
                        PasswordHash = BCrypt.Net.BCrypt.HashPassword("Seller@123"),
                        RoleId = sellerRole.RoleId,
                        Status = "ACTIVE",
                        ShopName = $"Xưởng Tranh Nghệ Thuật {i}",
                        ShopDescription = "Chuyên sản xuất tranh canvas, tranh tráng gương phong thủy cao cấp và hiện đại.",
                        IsCustomSizeSupported = true,
                        Province = "Hà Nội",
                        District = "Thanh Xuân",
                        Ward = "Thanh Xuân Trung",
                        AddressDetail = $"Số {i} Nguyễn Trãi"
                    };
                    context.Users.Add(sellerUser);
                    context.SaveChanges();

                    for (int j = 0; j < 5; j++)
                    {
                        var product = new Product
                        {
                            SellerId = sellerUser.UserId,
                            CategoryId = artCategory.CategoryId,
                            Name = $"{productNames[j]} (Bản đặc biệt từ Xưởng {i})",
                            Description = "Tranh trang trí nội thất phong cách hiện đại, mang lại không gian sang trọng và tài lộc cho gia chủ. Bề mặt tranh siêu nét, khung tranh cao cấp.",
                            Price = 1200000 + (j * 150000) + (i * 50000),
                            ProductionDays = 2 + (j % 3),
                            CustomSizeSupported = true,
                            Length = 120,
                            Width = 4,
                            Height = 80,
                            Status = "ACTIVE"
                        };
                        
                        product.ProductImages.Add(new ProductImage { ImageUrl = imagePaths[j], IsThumbnail = true, DisplayOrder = 0 });
                        
                        product.ProductVariants.Add(new ProductVariant { SizeName = "Nhỏ (50x70cm)", Length = 70, Width = 4, Height = 50, ProductionDays = 2, Price = 800000 + (i * 20000), Stock = 50 });
                        product.ProductVariants.Add(new ProductVariant { SizeName = "Lớn (80x120cm)", Length = 120, Width = 4, Height = 80, ProductionDays = 3, Price = 1500000 + (i * 30000), Stock = 30 });
                        
                        context.Products.Add(product);
                    }
                    context.SaveChanges();
                }
            }
        }
    }
}
