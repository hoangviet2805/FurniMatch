using FurniMatch.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace FurniMatch.Api.Data
{
    public class FurniMatchDbContext : DbContext
    {
        public FurniMatchDbContext(DbContextOptions<FurniMatchDbContext> options) : base(options) { }

        public DbSet<User> Users { get; set; }
        public DbSet<Role> Roles { get; set; }
        public DbSet<Category> Categories { get; set; }
        public DbSet<Product> Products { get; set; }
        public DbSet<ProductVariant> ProductVariants { get; set; }
        public DbSet<Size> Sizes { get; set; }
        public DbSet<Material> Materials { get; set; }
        public DbSet<QuotationRequest> QuotationRequests { get; set; }
        public DbSet<Quotation> Quotations { get; set; }
        public DbSet<Notification> Notifications { get; set; }
        public DbSet<EContract> EContracts { get; set; }
        public DbSet<EscrowWallet> EscrowWallets { get; set; }
        public DbSet<EscrowTransaction> EscrowTransactions { get; set; }
        public DbSet<ProductImage> ProductImages { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            modelBuilder.Entity<EContract>()
                .HasOne(e => e.Customer)
                .WithMany()
                .HasForeignKey(e => e.CustomerId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<EContract>()
                .HasOne(e => e.Seller)
                .WithMany()
                .HasForeignKey(e => e.SellerId)
                .OnDelete(DeleteBehavior.Restrict);

            // User - Role
            modelBuilder.Entity<User>()
                .HasOne(u => u.Role)
                .WithMany(r => r.Users)
                .HasForeignKey(u => u.RoleId);

            // Product - Category
            modelBuilder.Entity<Product>()
                .HasOne(p => p.Category)
                .WithMany(c => c.Products)
                .HasForeignKey(p => p.CategoryId);

            // Product - Seller
            modelBuilder.Entity<Product>()
                .HasOne(p => p.Seller)
                .WithMany(u => u.Products)
                .HasForeignKey(p => p.SellerId)
                .OnDelete(DeleteBehavior.Restrict);

            // Product - ProductImage
            modelBuilder.Entity<ProductImage>()
                .HasOne(pi => pi.Product)
                .WithMany(p => p.ProductImages)
                .HasForeignKey(pi => pi.ProductId)
                .OnDelete(DeleteBehavior.Cascade);

            // ProductVariant
            modelBuilder.Entity<ProductVariant>()
                .HasOne(pv => pv.Product)
                .WithMany(p => p.ProductVariants)
                .HasForeignKey(pv => pv.ProductId);
            
            modelBuilder.Entity<ProductVariant>()
                .HasOne(pv => pv.Size)
                .WithMany(s => s.ProductVariants)
                .HasForeignKey(pv => pv.SizeId);
                
            modelBuilder.Entity<ProductVariant>()
                .HasOne(pv => pv.Material)
                .WithMany(m => m.ProductVariants)
                .HasForeignKey(pv => pv.MaterialId);

            // QuotationRequest
            modelBuilder.Entity<QuotationRequest>()
                .HasOne(qr => qr.Customer)
                .WithMany(u => u.QuotationRequests)
                .HasForeignKey(qr => qr.CustomerId)
                .OnDelete(DeleteBehavior.Restrict);

            // Quotation
            modelBuilder.Entity<Quotation>()
                .HasOne(q => q.QuotationRequest)
                .WithMany(qr => qr.Quotations)
                .HasForeignKey(q => q.QuotationRequestId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<Quotation>()
                .HasOne(q => q.Seller)
                .WithMany(u => u.Quotations)
                .HasForeignKey(q => q.SellerId)
                .OnDelete(DeleteBehavior.Restrict);
        }
    }
}
