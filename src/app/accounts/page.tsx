import { db } from "@/lib/db";
import { AccountsTabs } from "./accounts-tabs";

export const dynamic = "force-dynamic";

async function getInstitutions() {
  return db.institution.findMany({
    orderBy: { institutionName: "asc" },
    include: {
      _count: {
        select: { accounts: true },
      },
    },
  });
}

async function getPersons() {
  return db.person.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: {
        select: {
          accounts: true,
          transactions: true,
        },
      },
    },
  });
}

async function getAccounts() {
  return db.account.findMany({
    orderBy: { accountName: "asc" },
    include: {
      institution: true,
      primaryHolder: true,
    },
  });
}

export default async function AccountsPage() {
  const [institutions, persons, accounts] = await Promise.all([
    getInstitutions(),
    getPersons(),
    getAccounts(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Accounts</h1>
        <p className="text-muted-foreground">
          Manage institutions, persons, and financial accounts.
        </p>
      </div>

      <AccountsTabs
        institutions={institutions}
        persons={persons}
        accounts={accounts}
      />
    </div>
  );
}
