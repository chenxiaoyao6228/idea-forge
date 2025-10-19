import * as React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { cn } from '@idea/ui/shadcn/utils';
import { useCallback, useMemo, useRef } from "react";

export interface NavLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  to: string;
  activeClassName?: string;
  exact?: boolean;
  replace?: boolean;
  isActive?: (pathname: string) => boolean;
  children: React.ReactNode;
}

export function NavLink({
  to,
  activeClassName = "bg-accent",
  exact = false,
  replace = false,
  isActive: isActiveProp,
  className,
  children,
  onClick,
  ...rest
}: NavLinkProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const linkRef = useRef<HTMLAnchorElement>(null);

  const isActive = useMemo(() => {
    if (isActiveProp) {
      return isActiveProp(location.pathname);
    }

    if (exact) {
      return location.pathname === to;
    }

    return location.pathname.startsWith(to);
  }, [location.pathname, to, exact, isActiveProp]);

  const handleClick = useCallback(
    (event: React.MouseEvent<HTMLAnchorElement>) => {
      onClick?.(event);

      if (
        event.button === 0 && // Left click only
        !event.defaultPrevented &&
        !event.altKey &&
        !event.metaKey &&
        !event.ctrlKey &&
        !isActive
      ) {
        event.preventDefault();
        event.stopPropagation();

        if (replace) {
          navigate(to, { replace: true });
        } else {
          navigate(to);
        }
      }
    },
    [onClick, navigate, to, replace, isActive],
  );

  return (
    <Link ref={linkRef} to={to} className={cn("nav-link", className, isActive && activeClassName)} onClick={handleClick} {...rest}>
      {children}
    </Link>
  );
}
