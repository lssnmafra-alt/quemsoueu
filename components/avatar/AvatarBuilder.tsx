'use client';

import type { AvatarConfig } from '@/lib/avatarConfig';

type AvatarBuilderProps = {
  value?: AvatarConfig | null;
  name?: string;
  onChange: (config: AvatarConfig) => void;
  className?: string;
};

export default function AvatarBuilder(_props: AvatarBuilderProps) {
  return null;
}
