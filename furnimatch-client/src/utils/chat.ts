export interface ChatProductInfo {
  productId: number;
  name: string;
  price: number;
  imageUrl?: string;
}

export interface ChatUser {
  userId: number;
  fullName: string;
  shopName?: string;
  avatarUrl?: string;
  role?: string;
}

export interface ChatMessageItem {
  chatMessageId: number;
  senderId: number;
  receiverId: number;
  content: string;
  isRead: boolean;
  createdAt: string;
  productId?: number;
  product?: ChatProductInfo | null;
}

export interface ChatConversation {
  otherUser: ChatUser;
  lastMessage: {
    chatMessageId: number;
    senderId: number;
    receiverId: number;
    content: string;
    isRead: boolean;
    createdAt: string;
    productId?: number;
    productName?: string;
    productImage?: string;
  };
  unreadCount: number;
}

export interface OpenChatDetail {
  sellerId?: number;
  sellerName?: string;
  shopName?: string;
  avatarUrl?: string;
  product?: ChatProductInfo;
  autoSendInquiry?: boolean;
}

export const openChatWithSeller = (options: OpenChatDetail) => {
  window.dispatchEvent(new CustomEvent('furnimatch:open-chat', { detail: options }));
};
