/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  User as UserIcon, 
  Mail, 
  Phone, 
  Calendar, 
  Shield, 
  MapPin,
  LogOut
} from 'lucide-react';
import { User } from '../types';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase';

interface ProfileProps {
  user: User;
}

export default function Profile({ user }: ProfileProps) {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await auth.signOut();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header>
        <h2 className="text-3xl font-bold tracking-tight text-zinc-100">My Profile</h2>
        <p className="text-zinc-500 mt-1">Manage your account details and preferences.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Profile Card */}
        <div className="md:col-span-1 space-y-6">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 text-center">
            <div className="w-24 h-24 bg-emerald-500/10 rounded-full flex items-center justify-center border-2 border-emerald-500/20 mx-auto mb-6">
              <UserIcon className="w-12 h-12 text-emerald-500" />
            </div>
            <h3 className="text-xl font-bold text-zinc-100">{user.fullName || user.username}</h3>
            <p className="text-sm text-zinc-500 font-mono uppercase tracking-widest mt-1">{user.role}</p>
            
            <div className="mt-8 pt-8 border-t border-zinc-800">
              <button 
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white border border-red-500/20 rounded-xl text-sm font-semibold transition-all"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          </div>
        </div>

        {/* Details Card */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden">
            <div className="p-6 border-b border-zinc-800">
              <h3 className="font-semibold text-lg">Account Information</h3>
            </div>
            <div className="p-8 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                <div className="space-y-1">
                  <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">Username</p>
                  <div className="flex items-center gap-2 text-zinc-200">
                    <Shield className="w-4 h-4 text-zinc-600" />
                    <span className="font-medium">{user.username}</span>
                  </div>
                </div>
                
                <div className="space-y-1">
                  <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">Assigned Depot</p>
                  <div className="flex items-center gap-2 text-zinc-200">
                    <MapPin className="w-4 h-4 text-zinc-600" />
                    <span className="font-medium">{user.depot || 'Global Access'}</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">Email Address</p>
                  <div className="flex items-center gap-2 text-zinc-200">
                    <Mail className="w-4 h-4 text-zinc-600" />
                    <span className="font-medium">{user.email || 'Not provided'}</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">Phone Number</p>
                  <div className="flex items-center gap-2 text-zinc-200">
                    <Phone className="w-4 h-4 text-zinc-600" />
                    <span className="font-medium">{user.phone || 'Not provided'}</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">Member Since</p>
                  <div className="flex items-center gap-2 text-zinc-200">
                    <Calendar className="w-4 h-4 text-zinc-600" />
                    <span className="font-medium">{user.joinedDate ? new Date(user.joinedDate).toLocaleDateString() : 'N/A'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-zinc-900/50 border border-zinc-800 border-dashed rounded-3xl p-8 text-center">
            <p className="text-sm text-zinc-500">
              To update your profile information or change your password, please contact your system administrator.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
