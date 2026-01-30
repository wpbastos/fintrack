export interface Category {
  id: number;
  categoryName: string;
}

export interface CategoryWithGroup {
  id: number;
  categoryName: string;
  groupName: string;
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
  merchantName: string;
  merchantType: string | null;
  defaultCategoryId: number | null;
  defaultCategory: Category | null;
  website: string | null;
  notes: string | null;
  patterns?: Pattern[];
}

export interface MerchantWithStatus extends Merchant {
  isActive: boolean;
  _count: {
    transactions: number;
  };
  patterns: Pattern[];
}
