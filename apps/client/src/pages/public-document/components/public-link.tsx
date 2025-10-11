import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { NavigationTreeNode } from "@idea/contracts";
import { Emoji } from "emoji-picker-react";

interface PublicLinkProps {
  node: NavigationTreeNode;
  token: string;
  activeDocId?: string;
  depth?: number;
}

/**
 * Check if a node or any of its descendants contains the active document
 */
function containsActiveDocument(node: NavigationTreeNode, activeDocId?: string): boolean {
  if (node.id === activeDocId) return true;
  return node.children?.some((child) => containsActiveDocument(child, activeDocId)) || false;
}

/**
 * Public document link component using Shadcn Sidebar pattern
 * Simplified read-only version for public navigation
 * Features: recursive rendering, expand/collapse, active state, auto-expand to active doc
 * Excluded: drag-drop, rename, create, delete, context menus
 */
export function PublicLink({ node, token, activeDocId, depth = 0 }: PublicLinkProps) {
  const hasChildren = node.children && node.children.length > 0;
  const isActive = activeDocId === node.id;

  // Check if this node contains the active document in its subtree
  const shouldAutoExpand = useMemo(() => containsActiveDocument(node, activeDocId), [node, activeDocId]);

  const [isExpanded, setIsExpanded] = useState(false);
  const [userToggled, setUserToggled] = useState(false);

  // Auto-expand when contains active document (but don't auto-collapse)
  useEffect(() => {
    // Only auto-expand if user hasn't manually toggled
    if (shouldAutoExpand && !isExpanded && !userToggled) {
      setIsExpanded(true);
    }
  }, [shouldAutoExpand, isExpanded, userToggled]);

  if (!hasChildren) {
    // Simple link without children - add placeholder for chevron to maintain alignment
    return (
      <SidebarMenuItem>
        <SidebarMenuButton asChild isActive={isActive} style={{ paddingLeft: `${depth * 0.75 + 0.5}rem` }}>
          <Link to={`/share/${token}/doc/${node.id}`} className="flex items-center gap-2">
            <span className="w-6" /> {/* Placeholder for chevron alignment */}
            {node.icon && <Emoji unified={node.icon} size={24} />}
            <span className="truncate">{node.title}</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  }

  // Handle manual toggle
  const handleOpenChange = (open: boolean) => {
    setIsExpanded(open);
    setUserToggled(true);
  };

  // Link with collapsible children
  return (
    <Collapsible open={isExpanded} onOpenChange={handleOpenChange} className="group/collapsible">
      <SidebarMenuItem>
        <SidebarMenuButton isActive={isActive} className="pr-0" style={{ paddingLeft: `${depth * 0.75 + 0.5}rem` }}>
          <CollapsibleTrigger
            className="flex items-center justify-center h-full w-6 hover:bg-sidebar-accent/50 rounded-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <ChevronRight className={cn("h-4 w-4 transition-transform", isExpanded && "rotate-90")} />
          </CollapsibleTrigger>
          <Link to={`/share/${token}/doc/${node.id}`} className="flex items-center gap-2 flex-1 min-w-0">
            {node.icon && <Emoji unified={node.icon} size={24} />}
            <span className="truncate">{node.title}</span>
          </Link>
        </SidebarMenuButton>
        <CollapsibleContent>
          <div>
            {node.children?.map((child) => (
              <PublicLink key={child.id} node={child} token={token} activeDocId={activeDocId} depth={depth + 1} />
            ))}
          </div>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  );
}
