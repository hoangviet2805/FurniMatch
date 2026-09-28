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

// Escrow & Payout Services
builder.Services.AddScoped<EscrowService>();
builder.Services.AddHostedService<PayoutBackgroundService>();

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

    // Seed default CommissionConfig (5%) if none exists
    if (!context.CommissionConfigs.Any())
    {
        context.CommissionConfigs.Add(new FurniMatch.Api.Models.CommissionConfig
        {
            CommissionRate = 5.0m,
            IsActive = true,
            Note = "Tỷ lệ hoa hồng mặc định",
            EffectiveFrom = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        });
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

    // Seed Customer Role
    var customerRole = context.Roles.FirstOrDefault(r => r.RoleName == "CUSTOMER");
    if (customerRole == null)
    {
        customerRole = new FurniMatch.Api.Models.Role { RoleName = "CUSTOMER" };
        context.Roles.Add(customerRole);
        context.SaveChanges();
    }

    // Seed Seller Role
    var sellerRole = context.Roles.FirstOrDefault(r => r.RoleName == "SELLER");
    if (sellerRole == null)
    {
        sellerRole = new FurniMatch.Api.Models.Role { RoleName = "SELLER" };
        context.Roles.Add(sellerRole);
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


}

app.UseHttpsRedirection();
app.UseStaticFiles();

app.UseCors("AllowAll");

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();
