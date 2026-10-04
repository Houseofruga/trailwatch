import { AppFrame } from "@/components/ui/AppFrame";
import { isAdminEmail } from "@/features/usage/report";
import { countOpenOpportunities, getAccount, getBetaStatus, getOwnStore, listCompetitors } from "@/features/appData/queries";

export default async function AppLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // src/proxy.ts guards these routes; the queries redirect to /login too.
  const [account, ownStore, competitors, opportunityCount, beta] = await Promise.all([
    getAccount(),
    getOwnStore(),
    listCompetitors(),
    countOpenOpportunities(),
    getBetaStatus(),
  ]);
  return (
    <AppFrame account={account} ownStore={ownStore} competitorCount={competitors.length} opportunityCount={opportunityCount} beta={beta} isAdmin={isAdminEmail(account.email)}>
      {children}
    </AppFrame>
  );
}
