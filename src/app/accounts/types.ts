export interface Institution {
  id: number;
  institutionName: string;
  institutionType: string;
  website: string | null;
  notes: string | null;
  isActive: boolean;
  _count: {
    accounts: number;
  };
}

export interface Person {
  id: number;
  name: string;
  email: string | null;
  notes: string | null;
  isActive: boolean;
  _count: {
    accounts: number;
  };
}

export interface Account {
  id: number;
  accountName: string;
  accountNumber: string | null;
  accountType: string;
  accountNickname: string | null;
  currency: string;
  creditLimit: number | null;
  interestRate: number | null;
  billingCycleDay: number | null;
  isJoint: boolean;
  isActive: boolean;
  notes: string | null;
  institutionId: number | null;
  institution: { id: number; institutionName: string } | null;
  primaryHolderId: number | null;
  primaryHolder: { id: number; name: string } | null;
}

export interface InstitutionOption {
  id: number;
  institutionName: string;
  institutionType: string;
  isActive: boolean;
}

export interface PersonOption {
  id: number;
  name: string;
}
