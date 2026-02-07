export interface Category {
  id: number;
  name: string;
  color: string | null;
  group: { color: string | null } | null;
}

export interface CategoryWithGroup {
  id: number;
  name: string;
  color: string | null;
  groupName: string;
  groupColor: string | null;
}

export interface Pattern {
  id: number;
  pattern: string;
  priority: number;
  notes: string | null;
}

export interface NewPattern {
  pattern: string;
  priority: number;
}

export interface Merchant {
  id: number;
  name: string;
  type: string | null;
  categoryId: number | null;
  category: Category | null;
  website: string | null;
  notes: string | null;
  hasAlternative: boolean;
  alternativeName: string | null;
  alternativeSavings: number | null;
  patterns?: Pattern[];
}

export interface MerchantWithStatus extends Merchant {
  isActive: boolean;
  _count: {
    transactions: number;
  };
  patterns: Pattern[];
}

export interface MerchantStat {
  totalCount: number;
  totalAmount: number;
  yearCount: number;
  yearAmount: number;
  monthCount: number;
  monthAmount: number;
}
