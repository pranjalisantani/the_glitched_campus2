import React from 'react';
import Link from 'next/link';

interface BaseButtonProps {
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  'aria-label'?: string;
}

interface ActionButtonProps extends BaseButtonProps {
  href?: never;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  type?: 'button' | 'submit' | 'reset';
}

interface LinkButtonProps extends BaseButtonProps {
  href: string;
  onClick?: never;
  type?: never;
}

export type ButtonProps = ActionButtonProps | LinkButtonProps;

export const PrimaryButton: React.FC<ButtonProps> = ({
  children,
  className = '',
  disabled = false,
  loading = false,
  icon,
  href,
  onClick,
  type = 'button',
  'aria-label': ariaLabel
}) => {
  const content = (
    <>
      {loading ? (
        <span
          className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin shrink-0"
          aria-hidden="true"
        />
      ) : icon ? (
        <span className="shrink-0" aria-hidden="true">
          {icon}
        </span>
      ) : null}
      <span>{children}</span>
    </>
  );

  const baseClasses =
    'cyber-button-primary inline-flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cyan-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-void)] select-none';

  if (href && !disabled) {
    return (
      <Link
        href={href}
        className={`${baseClasses} ${className}`}
        aria-label={ariaLabel}
      >
        {content}
      </Link>
    );
  }

  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      className={`${baseClasses} ${className}`}
      aria-label={ariaLabel}
      aria-busy={loading}
    >
      {content}
    </button>
  );
};

export const GhostButton: React.FC<ButtonProps> = ({
  children,
  className = '',
  disabled = false,
  loading = false,
  icon,
  href,
  onClick,
  type = 'button',
  'aria-label': ariaLabel
}) => {
  const content = (
    <>
      {loading ? (
        <span
          className="w-4 h-4 border-2 border-[var(--cyan-primary)] border-t-transparent rounded-full animate-spin shrink-0"
          aria-hidden="true"
        />
      ) : icon ? (
        <span className="shrink-0" aria-hidden="true">
          {icon}
        </span>
      ) : null}
      <span>{children}</span>
    </>
  );

  const baseClasses =
    'cyber-button-secondary inline-flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cyan-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-void)] select-none';

  if (href && !disabled) {
    return (
      <Link
        href={href}
        className={`${baseClasses} ${className}`}
        aria-label={ariaLabel}
      >
        {content}
      </Link>
    );
  }

  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      className={`${baseClasses} ${className}`}
      aria-label={ariaLabel}
      aria-busy={loading}
    >
      {content}
    </button>
  );
};
