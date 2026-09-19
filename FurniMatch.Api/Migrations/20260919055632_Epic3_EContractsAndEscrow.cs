using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FurniMatch.Api.Migrations
{
    /// <inheritdoc />
    public partial class Epic3_EContractsAndEscrow : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "EContracts",
                columns: table => new
                {
                    EContractId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    QuotationId = table.Column<int>(type: "int", nullable: false),
                    CustomerId = table.Column<int>(type: "int", nullable: false),
                    SellerId = table.Column<int>(type: "int", nullable: false),
                    TotalAmount = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    DepositAmount = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    TermsAndConditions = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    SignedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_EContracts", x => x.EContractId);
                    table.ForeignKey(
                        name: "FK_EContracts_Quotations_QuotationId",
                        column: x => x.QuotationId,
                        principalTable: "Quotations",
                        principalColumn: "QuotationId",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_EContracts_Users_CustomerId",
                        column: x => x.CustomerId,
                        principalTable: "Users",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_EContracts_Users_SellerId",
                        column: x => x.SellerId,
                        principalTable: "Users",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "EscrowWallets",
                columns: table => new
                {
                    EscrowWalletId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    UserId = table.Column<int>(type: "int", nullable: false),
                    AvailableBalance = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    FrozenBalance = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_EscrowWallets", x => x.EscrowWalletId);
                    table.ForeignKey(
                        name: "FK_EscrowWallets_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "EscrowTransactions",
                columns: table => new
                {
                    EscrowTransactionId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    EscrowWalletId = table.Column<int>(type: "int", nullable: false),
                    EContractId = table.Column<int>(type: "int", nullable: true),
                    Amount = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    TransactionType = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Description = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_EscrowTransactions", x => x.EscrowTransactionId);
                    table.ForeignKey(
                        name: "FK_EscrowTransactions_EContracts_EContractId",
                        column: x => x.EContractId,
                        principalTable: "EContracts",
                        principalColumn: "EContractId");
                    table.ForeignKey(
                        name: "FK_EscrowTransactions_EscrowWallets_EscrowWalletId",
                        column: x => x.EscrowWalletId,
                        principalTable: "EscrowWallets",
                        principalColumn: "EscrowWalletId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_EContracts_CustomerId",
                table: "EContracts",
                column: "CustomerId");

            migrationBuilder.CreateIndex(
                name: "IX_EContracts_QuotationId",
                table: "EContracts",
                column: "QuotationId");

            migrationBuilder.CreateIndex(
                name: "IX_EContracts_SellerId",
                table: "EContracts",
                column: "SellerId");

            migrationBuilder.CreateIndex(
                name: "IX_EscrowTransactions_EContractId",
                table: "EscrowTransactions",
                column: "EContractId");

            migrationBuilder.CreateIndex(
                name: "IX_EscrowTransactions_EscrowWalletId",
                table: "EscrowTransactions",
                column: "EscrowWalletId");

            migrationBuilder.CreateIndex(
                name: "IX_EscrowWallets_UserId",
                table: "EscrowWallets",
                column: "UserId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "EscrowTransactions");

            migrationBuilder.DropTable(
                name: "EContracts");

            migrationBuilder.DropTable(
                name: "EscrowWallets");
        }
    }
}
