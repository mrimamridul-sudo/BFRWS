/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Bus as BusIcon, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Plus,
  ArrowUpRight,
  Filter,
  Users as UsersIcon,
  Contact,
  ShieldCheck,
  Search,
  X,
  FileText,
  User as UserIcon,
  AlertOctagon
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { User, MaintenanceJob, Depot, Bus, Staff, Breakdown } from '../types';
import { DEPOTS } from '../constants';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface DashboardProps {
  user: User;
}

export default function Dashboard({ user }: DashboardProps) {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<MaintenanceJob[]>([]);
  const [fleet, setFleet] = useState<Bus[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [breakdowns, setBreakdowns] = useState<Breakdown[]>([]);
  const [userCount, setUserCount] = useState(0);
  const [selectedDepot, setSelectedDepot] = useState<Depot | 'All'>(user.role === 'admin' ? 'All' : user.depot!);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.search-container')) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    // Real-time sync for Maintenance Jobs
    const jobsQuery = query(collection(db, 'maintenance_jobs'), orderBy('createdAt', 'desc'));
    const unsubscribeJobs = onSnapshot(jobsQuery, (snapshot) => {
      const jobsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MaintenanceJob));
      setJobs(jobsData);
    });

    // Real-time sync for Fleet
    const fleetQuery = query(collection(db, 'buses'), orderBy('createdAt', 'desc'));
    const unsubscribeFleet = onSnapshot(fleetQuery, (snapshot) => {
      const fleetData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Bus));
      setFleet(fleetData);
    });

    // Real-time sync for Staff
    const staffQuery = query(collection(db, 'staff'), orderBy('createdAt', 'desc'));
    const unsubscribeStaff = onSnapshot(staffQuery, (snapshot) => {
      const staffData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Staff));
      setStaff(staffData);
    });

    // Real-time sync for Breakdowns
    const breakdownsQuery = query(collection(db, 'breakdowns'), orderBy('createdAt', 'desc'));
    const unsubscribeBreakdowns = onSnapshot(breakdownsQuery, (snapshot) => {
      const breakdownsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Breakdown));
      setBreakdowns(breakdownsData);
    });

    // Real-time sync for Users
    const usersQuery = collection(db, 'users');
    const unsubscribeUsers = onSnapshot(usersQuery, (snapshot) => {
      setUserCount(snapshot.size);
    });

    return () => {
      unsubscribeJobs();
      unsubscribeFleet();
      unsubscribeStaff();
      unsubscribeBreakdowns();
      unsubscribeUsers();
    };
  }, []);

  const searchResults = {
    jobs: jobs.filter(j => 
      j.busNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      j.jobDescription.toLowerCase().includes(searchQuery.toLowerCase()) ||
      j.technician.toLowerCase().includes(searchQuery.toLowerCase())
    ).slice(0, 5),
    fleet: fleet.filter(b => 
      b.busNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (b.model?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
    ).slice(0, 5),
    staff: staff.filter(s => 
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.employeeId?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
    ).slice(0, 5),
    breakdowns: breakdowns.filter(b => 
      b.busNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.causes.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.location.toLowerCase().includes(searchQuery.toLowerCase())
    ).slice(0, 5)
  };

  const hasResults = searchQuery.length > 0 && (
    searchResults.jobs.length > 0 || 
    searchResults.fleet.length > 0 || 
    searchResults.staff.length > 0 ||
    searchResults.breakdowns.length > 0
  );

  const filteredJobs = jobs.filter(job => {
    if (selectedDepot === 'All') return true;
    return job.depot === selectedDepot;
  });

  const filteredBreakdowns = breakdowns.filter(b => {
    if (selectedDepot === 'All') return true;
    return b.depot === selectedDepot;
  });

  const stats = {
    total: filteredJobs.length,
    pending: filteredJobs.filter(j => j.status === 'Pending').length,
    inProgress: filteredJobs.filter(j => j.status === 'In Progress').length,
    completed: filteredJobs.filter(j => j.status === 'Completed').length,
    breakdowns: filteredBreakdowns.length,
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Global Search Bar */}
      <div className="relative z-50 search-container">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
          <input 
            type="text" 
            placeholder="Search across all data (Buses, Jobs, Staff)..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowResults(true);
            }}
            onFocus={() => setShowResults(true)}
            className="w-full bg-white/80 border border-zinc-200 rounded-2xl py-4 pl-12 pr-12 text-zinc-900 focus:outline-none focus:border-emerald-500/50 transition-all shadow-xl"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-zinc-100 rounded-full text-zinc-500"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Search Results Dropdown */}
        {showResults && searchQuery && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-zinc-200 rounded-2xl shadow-2xl overflow-hidden max-h-[70vh] overflow-y-auto z-50">
            {!hasResults ? (
              <div className="p-8 text-center text-zinc-500">
                <Search className="w-8 h-8 mx-auto mb-2 opacity-20" />
                <p>No results found for "{searchQuery}"</p>
              </div>
            ) : (
              <div className="p-2 space-y-4">
                {searchResults.jobs.length > 0 && (
                  <div>
                    <h4 className="px-4 py-2 text-[10px] font-mono uppercase tracking-widest text-zinc-500">Maintenance Jobs</h4>
                    <div className="space-y-1">
                      {searchResults.jobs.map(job => (
                        <button 
                          key={job.id}
                          onClick={() => {
                            navigate('/history');
                            setShowResults(false);
                            setSearchQuery('');
                          }}
                          className="w-full text-left px-4 py-3 rounded-xl hover:bg-zinc-50 transition-colors flex items-center gap-3"
                        >
                          <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500">
                            <FileText className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-zinc-900">{job.busNumber}</p>
                            <p className="text-xs text-zinc-500 truncate max-w-[300px]">{job.jobDescription}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {searchResults.fleet.length > 0 && (
                  <div>
                    <h4 className="px-4 py-2 text-[10px] font-mono uppercase tracking-widest text-zinc-500">Fleet / Buses</h4>
                    <div className="space-y-1">
                      {searchResults.fleet.map(bus => (
                        <button 
                          key={bus.id}
                          onClick={() => {
                            navigate('/fleet');
                            setShowResults(false);
                            setSearchQuery('');
                          }}
                          className="w-full text-left px-4 py-3 rounded-xl hover:bg-zinc-50 transition-colors flex items-center gap-3"
                        >
                          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                            <BusIcon className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-zinc-900">{bus.busNumber}</p>
                            <p className="text-xs text-zinc-500">{bus.model || 'Unknown Model'}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {searchResults.staff.length > 0 && (
                  <div>
                    <h4 className="px-4 py-2 text-[10px] font-mono uppercase tracking-widest text-zinc-500">Manpower / Staff</h4>
                    <div className="space-y-1">
                      {searchResults.staff.map(s => (
                        <button 
                          key={s.id}
                          onClick={() => {
                            navigate('/manpower');
                            setShowResults(false);
                            setSearchQuery('');
                          }}
                          className="w-full text-left px-4 py-3 rounded-xl hover:bg-zinc-50 transition-colors flex items-center gap-3"
                        >
                          <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-500">
                            <UserIcon className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-zinc-900">{s.name}</p>
                            <p className="text-xs text-zinc-500">{s.designation} • {s.employeeId || 'No ID'}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {searchResults.breakdowns.length > 0 && (
                  <div>
                    <h4 className="px-4 py-2 text-[10px] font-mono uppercase tracking-widest text-zinc-500">Breakdowns</h4>
                    <div className="space-y-1">
                      {searchResults.breakdowns.map(b => (
                        <button 
                          key={b.id}
                          onClick={() => {
                            navigate('/breakdowns');
                            setShowResults(false);
                            setSearchQuery('');
                          }}
                          className="w-full text-left px-4 py-3 rounded-xl hover:bg-zinc-50 transition-colors flex items-center gap-3"
                        >
                          <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center text-red-500">
                            <AlertOctagon className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-zinc-900">{b.busNumber}</p>
                            <p className="text-xs text-zinc-500 truncate max-w-[300px]">{b.causes}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="p-2 border-t border-zinc-200 mt-2">
                  <p className="text-[10px] text-center text-zinc-500">Showing top results. Use specific pages for detailed search.</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-zinc-900">
            {selectedDepot === 'All' ? 'Fleet Overview' : `${selectedDepot} Dashboard`}
          </h2>
          <p className="text-zinc-500 mt-1">Real-time maintenance status and fleet health.</p>
        </div>

        {user.role === 'admin' && (
          <div className="flex items-center gap-2 bg-white/50 backdrop-blur-sm border border-zinc-200 p-1 rounded-xl">
            <button 
              onClick={() => setSelectedDepot('All')}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                selectedDepot === 'All' ? "bg-zinc-800 text-white" : "text-zinc-500 hover:text-zinc-900"
              )}
            >
              All Depots
            </button>
            {DEPOTS.map(depot => (
              <button 
                key={depot}
                onClick={() => setSelectedDepot(depot)}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                  selectedDepot === depot ? "bg-zinc-800 text-white" : "text-zinc-500 hover:text-zinc-900"
                )}
              >
                {depot}
              </button>
            ))}
          </div>
        )}
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
        <StatCard 
          label="Total Jobs" 
          value={stats.total} 
          icon={<BusIcon className="w-5 h-5 text-zinc-400" />}
          color="zinc"
        />
        <StatCard 
          label="Pending" 
          value={stats.pending} 
          icon={<AlertTriangle className="w-5 h-5 text-amber-500" />}
          color="amber"
        />
        <StatCard 
          label="In Progress" 
          value={stats.inProgress} 
          icon={<Clock className="w-5 h-5 text-blue-500" />}
          color="blue"
        />
        <StatCard 
          label="Completed" 
          value={stats.completed} 
          icon={<CheckCircle2 className="w-5 h-5 text-emerald-500" />}
          color="emerald"
        />
        <div onClick={() => navigate('/breakdowns')} className="cursor-pointer">
          <StatCard 
            label="Breakdowns" 
            value={stats.breakdowns} 
            icon={<AlertOctagon className="w-5 h-5 text-red-500" />}
            color="red"
          />
        </div>
        <div onClick={() => navigate('/directory')} className="cursor-pointer">
          <StatCard 
            label="User Directory" 
            value={userCount} 
            icon={<Contact className="w-5 h-5 text-purple-500" />}
            color="purple"
          />
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <button 
          onClick={() => navigate('/directory')}
          className="bg-white/80 backdrop-blur-sm border border-zinc-200 p-6 rounded-3xl flex items-center gap-4 hover:border-emerald-500/50 transition-all group shadow-sm"
        >
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 group-hover:bg-emerald-500 group-hover:text-white transition-all">
            <Contact className="w-6 h-6" />
          </div>
          <div className="text-left">
            <h4 className="font-bold text-zinc-900">User Directory</h4>
            <p className="text-xs text-zinc-500">View all depot personnel</p>
          </div>
        </button>

        <button 
          onClick={() => navigate('/maintenance')}
          className="bg-white/80 backdrop-blur-sm border border-zinc-200 p-6 rounded-3xl flex items-center gap-4 hover:border-blue-500/50 transition-all group shadow-sm"
        >
          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20 group-hover:bg-blue-500 group-hover:text-white transition-all">
            <Plus className="w-6 h-6" />
          </div>
          <div className="text-left">
            <h4 className="font-bold text-zinc-900">New Job</h4>
            <p className="text-xs text-zinc-500">Log maintenance activity</p>
          </div>
        </button>

        <button 
          onClick={() => navigate('/breakdowns')}
          className="bg-white/80 backdrop-blur-sm border border-zinc-200 p-6 rounded-3xl flex items-center gap-4 hover:border-red-500/50 transition-all group shadow-sm"
        >
          <div className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center border border-red-500/20 group-hover:bg-red-500 group-hover:text-white transition-all">
            <AlertOctagon className="w-6 h-6" />
          </div>
          <div className="text-left">
            <h4 className="font-bold text-zinc-900">Breakdowns</h4>
            <p className="text-xs text-zinc-500">Log & view breakdowns</p>
          </div>
        </button>

        {user.role === 'admin' && (
          <button 
            onClick={() => navigate('/admin')}
            className="bg-white/80 backdrop-blur-sm border border-zinc-200 p-6 rounded-3xl flex items-center gap-4 hover:border-amber-500/50 transition-all group shadow-sm"
          >
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20 group-hover:bg-amber-500 group-hover:text-white transition-all">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div className="text-left">
              <h4 className="font-bold text-zinc-900">Admin Panel</h4>
              <p className="text-xs text-zinc-500">Manage system settings</p>
            </div>
          </button>
        )}
      </div>

      {/* Recent Activity */}
      <div className="bg-white/80 backdrop-blur-sm border border-zinc-200 rounded-3xl overflow-hidden shadow-sm">
        <div className="p-6 border-b border-zinc-200 flex items-center justify-between">
          <h3 className="font-semibold text-lg text-zinc-900">Recent Maintenance Activity</h3>
          <button className="text-sm text-emerald-600 hover:text-emerald-500 font-medium flex items-center gap-1">
            View all <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-zinc-50/50 text-zinc-500 text-[10px] uppercase tracking-widest font-mono">
                <th className="px-6 py-4 font-medium">Bus Number</th>
                <th className="px-6 py-4 font-medium">Depot</th>
                <th className="px-6 py-4 font-medium">Job Description</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filteredJobs.slice(0, 5).map((job) => (
                <tr key={job.id} className="hover:bg-zinc-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-zinc-100 flex items-center justify-center border border-zinc-200">
                        <BusIcon className="w-4 h-4 text-zinc-500" />
                      </div>
                      <span className="font-medium text-zinc-900">{job.busNumber}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-zinc-600">{job.depot}</td>
                  <td className="px-6 py-4 text-sm text-zinc-600 max-w-xs truncate">{job.jobDescription}</td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border",
                      job.status === 'Completed' ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" :
                      job.status === 'In Progress' ? "bg-blue-500/10 text-blue-600 border-blue-500/20" :
                      "bg-amber-500/10 text-amber-600 border-amber-500/20"
                    )}>
                      {job.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-zinc-500 font-mono">
                    {new Date(job.date).toLocaleDateString()}
                  </td>
                </tr>
              ))}
              {filteredJobs.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-zinc-500 italic">
                    No maintenance records found for this view.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: 'zinc' | 'amber' | 'blue' | 'emerald' | 'purple' | 'red';
}

function StatCard({ label, value, icon, color }: StatCardProps) {
  const colorClasses = {
    zinc: "border-zinc-200 bg-white/80",
    amber: "border-amber-500/20 bg-amber-500/5",
    blue: "border-blue-500/20 bg-blue-500/5",
    emerald: "border-emerald-500/20 bg-emerald-500/5",
    purple: "border-purple-500/20 bg-purple-500/5",
    red: "border-red-500/20 bg-red-500/5",
  };

  return (
    <div className={cn("p-6 rounded-3xl border backdrop-blur-sm transition-all duration-300 hover:scale-[1.02]", colorClasses[color])}>
      <div className="flex items-center justify-between mb-4">
        <div className={cn(
          "w-10 h-10 rounded-xl flex items-center justify-center border",
          color === 'zinc' ? "bg-zinc-100 border-zinc-200" : 
          color === 'amber' ? "bg-amber-500/10 border-amber-500/20" :
          color === 'blue' ? "bg-blue-500/10 border-blue-500/20" :
          color === 'purple' ? "bg-purple-500/10 border-purple-500/20" :
          color === 'red' ? "bg-red-500/10 border-red-500/20" :
          "bg-emerald-500/10 border-emerald-500/20"
        )}>
          {icon}
        </div>
      </div>
      <p className="text-3xl font-bold text-zinc-900">{value}</p>
      <p className="text-xs font-mono uppercase tracking-widest text-zinc-500 mt-1">{label}</p>
    </div>
  );
}
