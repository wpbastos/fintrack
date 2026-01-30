"use client";

import { useState } from "react";
import { Building, Users, CreditCard } from "lucide-react";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { InstitutionsPanel } from "./institutions-panel";
import { PersonsPanel } from "./persons-panel";
import { AccountsPanel } from "./accounts-panel";
import { StatusFilter } from "./status-filter";

interface Institution {
  id: number;
  institutionName: string;
  institutionType: string;
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
  accountName: string;
  accountNumber: string | null;
  institutionId: number | null;
  institution: {
    id: number;
    institutionName: string;
    institutionType: string;
    isActive: boolean;
  } | null;
  accountType: string;
  accountNickname: string | null;
  currency: string;
  creditLimit: number | null;
  interestRate: number | null;
  billingCycleDay: number | null;
  isJoint: boolean;
  primaryHolderId: number | null;
  primaryHolder: {
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
}

const tabs = [
  { id: "institutions", label: "Institutions", icon: Building },
  { id: "persons", label: "Persons", icon: Users },
  { id: "accounts", label: "Accounts", icon: CreditCard },
] as const;

type TabId = (typeof tabs)[number]["id"];

export function AccountsTabs({ institutions, persons, accounts }: AccountsTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>("institutions");
  const [statusFilter, setStatusFilter] = useState<"active" | "inactive">("active");

  // Convert persons for the accounts panel (simpler type)
  const personsForAccounts = persons.map((c) => ({
    id: c.id,
    name: c.name,
    email: c.email,
    isActive: c.isActive,
  }));

  // Calculate stats
  const activeInstitutions = institutions.filter((i) => i.isActive).length;
  const activePersons = persons.filter((c) => c.isActive).length;
  const activeAccounts = accounts.filter((a) => a.isActive).length;
  const totalCreditLimit = accounts
    .filter((a) => a.isActive && a.creditLimit)
    .reduce((sum, a) => sum + (a.creditLimit ?? 0), 0);

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
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Institutions</CardDescription>
            <CardTitle className="text-2xl">{institutions.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Persons</CardDescription>
            <CardTitle className="text-2xl">{persons.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Accounts</CardDescription>
            <CardTitle className="text-2xl">{accounts.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active Accounts</CardDescription>
            <CardTitle className="text-2xl text-emerald-600">{activeAccounts}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Credit Limit</CardDescription>
            <CardTitle className="text-2xl text-violet-600">
              ${totalCreditLimit.toLocaleString()}
            </CardTitle>
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
          <AccountsPanel accounts={filteredAccounts} persons={personsForAccounts} />
        )}
      </div>
    </>
  );
}
