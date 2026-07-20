'use client';

import Image from 'next/image';
import { serverURL } from '@/lib/api';
import { cn } from '@/lib/utils';

type UserAvatarProps = {
  name?: string | null;
  avatarUrl?: string | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
};

const sizeClasses: Record<NonNullable<UserAvatarProps['size']>, string> = {
  sm: 'h-8 w-8 text-[11px]',
  md: 'h-10 w-10 text-xs',
  lg: 'h-14 w-14 text-sm',
};

const getInitials = (name?: string | null) => {
  if (!name) return '??';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '??';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
};

const resolveAvatarUrl = (avatarUrl?: string | null) => {
  if (!avatarUrl) return null;
  return avatarUrl.startsWith('http') ? avatarUrl : `${serverURL}${avatarUrl}`;
};

export default function UserAvatar({
  name,
  avatarUrl,
  size = 'md',
  className,
}: UserAvatarProps) {
  const resolvedUrl = resolveAvatarUrl(avatarUrl);
  const initials = getInitials(name);

  return (
    <div
      className={cn(
        'inline-flex items-center justify-center overflow-hidden rounded-full border border-border/70 bg-card/80 text-foreground shadow-sm',
        sizeClasses[size],
        className,
      )}
    >
      {resolvedUrl ? (
        <Image
          src={resolvedUrl}
          alt={name ? `Foto de ${name}` : 'Foto do usuário'}
          width={56}
          height={56}
          unoptimized
          className="h-full w-full rounded-full object-cover"
          loading="lazy"
        />
      ) : (
        <span className="font-semibold tracking-[0.12em]">{initials}</span>
      )}
    </div>
  );
}
