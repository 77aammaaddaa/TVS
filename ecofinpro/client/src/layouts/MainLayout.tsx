import { Outlet } from "react-router-dom";
import Sidebar from "@/components/Sidebar";
import type { User } from "@/types/auth";

interface MainLayoutProps {
  user: User;
  onLogout: () => void;
}

export default function MainLayout({ user, onLogout }: MainLayoutProps) {

  return (
    <div className="h-screen bg-slate-50 flex flex-col overflow-hidden" dir="rtl">
      {/* Top Navigation Bar */}
      <Sidebar
        user={user}
        onLogout={onLogout}
      />
      
      {/* Main Content Area */}
      <main className="flex-1 overflow-hidden relative">
        <div className="absolute inset-0 overflow-y-auto p-4 md:p-6 custom-scroll">
          <div className="max-w-7xl mx-auto h-full">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}