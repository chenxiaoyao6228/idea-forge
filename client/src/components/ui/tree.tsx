/*
 * https://github.com/shadcn-ui/ui/issues/355
 * TODO: 1. virtualize tree
 */

import React, { useState, useMemo, useRef, useEffect } from "react";
import { ChevronRight, Loader2, Folder, FolderOpen, File, Dot, Pen } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./collapsible";
import { Checkbox } from "./checkbox";
import { cn } from "@/lib/utils";
import { useSpinDelay } from "spin-delay";
import { Input } from "@/components/ui/input";
import { Emoji } from "emoji-picker-react";

type IconFn = (props: { selected: boolean; node: TreeDataNode; expanded: boolean }) => React.ReactNode;

export interface TreeDataNode {
  id: string;
  title: string;
  key: string;
  pos?: string;
  children?: TreeDataNode[];
  disabled?: boolean;
  disableCheckbox?: boolean;
  isLeaf?: boolean;
  loading?: boolean;
  icon?: IconFn | React.ReactNode | string | null;
  onRename?: (key: string, newTitle: string) => void;
}

export interface TreeProps {
  treeData: TreeDataNode[];
  checkable?: boolean;
  expandedKeys?: string[];
  selectedKeys?: string[];
  checkedKeys?: string[];
  defaultExpandedKeys?: string[];
  defaultSelectedKeys?: string[];
  defaultCheckedKeys?: string[];
  /**
   * When true, automatically expands parent nodes when a child is selected.
   * Useful during initial load to show the full path to selected nodes.
   */
  autoExpandParent?: boolean;
  onExpand?: (expandedKeys: string[], info: { expanded: boolean; node: TreeDataNode }) => void;
  onSelect?: (selectedKeys: string[], info: { selected: boolean; selectedNodes: TreeDataNode[]; node: TreeDataNode; event: React.MouseEvent }) => void;
  onCheck?: (checkedKeys: string[], info: { checked: boolean; checkedNodes: TreeDataNode[]; node: TreeDataNode; event: React.MouseEvent }) => void;
  className?: string;
  draggable?: boolean;
  blockNode?: boolean;
  onDragStart?: (info: { event: React.DragEvent; node: TreeDataNode }) => void;
  onDragEnter?: (info: { event: React.DragEvent; node: TreeDataNode; expandedKeys: string[] }) => void;
  onDragOver?: (info: { event: React.DragEvent; node: TreeDataNode }) => void;
  onDragLeave?: (info: { event: React.DragEvent; node: TreeDataNode }) => void;
  onDrop?: (info: {
    event: React.DragEvent;
    node: TreeDataNode;
    dragNode: TreeDataNode;
    dragNodesKeys: string[];
    dropPosition: number;
    dropToGap: boolean;
  }) => void;
  loadData?: (node: TreeDataNode) => Promise<void>;
  showIcon?: boolean;
  icon?: IconFn;
  switcherIcon?: React.ReactNode;
  defaultExpandAll?: boolean;
  renderActions?: (props: {
    node: TreeDataNode;
    onDropdownOpenChange: (open: boolean) => void;
    onStartRename: () => void;
  }) => React.ReactNode;
  actionsOnHover?: boolean;
  fieldNames?: {
    title?: string; // 默认 'title'
    key?: string; // 默认 'key'
    children?: string; // 默认 'children'
  };
  onRename?: (key: string, newTitle: string) => void;
}

export interface DirectoryTreeProps extends TreeProps {
  expandAction?: false | "click" | "doubleClick";
}

const addTreePos = (treeData: TreeDataNode[], parentPos = ""): TreeDataNode[] => {
  return treeData.map((node, index) => {
    const pos = parentPos ? `${parentPos}-${index}` : `${index}`;
    return {
      ...node,
      pos,
      children: node.children ? addTreePos(node.children, pos) : undefined,
    };
  });
};

const convertFieldNames = (node: any, fieldNames: Required<NonNullable<TreeProps["fieldNames"]>>): TreeDataNode => {
  return {
    title: node[fieldNames.title],
    key: node[fieldNames.key],
    children: node[fieldNames.children]?.map((child: any) => convertFieldNames(child, fieldNames)),
    ...node,
  };
};

