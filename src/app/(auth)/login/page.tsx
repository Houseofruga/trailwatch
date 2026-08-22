import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { AuthForm } from "@/features/auth/AuthForm";
import styles from "./page.module.css";

export default function LoginPage() {
  return (
    <div className={styles.wrap}>
      <div className={styles.inner}>
        <Link href="/" className={styles.logoLink}>
          <Image
            src="/logo-branded.svg"
            alt="Trailwatch"
            width={180}
            height={48}
            className={styles.logo}
            priority
          />
        </Link>
        <Suspense fallback={null}>
          <AuthForm initialMode="login" />
        </Suspense>
      </div>
    </div>
  );
}
