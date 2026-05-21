export interface Group {
  id: string;
  name: string;
  code: string;
  currency: string;
  created_at: string;
}

export interface Member {
  id: string;
  group_id: string;
  name: string;
  created_at: string;
}

export interface Transaction {
  id: string;
  group_id: string;
  payer_id: string;
  amount: number;
  description: string;
  for_whom: string[];
  created_at: string;
}

export interface Payment {
  id: string;
  group_id: string;
  from_member_id: string;
  to_member_id: string;
  amount: number;
  created_at: string;
}

export interface Balance {
  memberId: string;
  memberName: string;
  netBalance: number; // positive = owed money, negative = owes money
}

export interface Settlement {
  fromId: string;
  fromName: string;
  toId: string;
  toName: string;
  amount: number;
}
