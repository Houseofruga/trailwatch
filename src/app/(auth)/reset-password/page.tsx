import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { ResetPasswordForm } from "@/features/auth/ResetPasswordForm";
import styles from "../login/page.module.css";

export default function ResetPasswordPage() {
  return (
    <div className={styles.wrap}>
      <div className={styles.inner}>
        <Link href="/" className={styles.logoLink}>
          <Image
            src="/logo-branded.svg"
            alt="Trailwatch"
            width={186}
            height={48}
            className={styles.logo}
            priority
          />
        </Link>
        <Suspense fallback={null}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
