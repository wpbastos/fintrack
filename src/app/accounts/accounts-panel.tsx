"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { AccountDialog, AccountEditButton } from "./account-dialog";
import { toggleAccountStatus, deleteAccount, enableAllAccounts, disableAllAccounts } from "./actions";
import { formatCompactCurrency } from "@/lib/format";
import { toast } from "sonner";
import { Trash2, X, Power, PowerOff } from "lucide-react";
import type { AccountStat } from "./page";

function getTypeBadge(type: string) {
  const styles: Record<string, string> = {
    Chequing: "bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-200",
    Savings: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
    "Credit Card": "bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200",
    "Line of Credit": "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
    Loan: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
    Mortgage: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    Investment: "bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-200",
    RRSP: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200",
    TFSA: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200",
    RESP: "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200",
    FHSA: "bg-lime-100 text-lime-800 dark:bg-lime-900 dark:text-lime-200",
    Other: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200",
  };
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${styles[type] ?? styles.Other}`}>
      {type}
    </span>
  );
}

function getProgressColor(pct: number): { bar: string; text: string } {
  if (pct >= 90) return { bar: "bg-rose-500", text: "text-rose-600 dark:text-rose-400" };
  if (pct >= 75) return { bar: "bg-amber-500", text: "text-amber-600 dark:text-amber-400" };
  return { bar: "bg-emerald-500", text: "text-emerald-600 dark:text-emerald-400" };
}

interface Institution {
  id: number;
  name: string;
  type: string;
  isActive: boolean;
}

interface Person {
  id: number;
  name: string;
  email: string | null;
  isActive: boolean;
}

interface Account {
  id: number;
  name: string;
  number: string | null;
  institutionId: number | null;
  institution: Institution | null;
  type: string;
  nickname: string | null;
  currency: string;
  creditLimit: number | null;
  interestRate: number | null;
  billingCycleDay: number | null;
  monthlyLimit: number | null;
  isJoint: boolean;
  ownerId: number | null;
  owner: Person | null;
  isActive: boolean;
  notes: string | null;
}

interface AccountsPanelProps {
  accounts: Account[];
  persons: Person[];
  accountStats: Record<number, AccountStat>;
}

export function AccountsPanel({ accounts, persons, accountStats }: AccountsPanelProps) {
  const [pendingIds, setPendingIds] = useState<Set<number>>(new Set());
  const [search, setSearch] = useState("");
  const [bulkPending, setBulkPending] = useState(false);

  // Filter accounts by search (name, nickname, institution, person)
  const filteredAccounts = search
    ? accounts.filter((a) => {
        const query = search.toLowerCase();
        return (
          a.name.toLowerCase().includes(query) ||
          (a.nickname?.toLowerCase().includes(query) ?? false) ||
          (a.institution?.name.toLowerCase().includes(query) ?? false) ||
          (a.owner?.name.toLowerCase().includes(query) ?? false) ||
          (a.notes?.toLowerCase().includes(query) ?? false)
        );
      })
    : accounts;

  const handleToggleStatus = async (account: Account) => {
    setPendingIds((prev) => new Set(prev).add(account.id));
    await toggleAccountStatus(account.id, !account.isActive);
    setPendingIds((prev) => {
      const next = new Set(prev);
      next.delete(account.id);
      return next;
    });
    toast.success(`Account ${account.isActive ? "deactivated" : "activated"}`);
  };

  const handleDelete = async (account: Account) => {
    if (!confirm(`Are you sure you want to delete "${account.name}"?`)) {
      return;
    }

    setPendingIds((prev) => new Set(prev).add(account.id));
    const result = await deleteAccount(account.id);
    setPendingIds((prev) => {
      const next = new Set(prev);
      next.delete(account.id);
      return next;
    });

    if (result.success) {
      toast.success("Account deleted");
    } else {
      toast.error(result.error || "Failed to delete account");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end gap-2">
        <div className="relative">
          <Input
            placeholder="Search accounts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-64 pr-8"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <AccountDialog persons={persons} />
      </div>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Accounts</CardTitle>
            <div className="flex items-center gap-1">
              <button
                onClick={async () => {
                  setBulkPending(true);
                  await enableAllAccounts();
                  setBulkPending(false);
                  toast.success("All accounts enabled");
                }}
                disabled={bulkPending}
                className="p-1.5 rounded hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors disabled:opacity-50"
                title="Enable all"
              >
                <Power className="h-4 w-4" />
              </button>
              <button
                onClick={async () => {
                  setBulkPending(true);
                  await disableAllAccounts();
                  setBulkPending(false);
                  toast.success("All accounts disabled");
                }}
                disabled={bulkPending}
                className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors disabled:opacity-50"
                title="Disable all"
              >
                <PowerOff className="h-4 w-4" />
              </button>
            </div>
          </div>
          <CardDescription>Bank accounts, credit cards, and other financial accounts.</CardDescription>
        </CardHeader>
        <CardContent>
          {filteredAccounts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {search ? "No accounts match your search." : "No accounts found."}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table className="table-fixed w-full">
                <colgroup>
                  <col style={{ width: "30%" }} />
                  <col style={{ width: "22%" }} />
                  <col style={{ width: "10%" }} />
                  <col style={{ width: "22%" }} />
                  <col style={{ width: "10%" }} />
                  <col style={{ width: "6%" }} />
                </colgroup>
                <TableHeader>
                  <TableRow>
                    <TableHead>Account</TableHead>
                    <TableHead>Institution</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Person</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="p-0"></TableHead>
                  </TableRow>
                </TableHeader>
              <TableBody>
                {filteredAccounts.map((account) => {
                  const stat = accountStats[account.id];
                  const spent = Math.abs(stat?.monthAmount ?? 0);
                  const limit = account.monthlyLimit;
                  const hasSpendingBar = limit && limit > 0;
                  const pct = hasSpendingBar ? Math.min(100, (spent / limit) * 100) : 0;
                  const colors = hasSpendingBar ? getProgressColor(pct) : null;

                  return (
                    <TableRow key={account.id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{account.name}</span>
                          {account.nickname && (
                            <span className="text-xs text-muted-foreground">
                              {account.nickname}
                            </span>
                          )}
                          {account.number && (
                            <span className="text-xs text-muted-foreground">
                              ****{account.number}
                            </span>
                          )}
                          {(account.creditLimit || account.interestRate || account.billingCycleDay) && (
                            <span className="text-xs text-muted-foreground">
                              {[
                                account.creditLimit && `Limit: $${account.creditLimit.toLocaleString()}`,
                                account.interestRate && `${account.interestRate}%`,
                                account.billingCycleDay && `Day ${account.billingCycleDay}`,
                              ].filter(Boolean).join(" · ")}
                            </span>
                          )}
                          {hasSpendingBar && (
                            <div className="mt-1 space-y-0.5">
                              <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all ${colors!.bar}`}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <span className={`text-xs font-medium ${colors!.text}`}>
                                {formatCompactCurrency(spent)} / {formatCompactCurrency(limit)}
                                <span className="text-muted-foreground font-normal ml-1">
                                  ({pct.toFixed(0)}%)
                                </span>
                              </span>
                            </div>
                          )}
                          {account.notes && (
                            <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                              {account.notes}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {account.institution ? (
                          <div className="flex flex-col">
                            <span>{account.institution.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {account.institution.type}
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {getTypeBadge(account.type)}
                          {account.isJoint && (
                            <span className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200">
                              Joint
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {account.owner ? (
                          <div className="flex flex-col">
                            <span>{account.owner.name}</span>
                            {account.owner.email && (
                              <span className="text-xs text-muted-foreground">
                                {account.owner.email}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <button
                          onClick={() => handleToggleStatus(account)}
                          disabled={pendingIds.has(account.id)}
                          className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium transition-colors ${
                            account.isActive
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200 hover:bg-emerald-200 dark:hover:bg-emerald-800"
                              : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                          } ${pendingIds.has(account.id) ? "opacity-50" : ""}`}
                        >
                          {account.isActive ? "Active" : "Inactive"}
                        </button>
                      </TableCell>
                      <TableCell className="p-0">
                        <div className="flex items-center justify-center gap-1">
                          <AccountEditButton
                            account={account}
                            persons={persons}
                          />
                          <button
                            type="button"
                            onClick={() => handleDelete(account)}
                            disabled={pendingIds.has(account.id)}
                            className="p-1 rounded hover:bg-rose-100 dark:hover:bg-rose-900/50 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors disabled:opacity-50"
                            title="Delete"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
    </div>
  );
}
