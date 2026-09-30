import { AppFrame } from "@/components/ui/AppFrame";
import { getAccount, getOwnStore } from "@/features/appData/queries";

// Onboarding runs inside the app frame with the nav disabled (02-Onboarding).
export default async function OnboardingLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const [account, ownStore] = await Promise.all([getAccount(), getOwnStore()]);
  return (
    <AppFrame account={account} ownStore={ownStore} competitorCount={0} navDisabled>
      {children}
    </AppFrame>
  );
}
