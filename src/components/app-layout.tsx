import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { AppHeader } from "@/components/app-header";
import { AppFooter } from "@/components/app-footer";
import { AppBreadcrumb } from "@/components/app-breadcrumb";

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <AppHeader />
          <main className="flex-1 p-4 md:p-6 overflow-auto">
            <AppBreadcrumb />
            {children}
          </main>
          <AppFooter />
        </div>
      </div>
    </SidebarProvider>
  );
}
