'use client';

import ContentCoverImage from '@/components/content-cover-image';
import UserAvatar from '@/components/user-avatar';
import { getUserRoleLabel } from '@/lib/user-role';
import { getUserCardVisual } from '@/lib/user-card-visual';
import { cn } from '@/lib/utils';
import type { User } from '@/types';
import AdminEntityCard from './entity-card';

type AdminUserCardProps = {
  user: Pick<User, 'name' | 'email' | 'role' | 'status' | 'avatarUrl' | 'theme'>;
  onEdit?: () => void;
  onToggleStatus?: () => void;
  toggleDisabled?: boolean;
  size?: 'default' | 'preview';
};

export default function AdminUserCard({
  user,
  onEdit,
  onToggleStatus,
  toggleDisabled = false,
  size = 'default',
}: AdminUserCardProps) {
  const visual = getUserCardVisual(user.theme);
  const isToggleInteractive = Boolean(onToggleStatus);
  const isToggleDisabled = toggleDisabled && isToggleInteractive;
  const isPreview = size === 'preview';
  const coverWidth = isPreview ? 520 : 440;
  const coverHeight = isPreview ? 360 : 320;
  const coverClassName = isPreview ? 'h-44' : undefined;
  const contentClassName = isPreview ? 'px-4 py-3' : undefined;
  const cardClassName = isPreview ? 'w-[248px]' : undefined;
  const avatarClassName = isPreview ? '!h-24 !w-24' : '!h-20 !w-20';

  const cover = (
    <div className="absolute inset-0">
      {user.avatarUrl ? (
        <ContentCoverImage
          src={user.avatarUrl}
          alt={user.name ? `Foto de ${user.name}` : 'Foto do usuário'}
          position={visual.imagePosition}
          scale={visual.imageScale}
          width={coverWidth}
          height={coverHeight}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(88,160,174,0.24),_transparent_52%),linear-gradient(180deg,rgba(28,41,47,0.96),rgba(18,26,31,0.98))]">
          <UserAvatar
            name={user.name}
            avatarUrl={user.avatarUrl}
            size="lg"
            className={cn(
              'border-white/20 bg-white/8 text-white shadow-[0_18px_36px_rgba(0,0,0,0.28)]',
              avatarClassName,
            )}
          />
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />
    </div>
  );

  const details = (
    <div>
      <p className="break-words text-[14px] font-semibold leading-snug text-foreground">{user.name}</p>
      <p className="mt-0.5 break-words text-[11px] text-muted-foreground">{user.email}</p>
    </div>
  );

  const toggle = isToggleInteractive ? (
    <button
      type="button"
      role="switch"
      aria-checked={user.status === 'ACTIVE'}
      aria-label={user.status === 'ACTIVE' ? `Desativar ${user.name}` : `Ativar ${user.name}`}
      className={`fac-toggle shrink-0 ${isToggleDisabled ? 'cursor-not-allowed opacity-50' : ''}`}
      data-state={user.status === 'ACTIVE' ? 'on' : 'off'}
      onClick={() => {
        if (!isToggleDisabled) {
          onToggleStatus?.();
        }
      }}
      disabled={isToggleDisabled}
    >
      <span className="fac-toggle-dot" />
    </button>
  ) : (
    <div className="fac-toggle shrink-0" data-state={user.status === 'ACTIVE' ? 'on' : 'off'} aria-hidden="true">
      <span className="fac-toggle-dot" />
    </div>
  );

  const trailing = (
    <div className="flex w-full items-center justify-between gap-2">
      <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
        {getUserRoleLabel(user.role)}
      </p>
      {toggle}
    </div>
  );

  return (
    <AdminEntityCard
      cover={cover}
      details={details}
      trailing={trailing}
      onOpen={onEdit}
      className={cn(cardClassName, user.status === 'INACTIVE' ? 'opacity-80 grayscale' : undefined)}
      coverClassName={coverClassName}
      contentClassName={contentClassName}
      dividerColor="#58a0ae"
    />
  );
}
