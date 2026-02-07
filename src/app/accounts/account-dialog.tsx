"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createAccount, updateAccount } from "./actions";
import { InstitutionLookup } from "./institution-lookup";
import { toast } from "sonner";
import { Plus, Pencil } from "lucide-react";

const ACCOUNT_TYPES = [
  "Chequing",
  "Savings",
  "Credit Card",
  "Line of Credit",
  "Loan",
  "Mortgage",
  "Investment",
  "RRSP",
  "TFSA",
  "RESP",
  "FHSA",
  "Other",
];

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
  notes: string | null;
}

interface AccountDialogProps {
  account?: Account;
  persons: Person[];
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

export function AccountDialog({
  account,
  persons: initialPersons,
  trigger,
  onSuccess,
}: AccountDialogProps) {
  const [open, setOpen] = useState(false);
  // Use a key to reset form state when dialog opens
  const [formKey, setFormKey] = useState(0);

  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      setFormKey((k) => k + 1);
    }
    setOpen(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <button className="inline-flex items-center gap-2 rounded-md bg-violet-600 px-3 py-2 text-sm font-medium text-white hover:bg-violet-700 transition-colors">
            <Plus className="h-4 w-4" />
            Add Account
          </button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <AccountForm
          key={formKey}
          account={account}
          initialPersons={initialPersons}
          onSuccess={() => {
            setOpen(false);
            onSuccess?.();
          }}
          onCancel={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

function AccountForm({
  account,
  initialPersons,
  onSuccess,
  onCancel,
}: {
  account?: Account;
  initialPersons: Person[];
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [isPending, setIsPending] = useState(false);

  // Form state - initialized from account prop
  const [accountName, setAccountName] = useState(account?.name || "");
  const [accountNumber, setAccountNumber] = useState(account?.number || "");
  const [selectedInstitution, setSelectedInstitution] = useState<Institution | null>(
    account?.institution || null
  );
  const [accountType, setAccountType] = useState(account?.type || "Chequing");
  const [accountNickname, setAccountNickname] = useState(account?.nickname || "");
  const [currency, setCurrency] = useState(account?.currency || "CAD");
  const [creditLimit, setCreditLimit] = useState(account?.creditLimit?.toString() || "");
  const [interestRate, setInterestRate] = useState(account?.interestRate?.toString() || "");
  const [billingCycleDay, setBillingCycleDay] = useState(
    account?.billingCycleDay?.toString() || ""
  );
  const [monthlyLimit, setMonthlyLimit] = useState(account?.monthlyLimit?.toString() || "");
  const [isJoint, setIsJoint] = useState(account?.isJoint || false);
  const [ownerId, setOwnerId] = useState<number | null>(
    account?.ownerId || null
  );
  const [notes, setNotes] = useState(account?.notes || "");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!accountName.trim()) {
      toast.error("Account name is required");
      return;
    }

    setIsPending(true);

    const data = {
      name: accountName.trim(),
      number: accountNumber.trim() || undefined,
      institutionId: selectedInstitution?.id,
      type: accountType,
      nickname: accountNickname.trim() || undefined,
      currency,
      creditLimit: creditLimit ? parseFloat(creditLimit) : undefined,
      interestRate: interestRate ? parseFloat(interestRate) : undefined,
      billingCycleDay: billingCycleDay ? parseInt(billingCycleDay) : undefined,
      monthlyLimit: monthlyLimit ? parseFloat(monthlyLimit) : undefined,
      isJoint,
      ownerId: ownerId || undefined,
      notes: notes.trim() || undefined,
    };

    const result = account
      ? await updateAccount(account.id, {
          name: data.name,
          number: data.number ?? null,
          institutionId: data.institutionId ?? null,
          type: data.type,
          nickname: data.nickname ?? null,
          currency: data.currency,
          creditLimit: data.creditLimit ?? null,
          interestRate: data.interestRate ?? null,
          billingCycleDay: data.billingCycleDay ?? null,
          monthlyLimit: data.monthlyLimit ?? null,
          isJoint: data.isJoint,
          ownerId: data.ownerId ?? null,
          notes: data.notes ?? null,
        })
      : await createAccount(data);

    setIsPending(false);

    if (result.success) {
      toast.success(account ? "Account updated" : "Account created");
      onSuccess();
    } else {
      toast.error(result.error || "Failed to save account");
    }
  };

  const showCreditFields = ["Credit Card", "Line of Credit", "Loan", "Mortgage"].includes(
    accountType
  );

  return (
    <>
      <DialogHeader>
        <DialogTitle>{account ? "Edit Account" : "Add Account"}</DialogTitle>
        <DialogDescription>
          {account
            ? "Update the account details below."
            : "Enter the details for the new account."}
        </DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="account-name" className="text-sm font-medium">
                  Account Name *
                </label>
                <Input
                  id="account-name"
                  placeholder="e.g., Main Chequing"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="account-number" className="text-sm font-medium">
                  Account Number
                </label>
                <Input
                  id="account-number"
                  placeholder="Last 4 digits"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                />
              </div>
            </div>

            {/* Institution */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Institution</label>
              <InstitutionLookup
                initialInstitution={selectedInstitution}
                onSelect={setSelectedInstitution}
              />
              <p className="text-xs text-muted-foreground">
                Institution will be enabled automatically when you save
              </p>
            </div>

            {/* Account Type & Currency */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="account-type" className="text-sm font-medium">
                  Account Type
                </label>
                <select
                  id="account-type"
                  value={accountType}
                  onChange={(e) => setAccountType(e.target.value)}
                  className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs focus:outline-none focus:ring-2 focus:ring-violet-300 dark:bg-slate-800 dark:border-slate-700"
                >
                  {ACCOUNT_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label htmlFor="currency" className="text-sm font-medium">
                  Currency
                </label>
                <select
                  id="currency"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs focus:outline-none focus:ring-2 focus:ring-violet-300 dark:bg-slate-800 dark:border-slate-700"
                >
                  <option value="CAD">CAD</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                </select>
              </div>
            </div>

            {/* Credit-specific fields */}
            {showCreditFields && (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label htmlFor="credit-limit" className="text-sm font-medium">
                      Credit Limit
                    </label>
                    <Input
                      id="credit-limit"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={creditLimit}
                      onChange={(e) => setCreditLimit(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="interest-rate" className="text-sm font-medium">
                      Interest Rate %
                    </label>
                    <Input
                      id="interest-rate"
                      type="number"
                      step="0.01"
                      placeholder="19.99"
                      value={interestRate}
                      onChange={(e) => setInterestRate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="billing-day" className="text-sm font-medium">
                      Billing Day
                    </label>
                    <Input
                      id="billing-day"
                      type="number"
                      min="1"
                      max="31"
                      placeholder="1-31"
                      value={billingCycleDay}
                      onChange={(e) => setBillingCycleDay(e.target.value)}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label htmlFor="monthly-limit" className="text-sm font-medium">
                      Monthly Limit
                    </label>
                    <Input
                      id="monthly-limit"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={monthlyLimit}
                      onChange={(e) => setMonthlyLimit(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Nickname */}
            <div className="space-y-2">
              <label htmlFor="account-nickname" className="text-sm font-medium">
                Nickname
              </label>
              <Input
                id="account-nickname"
                placeholder="Optional friendly name"
                value={accountNickname}
                onChange={(e) => setAccountNickname(e.target.value)}
              />
            </div>

            {/* Owner */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Owner</label>
              <select
                value={ownerId || ""}
                onChange={(e) =>
                  setOwnerId(e.target.value ? parseInt(e.target.value) : null)
                }
                className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs focus:outline-none focus:ring-2 focus:ring-violet-300 dark:bg-slate-800 dark:border-slate-700"
              >
                <option value="">None</option>
                {initialPersons
                  .filter((c) => c.isActive)
                  .map((person) => (
                    <option key={person.id} value={person.id}>
                      {person.name}
                      {person.email && ` (${person.email})`}
                    </option>
                  ))}
              </select>
            </div>

            {/* Joint Account */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is-joint"
                checked={isJoint}
                onChange={(e) => setIsJoint(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              <label htmlFor="is-joint" className="text-sm font-medium">
                Joint Account
              </label>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <label htmlFor="notes" className="text-sm font-medium">
                Notes
              </label>
              <Input
                id="notes"
                placeholder="Optional notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <button
              type="button"
              onClick={onCancel}
              disabled={isPending}
              className="px-3 py-2 text-sm text-slate-600 hover:text-slate-800 dark:text-slate-400"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-3 py-2 text-sm bg-violet-600 text-white rounded-md hover:bg-violet-700 disabled:opacity-50"
            >
              {isPending ? "Saving..." : account ? "Update" : "Create"}
            </button>
          </DialogFooter>
        </form>
    </>
  );
}

// Simple edit button trigger
export function AccountEditButton({
  account,
  persons,
  onSuccess,
}: {
  account: Account;
  persons: Person[];
  onSuccess?: () => void;
}) {
  return (
    <AccountDialog
      account={account}
      persons={persons}
      onSuccess={onSuccess}
      trigger={
        <button
          type="button"
          className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
          title="Edit"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
      }
    />
  );
}