const Tree = React.forwardRef<HTMLDivElement, TreeProps>(
  (
    {
      treeData,
      checkable,
      expandedKeys: controlledExpandedKeys,
      selectedKeys: controlledSelectedKeys,
      checkedKeys: controlledCheckedKeys,
      defaultExpandedKeys = [],
      defaultSelectedKeys = [],
      defaultCheckedKeys = [],
      autoExpandParent = false,
      onExpand,
      onSelect,
      onCheck,
      className,
      draggable = false,
      blockNode = false,
      onDragStart,
      onDragEnter,
      onDragOver,
      onDragLeave,
      onDrop,
      loadData,
      showIcon,
      icon,
      switcherIcon,
      defaultExpandAll,
      renderActions,
      actionsOnHover = true,
      fieldNames = {
        title: "title",
        key: "key",
        children: "children",
      },
      onRename,
    },
    ref,
  ) => {
    const getAllKeys = (nodes: TreeDataNode[]): string[] => {
      let keys: string[] = [];
      nodes.forEach((node) => {
        keys.push(node.key);
        if (node.children) {
          keys = keys.concat(getAllKeys(node.children));
        }
      });
      return keys;
    };

    const initialExpandedKeys = useMemo(() => {
      if (defaultExpandAll) {
        return getAllKeys(treeData);
      }
      return defaultExpandedKeys;
    }, []);

    const [internalExpandedKeys, setInternalExpandedKeys] = useState<string[]>(initialExpandedKeys);
    const [internalSelectedKeys, setInternalSelectedKeys] = useState<string[]>(defaultSelectedKeys);
    const [internalCheckedKeys, setInternalCheckedKeys] = useState<string[]>(defaultCheckedKeys);

    const expandedKeys = controlledExpandedKeys ?? internalExpandedKeys;
    const selectedKeys = controlledSelectedKeys ?? internalSelectedKeys;
    const checkedKeys = controlledCheckedKeys ?? internalCheckedKeys;

    const normalizedData = useMemo(
      () => treeData.map((node) => convertFieldNames(node, fieldNames as Required<NonNullable<TreeProps["fieldNames"]>>)),
      [treeData, fieldNames],
    );

    const treeDataWithPos = useMemo(() => addTreePos(normalizedData), [normalizedData]);

    const handleExpand = (key: string) => {
      const newExpandedKeys = expandedKeys.includes(key) ? expandedKeys.filter((k) => k !== key) : [...expandedKeys, key];

      if (!controlledExpandedKeys) {
        setInternalExpandedKeys(newExpandedKeys);
      }
      onExpand?.(newExpandedKeys, {
        expanded: newExpandedKeys.includes(key),
        node: normalizedData.find((n) => n.key === key)!,
      });
    };

    const handleSelect = (node: TreeDataNode, e: React.MouseEvent) => {
      const newSelectedKeys = [node.key];

      if (!controlledSelectedKeys) {
        setInternalSelectedKeys(newSelectedKeys);
      }
      onSelect?.(newSelectedKeys, {
        selected: true,
        selectedNodes: [node],
        node,
        event: e,
      });
    };

    const handleCheck = (node: TreeDataNode, checked: boolean, e: React.MouseEvent, affectedKeys: string[]) => {
      const newCheckedKeys = checked ? [...new Set([...checkedKeys, ...affectedKeys])] : checkedKeys.filter((key) => !affectedKeys.includes(key));

      if (!controlledCheckedKeys) {
        setInternalCheckedKeys(newCheckedKeys);
      }
      onCheck?.(newCheckedKeys, {
        checked,
        checkedNodes: [node],
        node,
        event: e,
      });
    };

    useEffect(() => {
      if (autoExpandParent && selectedKeys.length > 0) {
        const parentKeys = new Set<string>();
        const findParentKeys = (nodes: TreeDataNode[], parentKey?: string) => {
          nodes.forEach((node) => {
            if (parentKey) parentKeys.add(parentKey);
            if (node.children) {
              findParentKeys(node.children, node.key);
            }
          });
        };
        findParentKeys(normalizedData);

        const newExpandedKeys = [...new Set([...expandedKeys, ...parentKeys])];
        if (!controlledExpandedKeys) {
          setInternalExpandedKeys(newExpandedKeys);
        }
        selectedKeys.forEach((selectedKey) => {
          onExpand?.(newExpandedKeys, {
            expanded: newExpandedKeys.includes(selectedKey),
            node: normalizedData.find((n) => n.key === selectedKey)!,
          });
        });
      }
    }, [selectedKeys, autoExpandParent]);

    return (
      <div ref={ref} className={cn("w-full", className)}>
        {treeDataWithPos.map((node) => (
          <TreeNode
            key={node.key}
            node={node}
            level={0}
            checkable={checkable}
            expandedKeys={expandedKeys}
            selectedKeys={selectedKeys}
            checkedKeys={checkedKeys}
            onExpand={handleExpand}
            onSelect={handleSelect}
            onCheck={handleCheck}
            draggable={draggable}
            blockNode={blockNode}
            onDragStart={onDragStart}
            onDragEnter={onDragEnter}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            loadData={loadData}
            showIcon={showIcon}
            icon={icon}
            switcherIcon={switcherIcon}
            renderActions={renderActions}
            actionsOnHover={actionsOnHover}
            onRename={onRename}
          />
        ))}
      </div>
    );
  },
);

