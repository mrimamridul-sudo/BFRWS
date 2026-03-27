/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserPlus, 
  Trash2, 
  Shield, 
  Bus as BusIcon,
  Download,
  Plus,
  X,
  Check,
  Edit2
} from 'lucide-react';
import { collection, onSnapshot, query, orderBy, addDoc, updateDoc, deleteDoc, doc, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { handleFirestoreError, OperationType } from '../lib/firestore';
import { User, Depot, MaintenanceJob } from '../types';
import { DEPOTS } from '../constants';
import * as XLSX from 'xlsx';

export default function AdminPanel() {
  const [users, setUsers] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any | null>(null);
  
  // New/Edit User Form
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [depot, setDepot] = useState<Depot>('JPG-JNN');

  useEffect(() => {
    const usersQuery = query(collection(db, 'users'), orderBy('username', 'asc'));
    const unsubscribe = onSnapshot(usersQuery, (snapshot) => {
      const usersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setUsers(usersData);
    }, (error) => handleFirestoreError(error, OperationType.GET, 'users'));

    return () => unsubscribe();
  }, []);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const userData = {
      username,
      password,
      fullName,
      email,
      phone,
      depot,
      role: 'user',
      updatedAt: new Date().toISOString()
    };

    try {
      if (editingUser) {
        await updateDoc(doc(db, 'users', editingUser.id), userData);
      } else {
        await addDoc(collection(db, 'users'), {
          ...userData,
          joinedDate: new Date().toISOString(),
          createdAt: new Date().toISOString()
        });
      }
      setIsModalOpen(false);
      setEditingUser(null);
      resetForm();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'users');
    }
  };

  const resetForm = () => {
    setUsername('');
    setPassword('');
    setFullName('');
    setEmail('');
    setPhone('');
    setDepot('JPG-JNN');
  };

  const handleEditUser = (user: any) => {
    setEditingUser(user);
    setUsername(user.username);
    setPassword(user.password);
    setFullName(user.fullName || '');
    setEmail(user.email || '');
    setPhone(user.phone || '');
    setDepot(user.depot || 'JPG-JNN');
    setIsModalOpen(true);
  };

  const handleDeleteUser = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'users', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `users/${id}`);
    }
  };

  const exportFullDatabase = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'maintenance_jobs'));
      const allJobs = snapshot.docs.map(doc => doc.data() as MaintenanceJob);
      
      const worksheet = XLSX.utils.json_to_sheet(allJobs.map((job: MaintenanceJob) => ({
        'Bus Number': job.busNumber,
        'Depot': job.depot,
        'Job Description': job.jobDescription,
        'Technician': job.technician,
        'Date': new Date(job.date).toLocaleDateString(),
        'Status': job.status,
        'Created At': job.createdAt
      })));
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Full Fleet Data");
      XLSX.writeFile(workbook, `Full_Fleet_Maintenance_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, 'maintenance_jobs');
    }
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-zinc-100">Admin Control Center</h2>
          <p className="text-zinc-500 mt-1">Manage users, depots, and export global fleet data.</p>
        </div>

        <button 
          onClick={exportFullDatabase}
          className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-xl font-semibold flex items-center gap-2 transition-all shadow-lg shadow-emerald-900/20"
        >
          <Download className="w-5 h-5" />
          Export Global Database
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* User Management */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden">
            <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Users className="w-5 h-5 text-emerald-500" />
                <h3 className="font-semibold text-lg">User Management</h3>
              </div>
              <button 
                onClick={() => setIsModalOpen(true)}
                disabled={users.length >= 10}
                className="text-sm bg-zinc-800 hover:bg-zinc-700 text-zinc-100 px-4 py-2 rounded-lg border border-zinc-700 flex items-center gap-2 disabled:opacity-50"
              >
                <UserPlus className="w-4 h-4" />
                Add User ({users.length}/10)
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-zinc-950/50 text-zinc-500 text-[10px] uppercase tracking-widest font-mono">
                    <th className="px-6 py-4 font-medium">Username</th>
                    <th className="px-6 py-4 font-medium">Assigned Depot</th>
                    <th className="px-6 py-4 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-zinc-800/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center border border-zinc-700">
                            <Shield className="w-4 h-4 text-zinc-500" />
                          </div>
                          <span className="font-medium text-zinc-200">{user.username}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-zinc-400">{user.depot}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => handleEditUser(user)}
                            className="p-2 text-zinc-500 hover:text-emerald-500 transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleDeleteUser(user.id)}
                            className="p-2 text-zinc-500 hover:text-red-500 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-6 py-12 text-center text-zinc-500 italic">
                        No users added yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* System Summary */}
        <div className="space-y-6">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6">
            <h3 className="font-semibold text-lg mb-6">System Summary</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-zinc-950 rounded-2xl border border-zinc-800">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                    <BusIcon className="w-4 h-4 text-emerald-500" />
                  </div>
                  <span className="text-sm text-zinc-400">Total Depots</span>
                </div>
                <span className="font-bold text-zinc-100">5</span>
              </div>
              <div className="flex items-center justify-between p-4 bg-zinc-950 rounded-2xl border border-zinc-800">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                    <Users className="w-4 h-4 text-blue-500" />
                  </div>
                  <span className="text-sm text-zinc-400">Active Users</span>
                </div>
                <span className="font-bold text-zinc-100">{users.length}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add/Edit User Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 w-full max-w-md rounded-3xl shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
              <h3 className="text-xl font-bold">{editingUser ? 'Edit User Details' : 'Add New User'}</h3>
              <button 
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingUser(null);
                  resetForm();
                }} 
                className="text-zinc-500 hover:text-zinc-300"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleAddUser} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-mono uppercase tracking-widest text-zinc-500 mb-2">Username</label>
                <input 
                  type="text" 
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 text-zinc-200 focus:outline-none focus:border-emerald-500/50"
                  placeholder="Enter username"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-widest text-zinc-500 mb-2">Password</label>
                <input 
                  type="password" 
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 text-zinc-200 focus:outline-none focus:border-emerald-500/50"
                  placeholder="••••••••"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-widest text-zinc-500 mb-2">Full Name</label>
                <input 
                  type="text" 
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 text-zinc-200 focus:outline-none focus:border-emerald-500/50"
                  placeholder="e.g. John Doe"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-widest text-zinc-500 mb-2">Email Address (Required for Authorization)</label>
                <input 
                  type="email" 
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 text-zinc-200 focus:outline-none focus:border-emerald-500/50"
                  placeholder="john@example.com"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-widest text-zinc-500 mb-2">Phone Number</label>
                <input 
                  type="tel" 
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 text-zinc-200 focus:outline-none focus:border-emerald-500/50"
                  placeholder="+1 (555) 000-0000"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-widest text-zinc-500 mb-2">Assigned Depot</label>
                <select 
                  value={depot}
                  onChange={(e) => setDepot(e.target.value as Depot)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 text-zinc-200 focus:outline-none focus:border-emerald-500/50"
                >
                  {DEPOTS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>

              <div className="pt-4">
                <button 
                  type="submit"
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-4 rounded-xl transition-all shadow-lg shadow-emerald-900/20"
                >
                  {editingUser ? 'Update User Details' : 'Create User Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
