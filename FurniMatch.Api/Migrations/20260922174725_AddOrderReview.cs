using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FurniMatch.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddOrderReview : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "PaymentReceiptUrl",
                table: "WithdrawalRequests",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "PayoutDelayHours",
                table: "CommissionConfigs",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "PayoutDelayMinutes",
                table: "CommissionConfigs",
                type: "int",
                nullable: false,
                defaultValue: 0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "PaymentReceiptUrl",
                table: "WithdrawalRequests");

            migrationBuilder.DropColumn(
                name: "PayoutDelayHours",
                table: "CommissionConfigs");

            migrationBuilder.DropColumn(
                name: "PayoutDelayMinutes",
                table: "CommissionConfigs");
        }
    }
}
