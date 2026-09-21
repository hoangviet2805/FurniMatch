using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable
namespace FurniMatch.Api.Migrations
{
    public partial class AddOrdersAndPaymentQrConfig : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
IF OBJECT_ID(N'[Orders]') IS NULL
BEGIN
 CREATE TABLE [Orders]([OrderId] int IDENTITY(1,1) NOT NULL PRIMARY KEY,[OrderCode] nvarchar(50) NOT NULL,[CustomerId] int NOT NULL,[SellerId] int NOT NULL,[ItemsJson] nvarchar(max) NOT NULL,[RecipientName] nvarchar(200) NOT NULL,[RecipientPhone] nvarchar(20) NOT NULL,[Address] nvarchar(max) NOT NULL,[Note] nvarchar(max) NULL,[Subtotal] decimal(18,2) NOT NULL,[ShippingFee] decimal(18,2) NOT NULL,[TotalAmount] decimal(18,2) NOT NULL,[PaymentMethod] nvarchar(20) NOT NULL,[PaymentStatus] nvarchar(20) NOT NULL,[OrderStatus] nvarchar(30) NOT NULL,[MomoOrderId] nvarchar(max) NULL,[MomoTransId] nvarchar(max) NULL,[MomoQrCodeUrl] nvarchar(max) NULL,[MomoDeeplink] nvarchar(max) NULL,[MomoPayUrl] nvarchar(max) NULL,[PaymentExpiredAt] datetime2 NULL,[CreatedAt] datetime2 NOT NULL,[UpdatedAt] datetime2 NOT NULL);
END
IF COL_LENGTH('Orders','OrderCode') IS NULL ALTER TABLE [Orders] ADD [OrderCode] nvarchar(50) NOT NULL CONSTRAINT [DF_Orders_OrderCode] DEFAULT '';
IF COL_LENGTH('Orders','ItemsJson') IS NULL ALTER TABLE [Orders] ADD [ItemsJson] nvarchar(max) NOT NULL CONSTRAINT [DF_Orders_ItemsJson] DEFAULT '[]';
IF COL_LENGTH('Orders','Address') IS NULL ALTER TABLE [Orders] ADD [Address] nvarchar(max) NULL;
IF COL_LENGTH('Orders','ShippingAddress') IS NOT NULL EXEC('UPDATE [Orders] SET [Address]=[ShippingAddress] WHERE [Address] IS NULL');
EXEC('UPDATE [Orders] SET [Address]='''' WHERE [Address] IS NULL');
EXEC('ALTER TABLE [Orders] ALTER COLUMN [Address] nvarchar(max) NOT NULL');
IF COL_LENGTH('Orders','Subtotal') IS NULL ALTER TABLE [Orders] ADD [Subtotal] decimal(18,2) NOT NULL CONSTRAINT [DF_Orders_Subtotal] DEFAULT 0;
IF COL_LENGTH('Orders','ShippingFee') IS NULL ALTER TABLE [Orders] ADD [ShippingFee] decimal(18,2) NOT NULL CONSTRAINT [DF_Orders_ShippingFee] DEFAULT 0;
IF COL_LENGTH('Orders','PaymentStatus') IS NULL ALTER TABLE [Orders] ADD [PaymentStatus] nvarchar(20) NOT NULL CONSTRAINT [DF_Orders_PaymentStatus] DEFAULT 'PENDING';
IF COL_LENGTH('Orders','OrderStatus') IS NULL ALTER TABLE [Orders] ADD [OrderStatus] nvarchar(30) NOT NULL CONSTRAINT [DF_Orders_OrderStatus] DEFAULT 'CONFIRMED';
IF COL_LENGTH('Orders','MomoOrderId') IS NULL ALTER TABLE [Orders] ADD [MomoOrderId] nvarchar(max) NULL;
IF COL_LENGTH('Orders','MomoTransId') IS NULL ALTER TABLE [Orders] ADD [MomoTransId] nvarchar(max) NULL;
IF COL_LENGTH('Orders','MomoQrCodeUrl') IS NULL ALTER TABLE [Orders] ADD [MomoQrCodeUrl] nvarchar(max) NULL;
IF COL_LENGTH('Orders','MomoDeeplink') IS NULL ALTER TABLE [Orders] ADD [MomoDeeplink] nvarchar(max) NULL;
IF COL_LENGTH('Orders','MomoPayUrl') IS NULL ALTER TABLE [Orders] ADD [MomoPayUrl] nvarchar(max) NULL;
IF COL_LENGTH('Orders','PaymentExpiredAt') IS NULL ALTER TABLE [Orders] ADD [PaymentExpiredAt] datetime2 NULL;
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE name='IX_Orders_OrderCode' AND object_id=OBJECT_ID('Orders')) CREATE UNIQUE INDEX [IX_Orders_OrderCode] ON [Orders]([OrderCode]);
IF OBJECT_ID(N'[PaymentQrConfigs]') IS NULL CREATE TABLE [PaymentQrConfigs]([ConfigId] int IDENTITY(1,1) NOT NULL PRIMARY KEY,[PartnerCode] nvarchar(100) NOT NULL,[AccessKey] nvarchar(200) NOT NULL,[SecretKey] nvarchar(500) NOT NULL,[EndpointUrl] nvarchar(max) NOT NULL,[RedirectUrl] nvarchar(max) NOT NULL,[IpnUrl] nvarchar(max) NOT NULL,[PaymentTimeoutMinutes] int NOT NULL,[IsActive] bit NOT NULL,[UpdatedAt] datetime2 NOT NULL);");
        }
        protected override void Down(MigrationBuilder migrationBuilder) { }
    }
}
