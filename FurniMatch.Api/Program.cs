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
            policy.WithOrigins("http://localhost:5173")
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
}

app.UseHttpsRedirection();
app.UseStaticFiles();

app.UseCors("AllowAll");

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();
