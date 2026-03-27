/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Shield, 
  MapPin, 
  Mail, 
  Phone, 
  Search,
  ChevronRight
} from 'lucide-react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { handleFirestoreError, OperationType } from '../lib/firestore';
import { User, Depot } from '../types';
import { DEPOTS } from '../constants';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function UserDirectory() {
  const [users, setUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDepot, setSelectedDepot] = useState<Depot | 'All'>('All');

  useEffect(() => {
    const usersQuery = query(collection(db, 'users'), orderBy('username', 'asc'));
    const unsubscribe = onSnapshot(usersQuery, (snapshot) => {
      const usersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
      setUsers(usersData);
    }, (error) => handleFirestoreError(error, OperationType.GET, 'users'));

    return () => unsubscribe();
  }, []);

  const filteredUsers = users.filter(u => {
    const matchesSearch = 
      u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
      (u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
    
    const matchesDepot = selectedDepot === 'All' ? true : u.depot === selectedDepot;
    
    return matchesSearch && matchesDepot;
  });

  // Group users by depot
  const groupedUsers = DEPOTS.reduce((acc, depot) => {
    const depotUsers = filteredUsers.filter(u => u.depot === depot);
    if (depotUsers.length > 0) {
      acc[depot] = depotUsers;
    }
    return acc;
  }, {} as Record<string, User[]>);

  // Also handle users with no depot (like system admin)
  const globalUsers = filteredUsers.filter(u => !u.depot);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header>
        <h2 className="text-3xl font-bold tracking-tight text-zinc-100">User & Admin Directory</h2>
        <p className="text-zinc-500 mt-1">Contact information and roles for all depot personnel.</p>
      </header>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
          <input 
            type="text" 
            placeholder="Search by name, username or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl py-3 pl-12 pr-4 text-zinc-200 focus:outline-none focus:border-emerald-500/50 transition-colors"
          />
        </div>

        <select 
          value={selectedDepot}
          onChange={(e) => setSelectedDepot(e.target.value as any)}
          className="bg-zinc-900 border border-zinc-800 rounded-2xl py-3 px-4 text-zinc-200 focus:outline-none focus:border-emerald-500/50"
        >
          <option value="All">All Depots</option>
          {DEPOTS.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>

      <div className="space-y-12">
        {/* Global Admins */}
        {globalUsers.length > 0 && (selectedDepot === 'All') && (
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-zinc-500">
              <Shield className="w-4 h-4" />
              <h3 className="text-xs font-mono uppercase tracking-widest">Global Administration</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {globalUsers.map(u => (
                <div key={u.id}>
                  <UserCard user={u} />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Depot-wise Users */}
        {Object.entries(groupedUsers).map(([depot, depotUsers]) => (
          <section key={depot} className="space-y-4">
            <div className="flex items-center gap-2 text-zinc-500">
              <MapPin className="w-4 h-4" />
              <h3 className="text-xs font-mono uppercase tracking-widest">{depot} Depot Personnel</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {depotUsers.map(u => (
                <div key={u.id}>
                  <UserCard user={u} />
                </div>
              ))}
            </div>
          </section>
        ))}

        {filteredUsers.length === 0 && (
          <div className="py-20 text-center bg-zinc-900/50 border border-dashed border-zinc-800 rounded-3xl">
            <Users className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
            <p className="text-zinc-500">No users found matching your search.</p>
          </div>
        )}
      </div>
    </div>
  );
}

interface UserCardProps {
  user: User;
}

const UserCard: React.FC<UserCardProps> = ({ user }) => {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 hover:border-zinc-700 transition-all group">
      <div className="flex items-center gap-4 mb-6">
        <div className={cn(
          "w-14 h-14 rounded-2xl flex items-center justify-center border transition-all",
          user.role === 'admin' 
            ? "bg-amber-500/5 border-amber-500/20 text-amber-500" 
            : "bg-emerald-500/5 border-emerald-500/20 text-emerald-500"
        )}>
          {user.role === 'admin' ? <Shield className="w-8 h-8" /> : <Users className="w-8 h-8" />}
        </div>
        <div>
          <h4 className="font-bold text-xl text-zinc-100">{user.fullName || user.username}</h4>
          <p className="text-xs font-mono uppercase tracking-widest text-zinc-500">
            {user.role} {user.depot ? `• ${user.depot}` : '• Global'}
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-3 text-sm text-zinc-400">
          <Mail className="w-4 h-4 text-zinc-600" />
          <span className="truncate">{user.email || 'No email provided'}</span>
        </div>
        <div className="flex items-center gap-3 text-sm text-zinc-400">
          <Phone className="w-4 h-4 text-zinc-600" />
          <span>{user.phone || 'No phone provided'}</span>
        </div>
      </div>

      <div className="mt-6 pt-6 border-t border-zinc-800 flex items-center justify-between">
        <span className="text-[10px] font-mono text-zinc-600 uppercase tracking-tighter">
          Username: {user.username}
        </span>
        <ChevronRight className="w-4 h-4 text-zinc-700 group-hover:text-zinc-500 transition-colors" />
      </div>
    </div>
  );
}
