import { redirect } from "next/navigation";
import { AppFrame } from "@/components/ui/AppFrame";
import { getAccount } from "@/features/account/queries";
import { getOwnStore, MOCK_ACCOUNT } from "@/features/appData/mock";

// Onboarding runs inside the app frame with the nav disabled (02-Onboarding).
export default async function OnboardingLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const account = await getAccount();
  if (!account) redirect("/login");
  const ownStore = await getOwnStore(); // mock until Step 6

  return (
    <AppFrame account={MOCK_ACCOUNT} ownStore={ownStore} competitorCount={0} navDisabled>
      {children}
    </AppFrame>
  );
}
