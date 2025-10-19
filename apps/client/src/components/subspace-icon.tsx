import React from "react";
import { SubspaceWorkspaceWide, SubspacePublic, SubspaceInviteOnly, SubspacePrivate } from "@idea/icons";
import type { SubspaceType } from "@idea/contracts";
import { cn } from "@idea/ui/shadcn/utils";

type IconSize = "font" | "xs" | "sm" | "md" | "lg" | "xl";

interface SubspaceIconProps extends React.SVGProps<SVGSVGElement> {
  type: SubspaceType;
  /**
   * Whether to show the background wrapper
   * @default false
   */
  withBackground?: boolean;
  /**
   * Icon size
   */
  size?: IconSize;
}

// Helper function to get icon component based on subspace type
function getSubspaceIconComponent(type: SubspaceType): React.ComponentType<React.SVGProps<SVGSVGElement>> {
  const iconMap: Record<SubspaceType, React.ComponentType<React.SVGProps<SVGSVGElement>>> = {
    WORKSPACE_WIDE: SubspaceWorkspaceWide,
    PUBLIC: SubspacePublic,
    INVITE_ONLY: SubspaceInviteOnly,
    PRIVATE: SubspacePrivate,
    PERSONAL: SubspacePrivate, // fallback for personal
  };
  return iconMap[type] || SubspaceWorkspaceWide;
}

// Helper function to get color class based on subspace type
function getSubspaceIconColor(type: SubspaceType): string {
  const colorMap: Record<SubspaceType, string> = {
    WORKSPACE_WIDE: "text-[#3182CE]", // Blue
    PUBLIC: "text-[#38B2AC]", // Teal
    INVITE_ONLY: "text-[#ED8936]", // Orange
    PRIVATE: "text-[#718096]", // Gray
    PERSONAL: "text-[#718096]", // Gray (fallback for personal)
  };
  return colorMap[type] || "text-[#3182CE]";
}

// Helper function to get background color with opacity based on subspace type
function getSubspaceIconBackgroundStyle(type: SubspaceType): React.CSSProperties {
  const colorMap: Record<SubspaceType, string> = {
    WORKSPACE_WIDE: "#3182CE", // Blue
    PUBLIC: "#38B2AC", // Teal
    INVITE_ONLY: "#ED8936", // Orange
    PRIVATE: "#718096", // Gray
    PERSONAL: "#718096", // Gray (fallback for personal)
  };
  const color = colorMap[type] || "#3182CE";

  // Convert hex to rgba with 10% opacity
  const hexToRgba = (hex: string, alpha: number) => {
    const r = Number.parseInt(hex.slice(1, 3), 16);
    const g = Number.parseInt(hex.slice(3, 5), 16);
    const b = Number.parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  return {
    backgroundColor: hexToRgba(color, 0.1),
  };
}

// Helper function to get size class based on size prop
function getSizeClass(size: IconSize = "md"): string {
  const sizeMap: Record<IconSize, string> = {
    font: "w-[1em] h-[1em]",
    xs: "w-3 h-3",
    sm: "w-4 h-4",
    md: "w-5 h-5",
    lg: "w-6 h-6",
    xl: "w-8 h-8",
  };
  return sizeMap[size];
}

/**
 * SubspaceIcon component - renders the appropriate icon based on subspace type
 * with its corresponding color scheme
 *
 * @param type - The subspace type (WORKSPACE_WIDE, PUBLIC, INVITE_ONLY, PRIVATE, PERSONAL)
 * @param size - Icon size (font, xs, sm, md, lg, xl)
 * @param withBackground - Whether to show the background wrapper (default: false)
 * @param className - Additional CSS classes
 * @param title - Accessibility title
 */
export function SubspaceIcon({ type, withBackground = false, className, size = "md", ...iconProps }: SubspaceIconProps) {
  const IconComponent = getSubspaceIconComponent(type);
  const iconColorClass = getSubspaceIconColor(type);
  const sizeClass = getSizeClass(size);

  if (withBackground) {
    return (
      <div className="size-6 rounded-lg flex items-center justify-center shrink-0" style={getSubspaceIconBackgroundStyle(type)}>
        <IconComponent className={cn(iconColorClass, "w-4 h-4")} {...iconProps} />
      </div>
    );
  }

  return <IconComponent className={cn(iconColorClass, sizeClass, className)} {...iconProps} />;
}
