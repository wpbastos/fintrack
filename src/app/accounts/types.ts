export interface Institution {
  id: number;
  name: string;
  type: string;
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
  name: string;
  number: string | null;
  type: string;
  nickname: string | null;
  currency: string;
  creditLimit: number | null;
  interestRate: number | null;
  billingCycleDay: number | null;
  isJoint: boolean;
  isActive: boolean;
  notes: string | null;
  institutionId: number | null;
  institution: { id: number; name: string } | null;
  ownerId: number | null;
  owner: { id: number; name: string } | null;
}

export interface InstitutionOption {
  id: number;
  name: string;
  type: string;
  isActive: boolean;
}

export interface PersonOption {
  id: number;
  name: string;
}
