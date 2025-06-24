export interface Group {
  id: string;
  name: string;
  externalId?: string;
  memberCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface GroupUser {
  id: string;
  userId: string;
  groupId: string;
  createdAt: string;
  updatedAt: string;
}
