import { AppFrame } from "@/components/ui/AppFrame";
import { countOpenOpportunities, getAccount, getOwnStore, listCompetitors } from "@/features/appData/queries";

export default async function AppLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // src/proxy.ts guards these routes; the queries redirect to /login too.
  const [account, ownStore, competitors, opportunityCount] = await Promise.all([
    getAccount(),
    getOwnStore(),
    listCompetitors(),
    countOpenOpportunities(),
  ]);
  return (
    <AppFrame account={account} ownStore={ownStore} competitorCount={competitors.length} opportunityCount={opportunityCount}>
      {children}
    </AppFrame>
  );
}
