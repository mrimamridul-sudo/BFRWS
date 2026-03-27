/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Wrench, 
  CalendarClock,
  History, 
  ShieldCheck, 
  LogOut,
  Bus as BusIcon,
  Users,
  ClipboardCheck,
  MessageSquare,
  User as UserIcon,
  Contact,
  AlertOctagon,
  Download
} from 'lucide-react';
import { User } from '../types';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface LayoutProps {
  user: User;
  onLogout: () => void;
}

export default function Layout({ user, onLogout }: LayoutProps) {
  const navigate = useNavigate();
  const [deferredPrompt, setDeferredPrompt] = React.useState<any>(null);
  const [showInstallBtn, setShowInstallBtn] = React.useState(false);

  React.useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBtn(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowInstallBtn(false);
    }
    setDeferredPrompt(null);
  };

  const handleLogout = () => {
    onLogout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen text-zinc-900 font-sans overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 border-r border-zinc-200 flex flex-col bg-white/50 backdrop-blur-xl">
        <div className="p-6 border-b border-zinc-200 flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center border border-emerald-500/20">
            <BusIcon className="w-6 h-6 text-emerald-500" />
          </div>
          <div>
            <h1 className="font-bold text-sm tracking-tight text-zinc-900">MAINTENANCE</h1>
            <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest">Bus Pro v1.0</p>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          <NavLink 
            to="/" 
            className={({ isActive }) => cn(
              "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
              isActive ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20" : "text-zinc-500 hover:bg-white/80 hover:text-zinc-900"
            )}
          >
            <LayoutDashboard className="w-5 h-5" />
            <span className="text-sm font-medium">Dashboard</span>
          </NavLink>

          <NavLink 
            to="/maintenance" 
            className={({ isActive }) => cn(
              "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
              isActive ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20" : "text-zinc-500 hover:bg-white/80 hover:text-zinc-900"
            )}
          >
            <Wrench className="w-5 h-5" />
            <span className="text-sm font-medium">Active Jobs</span>
          </NavLink>

          <NavLink 
            to="/schedule" 
            className={({ isActive }) => cn(
              "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
              isActive ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20" : "text-zinc-500 hover:bg-white/80 hover:text-zinc-900"
            )}
          >
            <CalendarClock className="w-5 h-5" />
            <span className="text-sm font-medium">Schedule</span>
          </NavLink>

          <NavLink 
            to="/fleet" 
            className={({ isActive }) => cn(
              "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
              isActive ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20" : "text-zinc-500 hover:bg-white/80 hover:text-zinc-900"
            )}
          >
            <BusIcon className="w-5 h-5" />
            <span className="text-sm font-medium">Fleet</span>
          </NavLink>

          <NavLink 
            to="/manpower" 
            className={({ isActive }) => cn(
              "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
              isActive ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20" : "text-zinc-500 hover:bg-white/80 hover:text-zinc-900"
            )}
          >
            <Users className="w-5 h-5" />
            <span className="text-sm font-medium">Manpower</span>
          </NavLink>

          <NavLink 
            to="/attendance" 
            className={({ isActive }) => cn(
              "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
              isActive ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20" : "text-zinc-500 hover:bg-white/80 hover:text-zinc-900"
            )}
          >
            <ClipboardCheck className="w-5 h-5" />
            <span className="text-sm font-medium">Attendance</span>
          </NavLink>

          <NavLink 
            to="/comments" 
            className={({ isActive }) => cn(
              "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
              isActive ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20" : "text-zinc-500 hover:bg-white/80 hover:text-zinc-900"
            )}
          >
            <MessageSquare className="w-5 h-5" />
            <span className="text-sm font-medium">Comments</span>
          </NavLink>

          <NavLink 
            to="/breakdowns" 
            className={({ isActive }) => cn(
              "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
              isActive ? "bg-red-500/10 text-red-600 border border-red-500/20" : "text-zinc-500 hover:bg-white/80 hover:text-zinc-900"
            )}
          >
            <AlertOctagon className="w-5 h-5" />
            <span className="text-sm font-medium">Breakdowns</span>
          </NavLink>

          <NavLink 
            to="/history" 
            className={({ isActive }) => cn(
              "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
              isActive ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20" : "text-zinc-500 hover:bg-white/80 hover:text-zinc-900"
            )}
          >
            <History className="w-5 h-5" />
            <span className="text-sm font-medium">History</span>
          </NavLink>

          <NavLink 
            to="/profile" 
            className={({ isActive }) => cn(
              "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
              isActive ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20" : "text-zinc-500 hover:bg-white/80 hover:text-zinc-900"
            )}
          >
            <UserIcon className="w-5 h-5" />
            <span className="text-sm font-medium">My Profile</span>
          </NavLink>

          <NavLink 
            to="/directory" 
            className={({ isActive }) => cn(
              "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
              isActive ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20" : "text-zinc-500 hover:bg-white/80 hover:text-zinc-900"
            )}
          >
            <Contact className="w-5 h-5" />
            <span className="text-sm font-medium">User Directory</span>
          </NavLink>

          {user.role === 'admin' && (
            <NavLink 
              to="/admin" 
              className={({ isActive }) => cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
                isActive ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20" : "text-zinc-500 hover:bg-white/80 hover:text-zinc-900"
              )}
            >
              <ShieldCheck className="w-5 h-5" />
              <span className="text-sm font-medium">Admin Panel</span>
            </NavLink>
          )}
        </nav>

        <div className="p-4 border-t border-zinc-200">
          <button 
            onClick={() => navigate('/profile')}
            className="w-full bg-white/50 rounded-2xl p-4 mb-4 text-left hover:bg-white transition-colors group border border-zinc-200"
          >
            <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest mb-1 group-hover:text-emerald-600 transition-colors">Active User</p>
            <p className="text-sm font-medium text-zinc-900 truncate">{user.username}</p>
            <p className="text-[10px] text-emerald-600 font-mono">{user.role.toUpperCase()} {user.depot ? `• ${user.depot}` : ''}</p>
          </button>
          {showInstallBtn && (
            <button 
              onClick={handleInstallClick}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-emerald-600 bg-emerald-500/10 hover:bg-emerald-500/20 transition-all duration-200 mb-2 border border-emerald-500/20"
            >
              <Download className="w-5 h-5" />
              <span className="text-sm font-medium">Install App</span>
            </button>
          )}
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-zinc-500 hover:bg-red-500/10 hover:text-red-600 transition-all duration-200"
          >
            <LogOut className="w-5 h-5" />
            <span className="text-sm font-medium">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-transparent">
        <div className="max-w-7xl mx-auto p-8">
          <div className="flex justify-end mb-6 md:hidden">
            <button 
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-zinc-200 rounded-xl text-zinc-500 hover:text-red-600 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span className="text-sm font-medium">Sign Out</span>
            </button>
          </div>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
