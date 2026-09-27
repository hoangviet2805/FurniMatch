using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FurniMatch.Api.Migrations
{
    /// <inheritdoc />
    public partial class SyncReviewModels : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
                IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('CommissionConfigs') AND name = 'ReviewDeadlineDays')
                BEGIN
                    ALTER TABLE [CommissionConfigs] ADD [ReviewDeadlineDays] int NOT NULL DEFAULT 0;
                END
            ");

            migrationBuilder.Sql(@"
                IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'OrderReviews')
                BEGIN
                    CREATE TABLE [OrderReviews] (
                        [ReviewId] int NOT NULL IDENTITY,
                        [OrderId] int NOT NULL,
                        [CustomerId] int NOT NULL,
                        [ProductId] int NOT NULL,
                        [ProductName] nvarchar(200) NOT NULL,
                        [Rating] int NOT NULL,
                        [Comment] nvarchar(300) NULL,
                        [MediaJson] nvarchar(max) NULL,
                        [CreatedAt] datetime2 NOT NULL,
                        CONSTRAINT [PK_OrderReviews] PRIMARY KEY ([ReviewId]),
                        CONSTRAINT [FK_OrderReviews_Orders_OrderId] FOREIGN KEY ([OrderId]) REFERENCES [Orders] ([OrderId]) ON DELETE NO ACTION,
                        CONSTRAINT [FK_OrderReviews_Products_ProductId] FOREIGN KEY ([ProductId]) REFERENCES [Products] ([ProductId]) ON DELETE NO ACTION,
                        CONSTRAINT [FK_OrderReviews_Users_CustomerId] FOREIGN KEY ([CustomerId]) REFERENCES [Users] ([UserId]) ON DELETE NO ACTION
                    );
                    CREATE INDEX [IX_OrderReviews_CustomerId] ON [OrderReviews] ([CustomerId]);
                    CREATE UNIQUE INDEX [IX_OrderReviews_OrderId_ProductId_CustomerId] ON [OrderReviews] ([OrderId], [ProductId], [CustomerId]);
                    CREATE INDEX [IX_OrderReviews_ProductId] ON [OrderReviews] ([ProductId]);
                END
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "OrderReviews");

            migrationBuilder.DropColumn(
                name: "ReviewDeadlineDays",
                table: "CommissionConfigs");
        }
    }
}
