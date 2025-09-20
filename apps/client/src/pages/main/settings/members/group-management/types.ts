export interface GroupMember {
  userId: string;
  user?: {
    id: string;
    displayName?: string;
    email?: string;
    imageUrl?: string;
  };
}

export interface Group {
  id: string;
  name: string;
  members?: GroupMember[];
}

export interface ManageGroupMembersModalProps {
  open: boolean;
  onClose: () => void;
  groupId: string | null;
  refreshGroup: () => Promise<void>;
}
