// import { useTranslation } from "react-i18next";
// import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
// import { Badge } from "@/components/ui/badge";
// import { Button } from "@/components/ui/button";
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// interface User {
//   id: string;
//   name: string;
//   email: string;
//   avatar?: string;
// }

// interface DocumentMemberListItemProps {
//   user: User;
//   permission: "READ" | "EDIT";
//   onRemove?: () => void;
//   onUpdate?: (permission: "READ" | "EDIT") => void;
// }

// export function DocumentMemberListItem({ user, permission, onRemove, onUpdate }: DocumentMemberListItemProps) {
//   const { t } = useTranslation();

//   const handlePermissionChange = (value: string) => {
//     if (value === "remove" && onRemove) {
//       onRemove();
//     } else if (onUpdate) {
//       onUpdate(value as "READ" | "EDIT");
//     }
//   };

//   return (
//     <div className="flex items-center justify-between">
//       <div className="flex items-center gap-2">
//         <Avatar>
//           <AvatarImage src={user.avatar} />
//           <AvatarFallback>{user.name[0]}</AvatarFallback>
//         </Avatar>
//         <div>
//           <p className="text-sm font-medium">{user.name}</p>
//           <p className="text-xs text-muted-foreground">{user.email}</p>
//         </div>
//       </div>
//       <div className="flex items-center gap-2">
//         <Select value={permission} onValueChange={handlePermissionChange}>
//           <SelectTrigger className="w-[120px]">
//             <SelectValue>{permission === "EDIT" ? t("Can edit") : t("Can view")}</SelectValue>
//           </SelectTrigger>
//           <SelectContent>
//             <SelectItem value="READ">{t("Can view")}</SelectItem>
//             <SelectItem value="EDIT">{t("Can edit")}</SelectItem>
//             {onRemove && (
//               <>
//                 <SelectItem value="remove" className="text-destructive">
//                   {t("Remove")}
//                 </SelectItem>
//               </>
//             )}
//           </SelectContent>
//         </Select>
//       </div>
//     </div>
//   );
// }
