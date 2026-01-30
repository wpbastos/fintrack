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
import { toast } from "sonner";
import { Trash2, X, Power, PowerOff } from "lucide-react";

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

interface Institution {
  id: number;
  institutionName: string;
  institutionType: string;
  isActive: boolean;
}

interface Cardholder {
  id: number;
  name: string;
  email: string | null;
  isActive: boolean;
}

interface Account {
  id: number;
  accountName: string;
  accountNumber: string | null;
  institutionId: number | null;
  institution: Institution | null;
  accountType: string;
  accountNickname: string | null;
  currency: string;
  creditLimit: number | null;
  interestRate: number | null;
  billingCycleDay: number | null;
  isJoint: boolean;
  primaryHolderId: number | null;
  primaryHolder: Cardholder | null;
  isActive: boolean;
  notes: string | null;
}

interface AccountsPanelProps {
  accounts: Account[];
  cardholders: Cardholder[];
}

export function AccountsPanel({ accounts, cardholders }: AccountsPanelProps) {
  const [pendingIds, setPendingIds] = useState<Set<number>>(new Set());
  const [search, setSearch] = useState("");
  const [bulkPending, setBulkPending] = useState(false);

  // Filter accounts by search (name, nickname, institution, cardholder)
  const filteredAccounts = search
    ? accounts.filter((a) => {
        const query = search.toLowerCase();
        return (
          a.accountName.toLowerCase().includes(query) ||
          (a.accountNickname?.toLowerCase().includes(query) ?? false) ||
          (a.institution?.institutionName.toLowerCase().includes(query) ?? false) ||
          (a.primaryHolder?.name.toLowerCase().includes(query) ?? false) ||
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
    if (!confirm(`Are you sure you want to delete "${account.accountName}"?`)) {
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
        <AccountDialog cardholders={cardholders} />
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
                    <TableHead>Cardholder</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="p-0"></TableHead>
                  </TableRow>
                </TableHeader>
              <TableBody>
                {filteredAccounts.map((account) => (
                  <TableRow key={account.id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{account.accountName}</span>
                        {account.accountNickname && (
                          <span className="text-xs text-muted-foreground">
                            {account.accountNickname}
                          </span>
                        )}
                        {account.accountNumber && (
                          <span className="text-xs text-muted-foreground">
                            ****{account.accountNumber}
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
                          <span>{account.institution.institutionName}</span>
                          <span className="text-xs text-muted-foreground">
                            {account.institution.institutionType}
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {getTypeBadge(account.accountType)}
                        {account.isJoint && (
                          <span className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200">
                            Joint
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {account.primaryHolder ? (
                        <div className="flex flex-col">
                          <span>{account.primaryHolder.name}</span>
                          {account.primaryHolder.email && (
                            <span className="text-xs text-muted-foreground">
                              {account.primaryHolder.email}
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
                          cardholders={cardholders}
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
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
    </div>
  );
}
