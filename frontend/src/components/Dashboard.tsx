"use client";

import Sidebar from "./Sidebar";
import Header from "./Header";
import Footer from "./Footer";
import HomePage from "./HomePage";
import AnalysisPage from "./AnalysisPage";
import IntegrationsPage from "./IntegrationsPage";
import SettingsPage from "./SettingsPage";
import { usePathname } from "next/navigation";

export default function Dashboard() {
  const pathname = usePathname();

  const renderPage = () => {
    switch (pathname) {
      case "/analysis":
        return <AnalysisPage />;
      case "/integrations":
        return <IntegrationsPage />;
      case "/settings":
        return <SettingsPage />;
      default:
        return <HomePage />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <Header />

        {/* Page Content */}
        <main className="flex-1 p-6 overflow-y-auto">{renderPage()}</main>

        {/* Footer */}
        <Footer />
      </div>
    </div>
  );
}
