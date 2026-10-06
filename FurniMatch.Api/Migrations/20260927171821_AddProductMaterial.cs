//using Microsoft.EntityFrameworkCore.Migrations;

//#nullable disable

//namespace FurniMatch.Api.Migrations
//{
//    /// <inheritdoc />
//    public partial class AddProductMaterial : Migration
//    {
//        /// <inheritdoc />
//        protected override void Up(MigrationBuilder migrationBuilder)
//        {
//            migrationBuilder.AddColumn<string>(
//                name: "Material",
//                table: "Products",
//                type: "nvarchar(max)",
//                nullable: true);
//        }

//        /// <inheritdoc />
//        protected override void Down(MigrationBuilder migrationBuilder)
//        {
//            migrationBuilder.DropColumn(
//                name: "Material",
//                table: "Products");
//        }
//    }
//}


using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FurniMatch.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddProductMaterial : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Bỏ trống để không chạy lệnh ALTER TABLE ADD Material
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Bỏ trống
        }
    }
}