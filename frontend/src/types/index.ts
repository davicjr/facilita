export type UserRole = 'SUPERADMIN' | 'USER';
export type UserStatus = 'ACTIVE' | 'INACTIVE';
export type EntityStatus = 'ACTIVE' | 'INACTIVE';
export type EntityType = 'LINK' | 'SCHEDULE' | 'NOTE' | 'USER';

export type UserPreview = {
  id: string;
  name: string;
  email: string;
  role?: UserRole;
  avatarUrl?: string | null;
};

export interface User {
  id: string;
  name: string;
  email: string;
  cpf?: string;
  role: UserRole;
  status: UserStatus;
  avatarUrl?: string;
  theme?: unknown;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  ownerId: string;
  name: string;
  color?: string;
  icon?: string;
  adminOnly: boolean;
  status: EntityStatus;
  createdAt: string;
  updatedAt: string;
  owner?: UserPreview;
  _count?: {
    links: number;
    schedules: number;
    notes: number;
  };
}

export interface Link {
  id: string;
  ownerId: string;
  categoryId?: string | null;
  title: string;
  url: string;
  description?: string | null;
  color?: string | null;
  imageUrl?: string | null;
  imagePosition?: string | null;
  imageScale?: number | null;
  order: number;
  status: EntityStatus;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  category?: Category | null;
  owner?: UserPreview;
  createdBy?: UserPreview;
  shareCount?: number;
  sharedWithPreview?: UserPreview[];
  _count?: {
    favorites: number;
  };
}

export interface CustomShortcut {
  id: string;
  title: string;
  description: string;
  context: string;
  keys: string[];
  target: string;
  openInNewTab: boolean;
}

export interface UploadedSchedule {
  id: string;
  ownerId: string;
  categoryId?: string | null;
  title: string;
  fileUrl: string;
  fileName: string;
  fileSize: number;
  color?: string | null;
  imageUrl?: string | null;
  imagePosition?: string | null;
  imageScale?: number | null;
  status: EntityStatus;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  category?: Category | null;
  owner?: UserPreview;
  createdBy?: UserPreview;
  shareCount?: number;
  sharedWithPreview?: UserPreview[];
  _count?: {
    favorites: number;
  };
}

export interface Note {
  id: string;
  ownerId: string;
  categoryId?: string | null;
  title: string;
  content: string;
  color?: string | null;
  imageUrl?: string | null;
  imagePosition?: string | null;
  imageScale?: number | null;
  status: EntityStatus;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  category?: Category | null;
  owner?: UserPreview;
  createdBy?: UserPreview;
  shareCount?: number;
  sharedWithPreview?: UserPreview[];
}

export interface Share {
  id: string;
  ownerId: string;
  recipientId: string;
  entityType: 'LINK' | 'SCHEDULE' | 'NOTE';
  status?: 'PENDING' | 'ACCEPTED';
  linkId?: string | null;
  scheduleId?: string | null;
  noteId?: string | null;
  localCategoryId?: string | null;
  createdAt: string;
  updatedAt: string;
  approvedAt?: string | null;
  removedAt?: string | null;
  revokedAt?: string | null;
  owner?: UserPreview;
  recipient?: UserPreview;
  localCategory?: Pick<Category, 'id' | 'name' | 'color'> | null;
  link?: Link | null;
  schedule?: UploadedSchedule | null;
  note?: Note | null;
}

export interface FriendUser {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
  role: 'USER' | 'SUPERADMIN';
}

export interface Friend {
  friendshipId: string;
  since?: string | null;
  friend: FriendUser;
}

export interface FriendRequest {
  id: string;
  createdAt: string;
  user: FriendUser;
}

export interface Favorite {
  id: string;
  userId: string;
  entityType: 'LINK' | 'SCHEDULE' | 'NOTE';
  linkId?: string | null;
  scheduleId?: string | null;
  noteId?: string | null;
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: string;
  entityType: EntityType;
  entityId: string;
  title: string;
  message: string;
  actionUrl?: string | null;
  metadata?: unknown;
  read: boolean;
  createdAt: string;
}

export type ChatRoomType = 'DIRECT' | 'GROUP';

export interface ChatMember {
  id: string;
  roomId: string;
  userId: string;
  joinedAt: string;
  lastReadAt?: string | null;
  user: Pick<User, 'id' | 'name' | 'email' | 'avatarUrl' | 'role'>;
}

export interface ChatMessage {
  id: string;
  roomId: string;
  senderId: string;
  content: string;
  editedAt?: string | null;
  deletedAt?: string | null;
  createdAt: string;
  sender: Pick<User, 'id' | 'name' | 'avatarUrl'>;
}

export interface ChatRoom {
  id: string;
  type: ChatRoomType;
  name?: string | null;
  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;
  members: ChatMember[];
  lastMessage?: ChatMessage;
  unreadCount: number;
}

export interface ChatMessagesResponse {
  items: ChatMessage[];
  nextCursor: string | null;
}

export interface RolePermission {
  id: string;
  role: UserRole;
  canViewHome: boolean;
  canViewDashboard: boolean;
  canViewFavorites: boolean;
  canViewSharesPage: boolean;
  canViewUsers: boolean;
  canCreateUsers: boolean;
  canEditUsers: boolean;
  canDeleteUsers: boolean;
  canViewCategories: boolean;
  canManageCategories: boolean;
  canViewLinks: boolean;
  canManageLinks: boolean;
  canViewSchedules: boolean;
  canManageSchedules: boolean;
  canViewNotes: boolean;
  canManageNotes: boolean;
  canViewImages: boolean;
  canManageImages: boolean;
  canBackupSystem: boolean;
  canResetSystem: boolean;
  canManageSystemConfig: boolean;
  canManageShares: boolean;
  createdAt: string;
  updatedAt: string;
}

export type PermissionFlags = Omit<
  RolePermission,
  'id' | 'role' | 'createdAt' | 'updatedAt'
>;

export interface SystemConfig {
  id: string;
  key: string;
  value: string;
  description?: string;
  type: string;
  isEditable: boolean;
  category?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UploadedImage {
  id: string;
  uploadedBy: string;
  filename: string;
  originalName: string;
  url: string;
  mimeType: string;
  size: number;
  width?: number;
  height?: number;
  alt?: string;
  tags: string[];
  status: EntityStatus;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
  user?: Pick<User, 'id' | 'name' | 'email' | 'avatarUrl'>;
  usageCount?: number;
}

export interface ImageFilters {
  search?: string;
  uploadedBy?: string;
  tags?: string[];
}
