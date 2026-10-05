using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using FurniMatch.Api.Data;
using FurniMatch.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FurniMatch.Api.Controllers
{
    [ApiController]
    [Route("api/chat")]
    [Authorize]
    public class ChatController : ControllerBase
    {
        private readonly FurniMatchDbContext _db;

        public ChatController(FurniMatchDbContext db)
        {
            _db = db;
        }

        private int CurrentUserId => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        public class SendMessageDto
        {
            public int ReceiverId { get; set; }
            public string? Content { get; set; }
            public int? ProductId { get; set; }
        }

        /// <summary>
        /// Lấy danh sách cuộc trò chuyện của người dùng hiện tại
        /// </summary>
        [HttpGet("conversations")]
        public async Task<IActionResult> GetConversations()
        {
            var myId = CurrentUserId;

            // Lấy tất cả tin nhắn liên quan tới user hiện tại
            var messages = await _db.ChatMessages
                .AsNoTracking()
                .Include(m => m.Product)
                    .ThenInclude(p => p!.ProductImages)
                .Where(m => m.SenderId == myId || m.ReceiverId == myId)
                .OrderByDescending(m => m.CreatedAt)
                .ToListAsync();

            // Nhóm theo đối tác trò chuyện (other user)
            var partnerIds = messages
                .Select(m => m.SenderId == myId ? m.ReceiverId : m.SenderId)
                .Distinct()
                .ToList();

            var partners = await _db.Users
                .AsNoTracking()
                .Include(u => u.Role)
                .Where(u => partnerIds.Contains(u.UserId))
                .ToDictionaryAsync(u => u.UserId);

            var conversations = new List<object>();

            foreach (var pid in partnerIds)
            {
                if (!partners.TryGetValue(pid, out var partner)) continue;

                var threadMessages = messages.Where(m => (m.SenderId == myId && m.ReceiverId == pid) || (m.SenderId == pid && m.ReceiverId == myId)).ToList();
                var lastMsg = threadMessages.FirstOrDefault();
                if (lastMsg == null) continue;

                var unreadCount = threadMessages.Count(m => m.SenderId == pid && m.ReceiverId == myId && !m.IsRead);

                conversations.Add(new
                {
                    otherUser = new
                    {
                        userId = partner.UserId,
                        fullName = partner.FullName,
                        shopName = partner.ShopName,
                        avatarUrl = partner.AvatarUrl,
                        role = partner.Role?.RoleName ?? "USER"
                    },
                    lastMessage = new
                    {
                        chatMessageId = lastMsg.ChatMessageId,
                        senderId = lastMsg.SenderId,
                        receiverId = lastMsg.ReceiverId,
                        content = lastMsg.Content,
                        isRead = lastMsg.IsRead,
                        createdAt = lastMsg.CreatedAt,
                        productId = lastMsg.ProductId,
                        productName = lastMsg.Product?.Name,
                        productImage = lastMsg.Product?.ProductImages?.FirstOrDefault()?.ImageUrl
                    },
                    unreadCount
                });
            }

            return Ok(conversations);
        }

        /// <summary>
        /// Lấy lịch sử tin nhắn với 1 đối tác cụ thể và đánh dấu đã đọc
        /// </summary>
        [HttpGet("messages/{otherUserId}")]
        public async Task<IActionResult> GetMessages(int otherUserId)
        {
            var myId = CurrentUserId;

            var messages = await _db.ChatMessages
                .Include(m => m.Product)
                    .ThenInclude(p => p!.ProductImages)
                .Where(m => (m.SenderId == myId && m.ReceiverId == otherUserId) ||
                            (m.SenderId == otherUserId && m.ReceiverId == myId))
                .OrderBy(m => m.CreatedAt)
                .ToListAsync();

            // Đánh dấu đã đọc các tin nhắn đối phương gửi cho mình
            var unreadIncoming = messages
                .Where(m => m.SenderId == otherUserId && m.ReceiverId == myId && !m.IsRead)
                .ToList();

            if (unreadIncoming.Any())
            {
                foreach (var msg in unreadIncoming)
                {
                    msg.IsRead = true;
                }
                await _db.SaveChangesAsync();
            }

            var result = messages.Select(m => new
            {
                chatMessageId = m.ChatMessageId,
                senderId = m.SenderId,
                receiverId = m.ReceiverId,
                content = m.Content,
                isRead = m.IsRead,
                createdAt = m.CreatedAt,
                productId = m.ProductId,
                product = m.Product == null ? null : new
                {
                    productId = m.Product.ProductId,
                    name = m.Product.Name,
                    price = m.Product.Price,
                    imageUrl = m.Product.ProductImages.FirstOrDefault()?.ImageUrl
                }
            });

            return Ok(result);
        }

        /// <summary>
        /// Gửi tin nhắn mới (có thể đính kèm thông tin sản phẩm)
        /// </summary>
        [HttpPost("send")]
        public async Task<IActionResult> SendMessage([FromBody] SendMessageDto dto)
        {
            var myId = CurrentUserId;

            if (dto.ReceiverId <= 0)
            {
                return BadRequest(new { message = "Người nhận không hợp lệ." });
            }

            if (dto.ReceiverId == myId)
            {
                return BadRequest(new { message = "Bạn không thể gửi tin nhắn cho chính mình." });
            }

            var receiver = await _db.Users.FindAsync(dto.ReceiverId);
            if (receiver == null)
            {
                return NotFound(new { message = "Không tìm thấy người nhận." });
            }

            Product? product = null;
            if (dto.ProductId.HasValue && dto.ProductId.Value > 0)
            {
                product = await _db.Products
                    .Include(p => p.ProductImages)
                    .FirstOrDefaultAsync(p => p.ProductId == dto.ProductId.Value);
            }

            var content = dto.Content?.Trim();
            if (string.IsNullOrEmpty(content))
            {
                if (product != null)
                {
                    content = $"Xin chào xưởng! Tôi muốn hỏi thêm thông tin về sản phẩm \"{product.Name}\".";
                }
                else
                {
                    return BadRequest(new { message = "Nội dung tin nhắn không được để trống." });
                }
            }

            var message = new ChatMessage
            {
                SenderId = myId,
                ReceiverId = dto.ReceiverId,
                ProductId = dto.ProductId,
                Content = content,
                IsRead = false,
                CreatedAt = DateTime.UtcNow
            };

            _db.ChatMessages.Add(message);

            // Tạo thông báo cho người nhận
            var senderUser = await _db.Users.FindAsync(myId);
            var senderName = !string.IsNullOrWhiteSpace(senderUser?.ShopName) 
                ? senderUser.ShopName 
                : (senderUser?.FullName ?? "Người dùng");

            var notif = new Notification
            {
                UserId = dto.ReceiverId,
                Title = $"Tin nhắn mới từ {senderName}",
                Message = content.Length > 80 ? content.Substring(0, 80) + "..." : content,
                IsRead = false,
                CreatedAt = DateTime.UtcNow
            };
            _db.Notifications.Add(notif);

            await _db.SaveChangesAsync();

            return Ok(new
            {
                chatMessageId = message.ChatMessageId,
                senderId = message.SenderId,
                receiverId = message.ReceiverId,
                content = message.Content,
                isRead = message.IsRead,
                createdAt = message.CreatedAt,
                productId = message.ProductId,
                product = product == null ? null : new
                {
                    productId = product.ProductId,
                    name = product.Name,
                    price = product.Price,
                    imageUrl = product.ProductImages.FirstOrDefault()?.ImageUrl
                }
            });
        }

        /// <summary>
        /// Lấy tổng số tin nhắn chưa đọc của người dùng hiện tại
        /// </summary>
        [HttpGet("unread-count")]
        public async Task<IActionResult> GetUnreadCount()
        {
            var myId = CurrentUserId;
            var count = await _db.ChatMessages.CountAsync(m => m.ReceiverId == myId && !m.IsRead);
            return Ok(new { count });
        }

        /// <summary>
        /// Lấy thông tin cơ bản của một người dùng để bắt đầu chat
        /// </summary>
        [HttpGet("user/{otherUserId}")]
        public async Task<IActionResult> GetChatUser(int otherUserId)
        {
            var user = await _db.Users
                .AsNoTracking()
                .Include(u => u.Role)
                .FirstOrDefaultAsync(u => u.UserId == otherUserId);

            if (user == null)
            {
                return NotFound(new { message = "Không tìm thấy người dùng." });
            }

            return Ok(new
            {
                userId = user.UserId,
                fullName = user.FullName,
                shopName = user.ShopName,
                avatarUrl = user.AvatarUrl,
                role = user.Role?.RoleName ?? "USER"
            });
        }
    }
}