Tree.displayName = "Tree";

// TreeNode component implementation
type TreeNodeProps = {
  node: TreeDataNode;
  level: number;
  checkable?: boolean;
  expandedKeys: string[];
  selectedKeys: string[];
  checkedKeys: string[];
  onExpand: (key: string) => void;
  onSelect: (node: TreeDataNode, e: React.MouseEvent) => void;
  onCheck: (node: TreeDataNode, checked: boolean, e: React.MouseEvent, affectedKeys: string[]) => void;
  draggable?: boolean;
  blockNode?: boolean;
  onDragStart?: TreeProps["onDragStart"];
  onDragEnter?: TreeProps["onDragEnter"];
  onDragOver?: TreeProps["onDragOver"];
  onDragLeave?: TreeProps["onDragLeave"];
  onDrop?: TreeProps["onDrop"];
  icon?: TreeProps["icon"];
  loadData?: (node: TreeDataNode) => Promise<void>;
  showIcon?: boolean;
  switcherIcon?: React.ReactNode;
  renderActions?: TreeProps["renderActions"];
  actionsOnHover?: boolean;
  onRename?: (key: string, newTitle: string) => void;
};

const getAllChildrenKeys = (node: TreeDataNode): string[] => {
  const keys: string[] = [node.key];
  if (node.children) {
    node.children.forEach((child) => {
      keys.push(...getAllChildrenKeys(child));
    });
  }
  return keys;
};

const getCheckStatus = (
  node: TreeDataNode,
  checkedKeys: string[],
): {
  checked: boolean;
  indeterminate: boolean;
} => {
  if (!node.children || node.children.length === 0) {
    return {
      checked: checkedKeys.includes(node.key),
      indeterminate: false,
    };
  }

  const allChildrenKeys = getAllChildrenKeys(node);
  const checkedChildrenCount = allChildrenKeys.filter((key) => checkedKeys.includes(key)).length;

  return {
    checked: checkedChildrenCount === allChildrenKeys.length,
    indeterminate: checkedChildrenCount > 0 && checkedChildrenCount < allChildrenKeys.length,
  };
};

