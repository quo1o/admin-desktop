type Role = 'super' | 'admin' | 'cashier';

type User = {
  id: number;
  name?: string;
  winstrikeUserId: number;
  roles: Role[];
  nickname?: string;
  email: string;
};

export { User };
