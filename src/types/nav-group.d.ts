import { ChildNavItem } from './child-nav-item';

export type NavGroup = {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  show: boolean;
  url?: string;
  children?: ChildNavItem[];
};
