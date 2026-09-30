import { redirect } from "next/navigation";
import { AppFrame } from "@/components/ui/AppFrame";
import { getAccount } from "@/features/account/queries";
import { getOwnStore, listCompetitors, MOCK_ACCOUNT } from "@/features/appData/mock";

export default async function AppLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // src/proxy.ts already guards these routes; this is the belt to its braces.
  const account = await getAccount();
  if (!account) redirect("/login");

  // UI Step 5: screens run on mock data (src/features/appData/mock.ts); Step 6
  // wires the real account, store and competitors.
  const [ownStore, competitors] = await Promise.all([getOwnStore(), listCompetitors()]);

  return (
    <AppFrame account={MOCK_ACCOUNT} ownStore={ownStore} competitorCount={competitors.length}>
      {children}
    </AppFrame>
  );
}
