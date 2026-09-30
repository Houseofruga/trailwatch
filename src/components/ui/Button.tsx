import Link from "next/link";
import { SpinnerIcon } from "./icons";
import styles from "./Button.module.css";

type Variant = "primary" | "secondary" | "grey" | "plain" | "plainDark" | "critical";

type Common = {
  variant?: Variant;
  loading?: boolean;
  /** Icon before the label. */
  icon?: React.ReactNode;
  /** Icon-only button: square, needs `label`. */
  iconOnly?: boolean;
  full?: boolean;
  /** Always 44px tall (auth cards), not just on mobile. */
  tall?: boolean;
  children?: React.ReactNode;
  className?: string;
};

type AsButton = Common &
  Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "children"> & { href?: undefined };
type AsLink = Common & { href: string; external?: boolean; "aria-label"?: string };

const SPIN_TONE: Record<Variant, string> = {
  primary: "#ffffff",
  critical: "#ffffff",
  secondary: "#303030",
  grey: "#303030",
  plain: "#303030",
  plainDark: "#303030",
};

function classes({ variant = "secondary", full, tall, iconOnly, loading, className }: Common) {
  return [
    styles.button,
    styles[variant],
    full ? styles.full : "",
    tall ? styles.tall : "",
    iconOnly ? styles.iconOnly : "",
    loading ? styles.loading : "",
    className ?? "",
  ].join(" ");
}

function Content({ icon, children, loading, variant = "secondary" }: Common) {
  return (
    <>
      {loading ? (
        <span className={styles.spinner}>
          <SpinnerIcon tone={SPIN_TONE[variant]} />
        </span>
      ) : null}
      <span className={styles.label}>
        {icon}
        {children ? <span>{children}</span> : null}
      </span>
    </>
  );
}

export function Button(props: AsButton | AsLink) {
  if (props.href !== undefined) {
    const { href, external, variant, loading, icon, iconOnly, full, tall, children, className, ...rest } = props;
    const cls = classes({ variant, full, tall, iconOnly, loading, className });
    const content = <Content {...{ icon, children, loading, variant }} />;
    return external ? (
      <a href={href} className={cls} target="_blank" rel="noopener noreferrer" {...rest}>
        {content}
      </a>
    ) : (
      <Link href={href} className={cls} {...rest}>
        {content}
      </Link>
    );
  }
  const { variant, loading, icon, iconOnly, full, tall, children, className, disabled, type, ...rest } = props;
  return (
    <button
      type={type ?? "button"}
      className={classes({ variant, full, tall, iconOnly, loading, className })}
      disabled={disabled}
      aria-busy={loading || undefined}
      {...rest}
    >
      <Content {...{ icon, children, loading, variant }} />
    </button>
  );
}
