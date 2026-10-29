import { IconMoon, IconSun, IconSunHigh } from '@tabler/icons-react';

/** Time-of-day icons (usable from server and client components). */
export const TOD_ICON = { morning: IconSun, midday: IconSunHigh, evening: IconMoon } as const;
