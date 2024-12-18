import { Button } from "@/components/ui/button";
import { DropdownMenuTrigger, DropdownMenu, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { DirectoryTree, Tree, TreeDataNode, TreeProps } from "@/components/ui/tree";
import { ChevronRightIcon, FrownIcon, SmileIcon, MehIcon, PlusIcon, MoreHorizontalIcon } from "lucide-react";
import { useState } from "react";

const treeData: TreeProps["treeData"] = [
  {
    title: "parent 1",
    key: "0-0",
    children: [
      {
        title: "parent 1-0-女哦恶女哦额女i呢哦v你",
        key: "0-0-0",
        //   disabled: true,
        children: [
          {
            title: "leaf-女哦恶女哦额女i呢哦v你",
            key: "0-0-0-0",
            isLeaf: true,
            //   disableCheckbox: true,
          },
          {
            title: "leaf",
            key: "0-0-0-1",
            isLeaf: true,
          },
        ],
      },
      {
        title: "parent 1-1",
        key: "0-0-1",
        children: [{ title: <span style={{ color: "#1677ff" }}>sss</span>, key: "0-0-1-0", isLeaf: true }],
      },
    ],
  },
];

// export function TestDoc() {
//   const onSelect: TreeProps["onSelect"] = (selectedKeys, info) => {
//     console.log("selected", selectedKeys, info);
//   };

//   const onCheck: TreeProps["onCheck"] = (checkedKeys, info) => {
//     console.log("onCheck", checkedKeys, info);
//   };

//   return (
//     <Tree
//       // checkable
//       defaultExpandedKeys={["0-0-0", "0-0-1"]}
//       defaultSelectedKeys={["0-0-0", "0-0-1"]}
//       defaultCheckedKeys={["0-0-0", "0-0-1"]}
//       onSelect={onSelect}
//       onCheck={onCheck}
//       treeData={treeData}
//     />
//   );
// }

// Controlled
// export function TestDoc() {
//   const [expandedKeys, setExpandedKeys] = useState<React.Key[]>(["0-0-0", "0-0-1"]);
//   const [checkedKeys, setCheckedKeys] = useState<React.Key[]>(["0-0-0"]);
//   const [selectedKeys, setSelectedKeys] = useState<React.Key[]>([]);
//   const [autoExpandParent, setAutoExpandParent] = useState<boolean>(true);

//   const onExpand: TreeProps["onExpand"] = (expandedKeysValue) => {
//     console.log("onExpand", expandedKeysValue);
//     // if not set autoExpandParent to false, if children expanded, parent can not collapse.
//     // or, you can remove all expanded children keys.
//     setExpandedKeys(expandedKeysValue);
//     setAutoExpandParent(false);
//   };

//   const onCheck: TreeProps["onCheck"] = (checkedKeysValue) => {
//     console.log("onCheck", checkedKeysValue);
//     setCheckedKeys(checkedKeysValue as React.Key[]);
//   };

//   const onSelect: TreeProps["onSelect"] = (selectedKeysValue, info) => {
//     console.log("onSelect", info);
//     setSelectedKeys(selectedKeysValue);
//   };

//   return (
//     <Tree
//       showIcon
//       checkable
//       onExpand={onExpand}
//       expandedKeys={expandedKeys}
//       autoExpandParent={autoExpandParent}
//       onCheck={onCheck}
//       checkedKeys={checkedKeys}
//       onSelect={onSelect}
//       selectedKeys={selectedKeys}
//       treeData={treeData}
//     />
//   );
// }

// Draggable

// export function TestDoc() {
//   const x = 3;
//   const y = 2;
//   const z = 1;
//   const defaultData: TreeDataNode[] = [];

//   const generateData = (_level: number, _preKey?: React.Key, _tns?: TreeDataNode[]) => {
//     const preKey = _preKey || "0";
//     const tns = _tns || defaultData;

//     const children: React.Key[] = [];
//     for (let i = 0; i < x; i++) {
//       const key = `${preKey}-${i}`;
//       tns.push({ title: key, key });
//       if (i < y) {
//         children.push(key);
//       }
//     }
//     if (_level < 0) {
//       return tns;
//     }
//     const level = _level - 1;
//     children.forEach((key, index) => {
//       tns[index].children = [];
//       return generateData(level, key, tns[index].children);
//     });
//   };
//   generateData(z);

//   const [gData, setGData] = useState(defaultData);
//   const [expandedKeys] = useState(["0-0", "0-0-0", "0-0-0-0"]);

//   const onDragEnter: TreeProps["onDragEnter"] = (info) => {
//     console.log(info);
//     // expandedKeys, set it when controlled is needed
//     // setExpandedKeys(info.expandedKeys)
//   };

//   const onDrop: TreeProps["onDrop"] = (info) => {
//     console.log(info);
//     const dropKey = info.node.key;
//     const dragKey = info.dragNode.key;
//     const dropPos = info.node.pos?.split("-") || ["0"];
//     const dropPosition = info.dropPosition - Number(dropPos[dropPos.length - 1]); // the drop position relative to the drop node, inside 0, top -1, bottom 1

//     const loop = (data: TreeDataNode[], key: React.Key, callback: (node: TreeDataNode, i: number, data: TreeDataNode[]) => void) => {
//       for (let i = 0; i < data.length; i++) {
//         if (data[i].key === key) {
//           return callback(data[i], i, data);
//         }
//         if (data[i].children) {
//           loop(data[i].children!, key, callback);
//         }
//       }
//     };
//     const data = [...gData];

//     // Find dragObject
//     let dragObj: TreeDataNode;
//     loop(data, dragKey, (item, index, arr) => {
//       arr.splice(index, 1);
//       dragObj = item;
//     });

//     if (!info.dropToGap) {
//       // Drop on the content
//       loop(data, dropKey, (item) => {
//         item.children = item.children || [];
//         // where to insert. New item was inserted to the start of the array in this example, but can be anywhere
//         item.children.unshift(dragObj);
//       });
//     } else {
//       let ar: TreeDataNode[] = [];
//       let i: number;
//       loop(data, dropKey, (_item, index, arr) => {
//         ar = arr;
//         i = index;
//       });
//       if (dropPosition === -1) {
//         // Drop on the top of the drop node
//         ar.splice(i!, 0, dragObj!);
//       } else {
//         // Drop on the bottom of the drop node
//         ar.splice(i! + 1, 0, dragObj!);
//       }
//     }
//     setGData(data);
//   };

//   return <Tree className="draggable-tree" defaultExpandedKeys={expandedKeys} draggable blockNode onDragEnter={onDragEnter} onDrop={onDrop} treeData={gData} />;
// }

// Load data
// AsyncLoadData example
// export function TestDoc() {
//   const initTreeData: TreeDataNode[] = [
//     { title: "Expand to load", key: "0" },
//     { title: "Expand to load", key: "1" },
//     { title: "Tree Node", key: "2", isLeaf: true },
//   ];

//   const [treeData, setTreeData] = useState(initTreeData);

//   // 更新树数据的辅助函数
//   const updateTreeData = (list: TreeDataNode[], key: React.Key, children: TreeDataNode[]): TreeDataNode[] =>
//     list.map((node) => {
//       if (node.key === key) {
//         return {
//           ...node,
//           children,
//         };
//       }
//       if (node.children) {
//         return {
//           ...node,
//           children: updateTreeData(node.children, key, children),
//         };
//       }
//       return node;
//     });

//   // 模拟异步加载数据
//   const onLoadData = (node: TreeDataNode) =>
//     new Promise<void>((resolve) => {
//       if (node.children) {
//         resolve();
//         return;
//       }

//       setTimeout(() => {
//         setTreeData((origin) =>
//           updateTreeData(origin, node.key, [
//             { title: `Child of ${node.key}-0`, key: `${node.key}-0` },
//             { title: `Child of ${node.key}-1`, key: `${node.key}-1` },
//           ]),
//         );
//         resolve();
//       }, 1000);
//     });

//   return <Tree loadData={onLoadData} treeData={treeData} />;
// }

// custom icon

// export function TestDoc() {
//   const treeData: TreeDataNode[] = [
//     {
//       title: "parent 1",
//       key: "0-0",
//       icon: <SmileIcon className="h-4 w-4" />,
//       children: [
//         {
//           title: "leaf",
//           key: "0-0-0",
//           icon: <MehIcon className="h-4 w-4" />,
//         },
//         {
//           title: "leaf",
//           key: "0-0-1",
//           icon: ({ selected }: { selected: boolean }) => (selected ? <FrownIcon className="h-4 w-4 fill-current" /> : <FrownIcon className="h-4 w-4" />),
//         },
//       ],
//     },
//   ];

//   return <Tree showIcon defaultExpandAll defaultSelectedKeys={["0-0-0"]} switcherIcon={<ChevronRightIcon className="h-4 w-4" />} treeData={treeData} />;
// }

// Directory tree
// const directoryData: TreeDataNode[] = [
//   {
//     title: "parent 0",
//     key: "0-0",
//     children: [
//       { title: "leaf 0-0", key: "0-0-0", isLeaf: true },
//       { title: "leaf 0-1", key: "0-0-1", isLeaf: true },
//     ],
//   },
//   {
//     title: "parent 1",
//     key: "0-1",
//     children: [
//       { title: "leaf 1-0", key: "0-1-0", isLeaf: true },
//       { title: "leaf 1-1", key: "0-1-1", isLeaf: true },
//     ],
//   },
// ];

// export function TestDoc() {
//   const onSelect = (keys: React.Key[], info: any) => {
//     console.log("Trigger Select", keys, info);
//   };

//   const onExpand = (keys: React.Key[], info: any) => {
//     console.log("Trigger Expand", keys, info);
//   };

//   return <DirectoryTree multiple draggable defaultExpandAll onSelect={onSelect} onExpand={onExpand} treeData={directoryData} />;
// }

export function TestDoc() {
  return (
    <DirectoryTree
      treeData={treeData}
      actionsOnHover={true}
      renderActions={({ node }) => (
        <div className="flex gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-4 w-4 p-0 mr-1">
                <MoreHorizontalIcon className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem>Rename</DropdownMenuItem>
              <DropdownMenuItem>Delete</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="ghost" size="icon" className="h-4 w-4 p-0">
            <PlusIcon className="h-4 w-4" />
          </Button>
        </div>
      )}
    />
  );
}
