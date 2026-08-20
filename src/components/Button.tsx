import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import styles from "./Button.module.css";

type Variant = "primary" | "secondary" | "dark";

function classesFor(variant: Variant, full?: boolean, extra?: string) {
  return [styles[variant], full ? styles.full : null, extra].filter(Boolean).join(" ");
}

type ButtonProps = {
  variant?: Variant;
  full?: boolean;
  children: ReactNode;
} & ComponentProps<"button">;

export function Button({
  variant = "primary",
  full,
  className,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button className={classesFor(variant, full, className)} {...rest}>
      {children}
    </button>
  );
}

type ButtonLinkProps = {
  variant?: Variant;
  full?: boolean;
  children: ReactNode;
} & ComponentProps<typeof Link>;

export function ButtonLink({
  variant = "primary",
  full,
  className,
  children,
  ...rest
}: ButtonLinkProps) {
  return (
    <Link className={classesFor(variant, full, className)} {...rest}>
      {children}
    </Link>
  );
}
