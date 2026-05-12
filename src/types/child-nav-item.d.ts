export type ChildNavItem = {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  show: boolean;
};
