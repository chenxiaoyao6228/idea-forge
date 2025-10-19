import { cn } from '@idea/ui/shadcn/utils';

export default function BubbleMenuWrapper({
  children,
  className,
  menuType,
}: Readonly<{
  children: React.ReactNode;
  className?: string;
  menuType?: string;
}>) {
  const baseClassName = `border rounded p-1 shadow
  bg-background dark:bg-background-dark dark:border-gray-800 dark:shadow-lg 
  inline-flex`;

  const conditionalClasses = menuType === "table-menu" ? "" : "space-x-1";

  return <div className={cn(baseClassName, conditionalClasses, className)}>{children}</div>;
}
