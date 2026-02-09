"use client";

import { useState } from "react";
import { Building, Users, CreditCard } from "lucide-react";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { InstitutionsPanel } from "./institutions-panel";
import { PersonsPanel } from "./persons-panel";
import { AccountsPanel } from "./accounts-panel";
import { StatusFilter } from "./status-filter";
import { formatCurrency } from "@/lib/format";
import type { AccountStat } from "./page";

interface Institution {
  id: number;
  name: string;
  type: string;
  website: string | null;
  isActive: boolean;
  notes: string | null;
  _count: {
    accounts: number;
  };
}

interface Person {
  id: number;
  name: string;
  email: string | null;
  isActive: boolean;
  notes: string | null;
  _count: {
    accounts: number;
    transactions: number;
  };
}

interface Account {
  id: number;
  name: string;
  number: string | null;
  institutionId: number | null;
  institution: {
    id: number;
    name: string;
    type: string;
    isActive: boolean;
  } | null;
  type: string;
  nickname: string | null;
  currency: string;
  creditLimit: number | null;
  interestRate: number | null;
  billingCycleDay: number | null;
  monthlyLimit: number | null;
  isJoint: boolean;
  ownerId: number | null;
  owner: {
    id: number;
    name: string;
    email: string | null;
    isActive: boolean;
  } | null;
  isActive: boolean;
  notes: string | null;
}

interface AccountsTabsProps {
  institutions: Institution[];
  persons: Person[];
  accounts: Account[];
  accountStats: Record<number, AccountStat>;
}

const tabs = [
  { id: "accounts", label: "Accounts", icon: CreditCard },
  { id: "institutions", label: "Institutions", icon: Building },
  { id: "persons", label: "Persons", icon: Users },
] as const;

type TabId = (typeof tabs)[number]["id"];

const SPENDING_TYPES = ["Credit Card", "Line of Credit"];

export function AccountsTabs({ institutions, persons, accounts, accountStats }: AccountsTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>("accounts");
  const [statusFilter, setStatusFilter] = useState<"active" | "inactive">("active");

  // Convert persons for the accounts panel (simpler type)
  const personsForAccounts = persons.map((c) => ({
    id: c.id,
    name: c.name,
    email: c.email,
    isActive: c.isActive,
  }));

  // Calculate stats
  const activeAccounts = accounts.filter((a) => a.isActive);
  const totalCreditLimit = activeAccounts
    .filter((a) => a.creditLimit)
    .reduce((sum, a) => sum + (a.creditLimit ?? 0), 0);

  // Month spending for CC/LOC accounts
  const monthSpending = activeAccounts
    .filter((a) => SPENDING_TYPES.includes(a.type))
    .reduce((sum, a) => {
      const stat = accountStats[a.id];
      return sum + Math.abs(stat?.monthAmount ?? 0);
    }, 0);


  // Filter data based on status
  const filteredInstitutions = institutions.filter((i) =>
    statusFilter === "active" ? i.isActive : !i.isActive
  );
  const filteredPersons = persons.filter((c) =>
    statusFilter === "active" ? c.isActive : !c.isActive
  );
  const filteredAccounts = accounts.filter((a) =>
    statusFilter === "active" ? a.isActive : !a.isActive
  );

  return (
    <>
      {/* Summary Cards */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Month Spending</CardDescription>
            <CardTitle className="text-2xl text-amber-600">
              {formatCurrency(monthSpending)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Credit Limit</CardDescription>
            <CardTitle className="text-2xl text-violet-600">
              {formatCurrency(totalCreditLimit)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active Accounts</CardDescription>
            <CardTitle className="text-2xl text-emerald-600">{activeAccounts.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Accounts</CardDescription>
            <CardTitle className="text-2xl">{accounts.length}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Filter and Tabs */}
      <div className="flex items-center justify-between">
        {/* Tab Navigation */}
        <div className="border-b">
          <nav className="-mb-px flex gap-4">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              const count =
                tab.id === "institutions"
                  ? filteredInstitutions.length
                  : tab.id === "persons"
                    ? filteredPersons.length
                    : filteredAccounts.length;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex items-center gap-2 px-1 py-3 text-sm font-medium border-b-2 transition-colors
                    ${
                      isActive
                        ? "border-violet-600 text-violet-600"
                        : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                    }
                  `}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                  <span
                    className={`
                      ml-1 rounded-full px-2 py-0.5 text-xs
                      ${isActive ? "bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-200" : "bg-muted"}
                    `}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </nav>
        </div>

        <StatusFilter value={statusFilter} onChange={setStatusFilter} />
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === "institutions" && (
          <InstitutionsPanel institutions={filteredInstitutions} />
        )}
        {activeTab === "persons" && (
          <PersonsPanel persons={filteredPersons} />
        )}
        {activeTab === "accounts" && (
          <AccountsPanel accounts={filteredAccounts} persons={personsForAccounts} accountStats={accountStats} />
        )}
      </div>
    </>
  );
}
