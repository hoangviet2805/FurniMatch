using FurniMatch.Api.Data;
using FurniMatch.Api.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers().AddJsonOptions(options => 
{
    options.JsonSerializerOptions.ReferenceHandler = System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles;
});

// Add DbContext
builder.Services.AddDbContext<FurniMatchDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

// Add Email Service
builder.Services.AddScoped<IEmailService, EmailService>();
builder.Services.AddHttpClient<MomoPaymentService>();
builder.Services.Configure<SePayOptions>(builder.Configuration.GetSection("SePay"));
builder.Services.AddHttpClient<SePayPaymentService>(client => client.BaseAddress = new Uri("https://userapi.sepay.vn/v2/"));

// Add Authentication
var jwtSettings = builder.Configuration.GetSection("Jwt");
builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = jwtSettings["Issuer"],
        ValidAudience = jwtSettings["Audience"],
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSettings["Key"]!))
    };
});

// Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Add CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll",
        policy =>
        {
            policy.WithOrigins("http://localhost:5173", "http://localhost:5174")
                  .AllowAnyHeader()
                  .AllowAnyMethod();
        });
});

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

using (var scope = app.Services.CreateScope())
{
    var context = scope.ServiceProvider.GetRequiredService<FurniMatchDbContext>();
    if (!context.Categories.Any())
    {
        context.Categories.AddRange(
            new FurniMatch.Api.Models.Category { Name = "Tủ Bếp" },
            new FurniMatch.Api.Models.Category { Name = "Bàn Trà" },
            new FurniMatch.Api.Models.Category { Name = "Sofa" },
            new FurniMatch.Api.Models.Category { Name = "Giường Ngủ" }
        );
        context.SaveChanges();
    }

    // Seed Admin Role & User
    var adminRole = context.Roles.FirstOrDefault(r => r.RoleName == "ADMIN");
    if (adminRole == null)
    {
        adminRole = new FurniMatch.Api.Models.Role { RoleName = "ADMIN" };
        context.Roles.Add(adminRole);
        context.SaveChanges();
    }

    if (!context.Users.Any(u => u.Email == "admin@furnimatch.com"))
    {
        var adminUser = new FurniMatch.Api.Models.User
        {
            FullName = "System Administrator",
            Email = "admin@furnimatch.com",
            Phone = "0123456789",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("Admin@123"),
            RoleId = adminRole.RoleId,
            Status = "ACTIVE"
        };
        context.Users.Add(adminUser);
        context.SaveChanges();
    }

    // Seed Customer Role & User
    var customerRole = context.Roles.FirstOrDefault(r => r.RoleName == "CUSTOMER");
    if (customerRole == null)
    {
        customerRole = new FurniMatch.Api.Models.Role { RoleName = "CUSTOMER" };
        context.Roles.Add(customerRole);
        context.SaveChanges();
    }

    if (!context.Users.Any(u => u.Email == "user@furnimatch.com"))
    {
        var customerUser = new FurniMatch.Api.Models.User
        {
            FullName = "Nguyễn Văn Khách",
            Email = "user@furnimatch.com",
            Phone = "0901234567",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("User@123"),
            RoleId = customerRole.RoleId,
            Status = "ACTIVE",
            Province = "Hà Nội",
            District = "Cầu Giấy",
            Ward = "Dịch Vọng Hậu",
            AddressDetail = "Tầng 5, Tòa nhà FPT"
        };
        context.Users.Add(customerUser);
        context.SaveChanges();
    }

    // Seed Seller Role & User
    var sellerRole = context.Roles.FirstOrDefault(r => r.RoleName == "SELLER");
    if (sellerRole == null)
    {
        sellerRole = new FurniMatch.Api.Models.Role { RoleName = "SELLER" };
        context.Roles.Add(sellerRole);
        context.SaveChanges();
    }

    if (!context.Users.Any(u => u.Email == "seller@furnimatch.com"))
    {
        var sellerUser = new FurniMatch.Api.Models.User
        {
            FullName = "Xưởng Mộc Hoàng Gia",
            Email = "seller@furnimatch.com",
            Phone = "0912345678",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("Seller@123"),
            RoleId = sellerRole.RoleId,
            Status = "ACTIVE",
            ShopName = "Xưởng Mộc Hoàng Gia",
            ShopDescription = "Chuyên sản xuất và thi công nội thất cao cấp theo yêu cầu.",
            IsCustomSizeSupported = true,
            Province = "Hà Nội",
            District = "Thạch Thất",
            Ward = "Canh Nậu",
            AddressDetail = "Cụm làng nghề Canh Nậu, Thạch Thất"
        };
        context.Users.Add(sellerUser);
        context.SaveChanges();
    }

    // Seed Category Tranh Treo Tường
    var artCategory = context.Categories.FirstOrDefault(c => c.Name.Contains("Tranh"));
    if (artCategory == null)
    {
        artCategory = new FurniMatch.Api.Models.Category
        {
            Name = "Tranh Treo Tường",
            Description = "Tranh tráng gương ceramic pha lê, tranh canvas nghệ thuật và tranh phong thủy trang trí nội thất."
        };
        context.Categories.Add(artCategory);
        context.SaveChanges();
    }
    else
    {
        artCategory.Name = "Tranh Treo Tường";
        artCategory.Description = "Tranh tráng gương ceramic pha lê, tranh canvas nghệ thuật và tranh phong thủy trang trí nội thất.";
        context.SaveChanges();
    }

    var defaultSeller = context.Users.FirstOrDefault(u => u.Email == "seller@furnimatch.com");
    // Only add sample art products to an empty catalog. Never delete existing seller products on startup.
    if (defaultSeller != null && !context.Products.Any(p => p.CategoryId == artCategory.CategoryId && p.SellerId == defaultSeller.UserId))
    {
        var existingProducts = context.Products.Where(p => p.CategoryId == artCategory.CategoryId).ToList();
        if (existingProducts.Any())
        {
            var pIds = existingProducts.Select(p => p.ProductId).ToList();
            var imgs = context.ProductImages.Where(pi => pIds.Contains(pi.ProductId));
            context.ProductImages.RemoveRange(imgs);
            var vars = context.ProductVariants.Where(pv => pIds.Contains(pv.ProductId));
            context.ProductVariants.RemoveRange(vars);
            context.Products.RemoveRange(existingProducts);
            context.SaveChanges();
        }

        // 1. Cửu Ngư Quần Hội
        var p1 = new FurniMatch.Api.Models.Product
        {
            SellerId = defaultSeller.UserId,
            CategoryId = artCategory.CategoryId,
            Name = "Bộ 3 Tranh Tráng Gương Pha Lê Cửu Ngư Quần Hội & Sen Ngọc",
            Description = "Bộ 3 tranh tráng gương pha lê cao cấp Cửu Ngư Quần Hội kết hợp đóa sen ngọc bích phát tài phát lộc. Bề mặt phủ bóng ceramic chống bám bụi, viền khung composite titan sang trọng, phù hợp trang trí phòng khách, phòng làm việc theo phong thủy thu hút tài lộc.",
            Price = 1850000,
            ProductionDays = 3,
            CustomSizeSupported = true,
            Length = 180,
            Width = 5,
            Height = 80,
            Status = "ACTIVE"
        };
        p1.ProductImages.Add(new FurniMatch.Api.Models.ProductImage { ImageUrl = "/uploads/products/tranh-cuu-ngu-sen-ngoc.jpg", IsThumbnail = true, DisplayOrder = 0 });
        p1.ProductVariants.Add(new FurniMatch.Api.Models.ProductVariant { SizeName = "Bộ 3 bức (40x60cm x3)", Length = 120, Width = 5, Height = 60, ProductionDays = 3, Price = 1450000, Stock = 20 });
        p1.ProductVariants.Add(new FurniMatch.Api.Models.ProductVariant { SizeName = "Bộ 3 bức tiêu chuẩn (50x70cm x3)", Length = 150, Width = 5, Height = 70, ProductionDays = 3, Price = 1850000, Stock = 30 });
        p1.ProductVariants.Add(new FurniMatch.Api.Models.ProductVariant { SizeName = "Bộ 3 bức đại (60x90cm x3)", Length = 180, Width = 5, Height = 90, ProductionDays = 4, Price = 2450000, Stock = 15 });
        context.Products.Add(p1);

        // 2. Hoa Ban Tây Bắc
        var p2 = new FurniMatch.Api.Models.Product
        {
            SellerId = defaultSeller.UserId,
            CategoryId = artCategory.CategoryId,
            Name = "Tranh Canvas Mái Nhà Cổ & Cây Hoa Ban Nắng Ấm Tây Bắc",
            Description = "Tranh nghệ thuật tái hiện khung cảnh thanh bình vùng cao Tây Bắc với mái ngói rêu phong, tường vàng ấm áp và cây hoa ban trắng bung nở dưới ánh nắng vàng nhẹ. Chất liệu vải canvas kim tuyến cán bóng hoặc tráng gương chống ẩm mốc, khung viền gỗ sồi tự nhiên mộc mạc tinh tế.",
            Price = 1200000,
            ProductionDays = 2,
            CustomSizeSupported = true,
            Length = 120,
            Width = 4,
            Height = 80,
            Status = "ACTIVE"
        };
        p2.ProductImages.Add(new FurniMatch.Api.Models.ProductImage { ImageUrl = "/uploads/products/tranh-hoa-ban-tay-bac.jpg", IsThumbnail = true, DisplayOrder = 0 });
        p2.ProductVariants.Add(new FurniMatch.Api.Models.ProductVariant { SizeName = "Kích thước nhỏ (50x75cm)", Length = 75, Width = 4, Height = 50, ProductionDays = 2, Price = 850000, Stock = 25 });
        p2.ProductVariants.Add(new FurniMatch.Api.Models.ProductVariant { SizeName = "Kích thước vừa (60x90cm)", Length = 90, Width = 4, Height = 60, ProductionDays = 2, Price = 1200000, Stock = 40 });
        p2.ProductVariants.Add(new FurniMatch.Api.Models.ProductVariant { SizeName = "Kích thước lớn (80x120cm)", Length = 120, Width = 4, Height = 80, ProductionDays = 3, Price = 1650000, Stock = 20 });
        context.Products.Add(p2);

        // 3. Sơn Thủy Hữu Tình
        var p3 = new FurniMatch.Api.Models.Product
        {
            SellerId = defaultSeller.UserId,
            CategoryId = artCategory.CategoryId,
            Name = "Tranh Tráng Gương Sơn Thủy Hữu Tình Thác Nước Tùng Hạc",
            Description = "Bức tranh phong cảnh đại ngàn kỳ vĩ với thác nước luân chuyển tài lộc, đàn hạc tiên ngụ ý trường thọ và ánh bình minh rạng rỡ mang lại vượng khí cho gia chủ. Bề mặt tráng gương cao cấp siêu nét 8K, đèn LED hắt sáng viền lưng tạo chiều sâu cho không gian phòng khách hiện đại.",
            Price = 2350000,
            ProductionDays = 4,
            CustomSizeSupported = true,
            Length = 160,
            Width = 5,
            Height = 80,
            Status = "ACTIVE"
        };
        p3.ProductImages.Add(new FurniMatch.Api.Models.ProductImage { ImageUrl = "/uploads/products/tranh-son-thuy-huu-tinh.jpg", IsThumbnail = true, DisplayOrder = 0 });
        p3.ProductVariants.Add(new FurniMatch.Api.Models.ProductVariant { SizeName = "Kích thước 60x120cm", Length = 120, Width = 5, Height = 60, ProductionDays = 3, Price = 1800000, Stock = 15 });
        p3.ProductVariants.Add(new FurniMatch.Api.Models.ProductVariant { SizeName = "Kích thước 80x160cm", Length = 160, Width = 5, Height = 80, ProductionDays = 4, Price = 2350000, Stock = 25 });
        p3.ProductVariants.Add(new FurniMatch.Api.Models.ProductVariant { SizeName = "Kích thước 100x200cm Khổ Lớn", Length = 200, Width = 5, Height = 100, ProductionDays = 5, Price = 3200000, Stock = 10 });
        context.Products.Add(p3);

        // 4. Scandinavian Dương Xỉ & Hoa Hồng
        var p4 = new FurniMatch.Api.Models.Product
        {
            SellerId = defaultSeller.UserId,
            CategoryId = artCategory.CategoryId,
            Name = "Bộ Đôi Tranh Canvas Scandinavian Dương Xỉ Nhiệt Đới & Hoa Hồng",
            Description = "Bộ 2 tranh đối xứng phong cách Scandinavian tối giản hiện đại, kết hợp hài hòa giữa sắc xanh mướt của lá dương xỉ rừng nhiệt đới và sắc hồng dịu dàng của bụi hoa hồng Pháp. Mang lại cảm giác thư thái, gần gũi thiên nhiên cho phòng ngủ, phòng khách hoặc căn hộ studio.",
            Price = 950000,
            ProductionDays = 2,
            CustomSizeSupported = true,
            Length = 100,
            Width = 3,
            Height = 70,
            Status = "ACTIVE"
        };
        p4.ProductImages.Add(new FurniMatch.Api.Models.ProductImage { ImageUrl = "/uploads/products/tranh-duong-xi-hoa-hong.jpg", IsThumbnail = true, DisplayOrder = 0 });
        p4.ProductVariants.Add(new FurniMatch.Api.Models.ProductVariant { SizeName = "Bộ 2 bức (40x60cm x2)", Length = 80, Width = 3, Height = 60, ProductionDays = 2, Price = 750000, Stock = 30 });
        p4.ProductVariants.Add(new FurniMatch.Api.Models.ProductVariant { SizeName = "Bộ 2 bức tiêu chuẩn (50x70cm x2)", Length = 100, Width = 3, Height = 70, ProductionDays = 2, Price = 950000, Stock = 50 });
        p4.ProductVariants.Add(new FurniMatch.Api.Models.ProductVariant { SizeName = "Bộ 2 bức lớn (60x90cm x2)", Length = 120, Width = 3, Height = 90, ProductionDays = 3, Price = 1350000, Stock = 20 });
        context.Products.Add(p4);

        // 5. Chữ An Mẫu Đơn
        var p5 = new FurniMatch.Api.Models.Product
        {
            SellerId = defaultSeller.UserId,
            CategoryId = artCategory.CategoryId,
            Name = "Tranh Phong Thủy Chữ An Thư Pháp & Hoa Mẫu Đơn Kim Hoàng",
            Description = "Bức tranh nghệ thuật thư pháp chữ 'An' kết hợp câu chúc 'Gia đình vạn sự bình yên - Tài vô lộc đến phúc duyên tràn đầy' và chùm hoa mẫu đơn mạ vàng sang trọng. Biểu trưng cho cuộc sống an lành, thịnh vượng, phú quý và hạnh phúc viên mãn. Rất thích hợp làm quà tân gia, mừng thọ hoặc bài trí phòng khách gia đình.",
            Price = 2100000,
            ProductionDays = 3,
            CustomSizeSupported = true,
            Length = 140,
            Width = 4,
            Height = 70,
            Status = "ACTIVE"
        };
        p5.ProductImages.Add(new FurniMatch.Api.Models.ProductImage { ImageUrl = "/uploads/products/tranh-chu-an-mau-don.jpg", IsThumbnail = true, DisplayOrder = 0 });
        p5.ProductVariants.Add(new FurniMatch.Api.Models.ProductVariant { SizeName = "Kích thước 50x100cm", Length = 100, Width = 4, Height = 50, ProductionDays = 3, Price = 1500000, Stock = 15 });
        p5.ProductVariants.Add(new FurniMatch.Api.Models.ProductVariant { SizeName = "Kích thước 60x120cm", Length = 120, Width = 4, Height = 60, ProductionDays = 3, Price = 1850000, Stock = 25 });
        p5.ProductVariants.Add(new FurniMatch.Api.Models.ProductVariant { SizeName = "Kích thước 70x140cm Tiêu Chuẩn", Length = 140, Width = 4, Height = 70, ProductionDays = 3, Price = 2100000, Stock = 20 });
        context.Products.Add(p5);

        context.SaveChanges();
    }

    FurniMatch.Api.Data.SampleDataSeeder.SeedAdditionalSellersAndProducts(context);
}

app.UseHttpsRedirection();
app.UseStaticFiles();

app.UseCors("AllowAll");

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();
