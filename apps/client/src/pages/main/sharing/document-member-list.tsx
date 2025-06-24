// import * as React from "react";
// import { useTranslation } from "react-i18next";
// import { toast } from "sonner";
// import { ScrollArea } from "@/components/ui/scroll-area";
// import { Separator } from "@/components/ui/separator";
// import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
// import { Badge } from "@/components/ui/badge";
// import { Button } from "@/components/ui/button";
// import { useQuery } from "@tanstack/react-query";
// import { documentApi } from "@/apis/document";
// import useDocUserPermissionStore from "@/stores/user-permission";
// import useDocGroupPermissionStore from "@/stores/group-permission";
// import useGroupStore from "@/stores/group";
// import { UserPermissionResponse } from "@idea/contracts";
// import { DocumentMemberListItem } from "./document-member-list-item";

// interface DocumentMemberListProps {
//   documentId: string;
//   invitedInSession?: string[];
// }

// export function DocumentMemberList({ documentId, invitedInSession = [] }: DocumentMemberListProps) {
//   const { t } = useTranslation();
//   const userPermissionStore = useDocUserPermissionStore();
//   const groupPermissionStore = useDocGroupPermissionStore();
//   const groupStore = useGroupStore();

//   const { data: document } = useQuery({
//     queryKey: ["document", documentId],
//     queryFn: () => documentApi.getById(documentId),
//   });

//   const { data: userPermissions } = useQuery({
//     queryKey: ["document-user-permissions", documentId],
//     queryFn: () => documentApi.listUserPermissions(documentId),
//   });

//   const { data: groupPermissions } = useQuery({
//     queryKey: ["document-group-permissions", documentId],
//     queryFn: () => documentApi.listGroupPermissions(documentId),
//   });

//   const handleRemoveUser = async (userId: string) => {
//     try {
//       await documentApi.removeUserPermission(documentId, userId);
//       toast.success(t("Removed user from document"));
//     } catch (error) {
//       toast.error(t("Failed to remove user from document"));
//     }
//   };

//   const handleUpdateUser = async (userId: string, permission: "READ" | "EDIT") => {
//     try {
//       await userPermissionStore.addPermission(userId, {
//         permission,
//         userId,
//         documentId,
//       });
//       toast.success(t("Updated user permissions"));
//     } catch (error) {
//       toast.error(t("Failed to update user permissions"));
//     }
//   };

//   const handleRemoveGroup = async (groupId: string) => {
//     try {
//       await documentApi.removeGroupPermission(documentId, groupId);
//       toast.success(t("Removed group from document"));
//     } catch (error) {
//       toast.error(t("Failed to remove group from document"));
//     }
//   };

//   const handleUpdateGroup = async (groupId: string, permission: "READ" | "EDIT") => {
//     try {
//       await groupPermissionStore.addPermission(groupId, {
//         permission,
//         groupId,
//         documentId,
//       });
//       toast.success(t("Updated group permissions"));
//     } catch (error) {
//       toast.error(t("Failed to update group permissions"));
//     }
//   };

//   // Sort members by name, with newly invited members first
//   const sortedUserPermissions = React.useMemo(() => {
//     if (!userPermissions) return [];
//     return [...userPermissions].sort((a, b) => {
//       const aIsNew = invitedInSession.includes(a.userId);
//       const bIsNew = invitedInSession.includes(b.userId);
//       if (aIsNew && !bIsNew) return -1;
//       if (!aIsNew && bIsNew) return 1;
//       return a.user.name.localeCompare(b.user.name);
//     });
//   }, [userPermissions, invitedInSession]);

//   const sortedGroupPermissions = React.useMemo(() => {
//     if (!groupPermissions) return [];
//     return [...groupPermissions].sort((a, b) => {
//       const aIsNew = invitedInSession.includes(a.groupId);
//       const bIsNew = invitedInSession.includes(b.groupId);
//       if (aIsNew && !bIsNew) return -1;
//       if (!aIsNew && bIsNew) return 1;
//       return a.group.name.localeCompare(b.group.name);
//     });
//   }, [groupPermissions, invitedInSession]);

//   return (
//     <div className="space-y-4">
//       {sortedGroupPermissions.map((permission) => (
//         <div key={permission.id} className="flex items-center justify-between">
//           <div className="flex items-center gap-2">
//             <Avatar>
//               <AvatarFallback>{permission.group.name[0]}</AvatarFallback>
//             </Avatar>
//             <div>
//               <p className="text-sm font-medium">{permission.group.name}</p>
//               <p className="text-xs text-muted-foreground">{t("{{count}} members", { count: permission.group.memberCount })}</p>
//             </div>
//           </div>
//           <div className="flex items-center gap-2">
//             <Badge variant="secondary">{permission.permission === "EDIT" ? t("Can edit") : t("Can view")}</Badge>
//             <Button variant="ghost" size="sm" onClick={() => handleRemoveGroup(permission.groupId)}>
//               {t("Remove")}
//             </Button>
//           </div>
//         </div>
//       ))}

//       {sortedUserPermissions.map((permission) => (
//         <DocumentMemberListItem
//           key={permission.id}
//           user={permission.user}
//           permission={permission.permission}
//           onRemove={() => handleRemoveUser(permission.userId)}
//           onUpdate={(newPermission) => handleUpdateUser(permission.userId, newPermission)}
//         />
//       ))}
//     </div>
//   );
// }
