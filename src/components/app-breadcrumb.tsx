import { useLocation, Link } from "react-router-dom";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Fragment } from "react";

const labelMap: Record<string, string> = {
  dashboard: "Dashboard",
  tickets: "Tickets",
  create: "Create Ticket",
  admin: "Admin",
  users: "Users",
  analytics: "Analytics",
  settings: "Settings",
  profile: "Profile",
};

export function AppBreadcrumb() {
  const { pathname } = useLocation();
  const segments = pathname.split("/").filter(Boolean);

  if (segments.length <= 1) return null;

  return (
    <Breadcrumb className="mb-4">
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link to="/dashboard">Home</Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        {segments.map((seg, i) => {
          const path = "/" + segments.slice(0, i + 1).join("/");
          const isLast = i === segments.length - 1;
          const label = labelMap[seg] || seg;

          return (
            <Fragment key={path}>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                {isLast ? (
                  <BreadcrumbPage>{label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link to={path}>{label}</Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
