import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { ForgotPasswordForm } from "@/features/auth/ForgotPasswordForm";
import styles from "../login/page.module.css";

export default function ForgotPasswordPage() {
  return (
    <div className={styles.wrap}>
      <div className={styles.inner}>
        <Link href="/" className={styles.logoLink}>
          <Image
            src="/logo.svg"
            alt="Trailwatch"
            width={180}
            height={48}
            className={styles.logo}
            priority
          />
        </Link>
        <Suspense fallback={null}>
          <ForgotPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