const TreeNode = ({
  node,
  level,
  checkable,
  expandedKeys,
  selectedKeys,
  checkedKeys,
  onExpand,
  onSelect,
  onCheck,
  draggable,
  blockNode,
  onDragStart,
  onDragEnter,
  onDragOver,
  onDragLeave,
  onDrop,
  loadData,
  showIcon,
  icon: treeIcon,
  switcherIcon,
  renderActions,
  actionsOnHover = true,
  onRename,
}: TreeNodeProps) => {
  const isExpanded = expandedKeys.includes(node.key);
  const isSelected = selectedKeys.includes(node.key);
  const { checked, indeterminate } = getCheckStatus(node, checkedKeys);
  const hasChildren = node.children && node.children.length > 0;
  const canLoadData = !node.isLeaf && loadData && !hasChildren;

  const [dragOver, setDragOver] = useState<"top" | "bottom" | "inside" | false>(false);
  const [loading, setLoading] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const showLoading = useSpinDelay(loading, {
    delay: 400,
    minDuration: 200,
  });

  const handleCheck = (checked: boolean) => {
    const childrenKeys = getAllChildrenKeys(node);
    onCheck(node, checked, {} as React.MouseEvent, childrenKeys);
  };

  const handleDragStart = (e: React.DragEvent) => {
    e.stopPropagation();
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("dragNode", JSON.stringify(node));
    e.dataTransfer.setData("dragKey", node.key as string);
    onDragStart?.({ event: e, node });
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(calcDropPosition(e) === -1 ? "top" : calcDropPosition(e) === 1 ? "bottom" : "inside");
    onDragEnter?.({ event: e, node, expandedKeys });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(calcDropPosition(e) === -1 ? "top" : calcDropPosition(e) === 1 ? "bottom" : "inside");
    onDragOver?.({ event: e, node });
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.stopPropagation();
    setDragOver(false);
    onDragLeave?.({ event: e, node });
  };

  const handleDragEnd = () => {
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const dropPosition = calcDropPosition(e);
    setDragOver(false);
    onDrop?.({
      event: e,
      node,
      dragNode: JSON.parse(e.dataTransfer.getData("dragNode")),
      dragNodesKeys: [e.dataTransfer.getData("dragKey")],
      dropPosition,
      dropToGap: dropPosition !== 0,
    });
  };

  const handleExpand = async () => {
    if (canLoadData && !loading) {
      setLoading(true);
      try {
        await loadData(node);
      } finally {
        setLoading(false);
      }
    }
    onExpand(node.key);
  };

  const handleStartRename = () => {
    setTimeout(() => {
      setIsEditing(true);
      setEditValue(node.title as string);
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 0);
    }, 200);
  };

  const handleRenameComplete = () => {
    setIsEditing(false);
    if (editValue.trim() && editValue !== node.title) {
      onRename?.(node.key, editValue.trim());
    }
  };

  const handleInputBlur = (e: React.FocusEvent) => {
    if (e.relatedTarget?.closest('[role="menu"]')) {
      return;
    }
    handleRenameComplete();
  };

  return (
    <Collapsible open={isExpanded} onOpenChange={handleExpand}>
      <div
        className={cn(
          "group/tree-node relative flex items-center py-1 px-2",
          "rounded-lg transition-colors",
          isSelected && "bg-accent dark:bg-accent/50",
          node.disabled && "opacity-50 pointer-events-none ",
          !node.disabled && "hover:bg-accent/50 dark:hover:bg-accent/25",
          blockNode && "w-full",
          draggable && "active:opacity-50",
          dragOver === "inside" && "bg-accent dark:bg-accent/50",
          "group",
        )}
        draggable={draggable}
        onDragStart={handleDragStart}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDragEnd={handleDragEnd}
        onDrop={handleDrop}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {dragOver === "top" && <div className="absolute -top-1 left-0 right-0 h-0.5 bg-primary rounded-full" />}
        {dragOver === "bottom" && <div className="absolute -bottom-1 left-0 right-0 h-0.5 bg-primary rounded-full" />}

        {checkable && !node.disableCheckbox && <Checkbox checked={checked} indeterminate={indeterminate} onCheckedChange={handleCheck} className="mr-2" />}

        {node.isLeaf ? (
          <Dot className="h-4 w-4 " />
        ) : (
          <CollapsibleTrigger asChild>
            <div className="flex items-center min-w-0">
              {(hasChildren || canLoadData) && (
                <div className={cn("flex items-center cursor-pointer rounded  h-4 w-4 ", "hover:bg-accent/50 dark:hover:bg-accent/25")}>
                  {showLoading ? (
                    <Loader2 className="h-4 w-4 shrink-0  animate-spin text-muted-foreground" />
                  ) : switcherIcon ? (
                    <div className={cn("shrink-0  transition-transform duration-200", isExpanded && "rotate-90")}>{switcherIcon}</div>
                  ) : (
                    <ChevronRight className={cn("h-4 w-4 shrink-0 transition-transform duration-200 ", isExpanded && "rotate-90")} />
                  )}
                </div>
              )}
            </div>
          </CollapsibleTrigger>
        )}

        <div className="flex items-center flex-1 min-w-0 cursor-pointer" onClick={(e) => !node.disabled && onSelect(node, e)}>
          {showIcon && (
            <div className="ml-[2px]">
              {(() => {
                const iconProp = node.icon || treeIcon;
                if (typeof iconProp === "function") {
                  return iconProp({ selected: isSelected, node, expanded: isExpanded });
                }
                if (typeof iconProp === "string") {
                  return <Emoji unified={iconProp} size={20} />;
                }
                return iconProp;
              })()}
            </div>
          )}

          {isEditing ? (
            <Input
              ref={inputRef}
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleRenameComplete();
                if (e.key === "Escape") setIsEditing(false);
              }}
              onClick={(e) => e.stopPropagation()}
              onBlur={handleInputBlur}
              className="ml-[2px] flex-1 h-6 px-1 text-sm"
            />
          ) : (
            <span className="ml-[2px] flex-1 truncate user-select-none text-sm">{node.title}</span>
          )}
        </div>

        {/* Render actions slot with conditional visibility */}
        {renderActions && !isEditing && (
          <div className={cn("flex items-center ml-2", actionsOnHover && !isHovered && !isDropdownOpen && "hidden")}>
            {renderActions({
              node,
              onDropdownOpenChange: setIsDropdownOpen,
              onStartRename: handleStartRename,
            })}
          </div>
        )}
      </div>

      {hasChildren && (
        <CollapsibleContent>
          <div className="pl-4">
            {node.children?.map((child, index) => (
              <TreeNode
                key={child.key || `${node.key}-${index}`} // Fallback to parent key + index if child key is missing
                node={child}
                level={level + 1}
                checkable={checkable}
                expandedKeys={expandedKeys}
                selectedKeys={selectedKeys}
                checkedKeys={checkedKeys}
                onExpand={onExpand}
                onSelect={onSelect}
                onCheck={onCheck}
                draggable={draggable}
                blockNode={blockNode}
                onDragStart={onDragStart}
                onDragEnter={onDragEnter}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
                loadData={loadData}
                showIcon={showIcon}
                icon={treeIcon}
                switcherIcon={switcherIcon}
                renderActions={renderActions}
                actionsOnHover={actionsOnHover}
                onRename={onRename}
              />
            ))}
          </div>
        </CollapsibleContent>
      )}
    </Collapsible>
  );
};

const calcDropPosition = (event: React.DragEvent): number => {
  const targetHeight = (event.target as HTMLElement).getBoundingClientRect().height;
  const offsetY = event.clientY - (event.target as HTMLElement).getBoundingClientRect().top;

  if (offsetY < targetHeight * 0.25) {
    return -1; // drop to top
  }
  if (offsetY > targetHeight * 0.75) {
    return 1; // drop to bottom
  }
  return 0; // drop to inside
};

const DirectoryTree = React.forwardRef<HTMLDivElement, DirectoryTreeProps>(({ expandAction = "click", expandedKeys, ...props }, ref) => {
  const getIcon: IconFn = (props) => {
    if (props.node.isLeaf) {
      return <File className="h-4 w-4" />;
    }
    return props.expanded ? <FolderOpen className="h-4 w-4" /> : <Folder className="h-4 w-4" />;
  };

  return <Tree ref={ref} {...props} showIcon icon={getIcon} className={cn("directory-tree", props.className)} />;
});

DirectoryTree.displayName = "DirectoryTree";

export { Tree, DirectoryTree };
