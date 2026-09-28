using CloudinaryDotNet;
using CloudinaryDotNet.Actions;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using System.Threading.Tasks;

namespace FurniMatch.Api.Services
{
    public interface IPhotoService
    {
        Task<string> AddPhotoAsync(IFormFile file);
    }

    public class PhotoService : IPhotoService
    {
        private readonly Cloudinary _cloudinary;

        public PhotoService(IConfiguration config)
        {
            var cloudinarySection = config.GetSection("Cloudinary");
            var account = new Account(
                cloudinarySection["CloudName"],
                cloudinarySection["ApiKey"],
                cloudinarySection["ApiSecret"]
            );

            _cloudinary = new Cloudinary(account);
            _cloudinary.Api.Secure = true;
        }

        public async Task<string> AddPhotoAsync(IFormFile file)
        {
            if (file == null || file.Length == 0) return null;

            var uploadResult = new ImageUploadResult();

            using (var stream = file.OpenReadStream())
            {
                var uploadParams = new ImageUploadParams
                {
                    File = new FileDescription(file.FileName, stream),
                    Folder = "furnimatch_products" // Lưu vào thư mục furnimatch_products trên Cloudinary
                };

                uploadResult = await _cloudinary.UploadAsync(uploadParams);
            }

            return uploadResult.SecureUrl.AbsoluteUri; // Trả về link ảnh vĩnh viễn (HTTPS)
        }
    }
}
