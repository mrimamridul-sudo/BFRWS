/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserPlus, 
  Search, 
  Trash2, 
  X, 
  Briefcase,
  MapPin,
  IdCard,
  Download
} from 'lucide-react';
import { collection, onSnapshot, query, orderBy, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { handleFirestoreError, OperationType } from '../lib/firestore';
import { User, Staff, Designation, Depot } from '../types';
import { DEPOTS, DESIGNATIONS } from '../constants';
import * as XLSX from 'xlsx';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ManpowerProps {
  user: User;
}

export default function Manpower({ user }: ManpowerProps) {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDepot, setSelectedDepot] = useState<Depot | 'All'>(user.role === 'admin' ? 'All' : user.depot!);
  const [selectedDesignation, setSelectedDesignation] = useState<Designation | 'All'>('All');

  // Form State
  const [name, setName] = useState('');
  const [designation, setDesignation] = useState<Designation>('Technician');
  const [depot, setDepot] = useState<Depot>(user.depot || 'JPG-JNN');
  const [employeeId, setEmployeeId] = useState('');

  useEffect(() => {
    const staffQuery = query(collection(db, 'staff'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(staffQuery, (snapshot) => {
      const staffData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Staff));
      setStaff(staffData);
    }, (error) => handleFirestoreError(error, OperationType.GET, 'staff'));

    return () => unsubscribe();
  }, []);

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    const newStaffData = {
      name,
      designation,
      depot,
      employeeId,
      createdAt: new Date().toISOString(),
    };

    try {
      await addDoc(collection(db, 'staff'), newStaffData);
      setIsModalOpen(false);
      resetForm();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'staff');
    }
  };

  const exportToExcel = () => {
    const dataToExport = filteredStaff.map(s => ({
      'Name': s.name,
      'Employee ID': s.employeeId || 'N/A',
      'Designation': s.designation,
      'Depot': s.depot,
      'Added On': new Date(s.createdAt).toLocaleDateString()
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Manpower');
    XLSX.writeFile(workbook, `Manpower_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleDeleteStaff = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'staff', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `staff/${id}`);
    }
  };

  const resetForm = () => {
    setName('');
    setDesignation('Technician');
    setDepot(user.depot || 'JPG-JNN');
    setEmployeeId('');
  };

  const filteredStaff = staff.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (s.employeeId?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
    const matchesDepot = selectedDepot === 'All' ? true : s.depot === selectedDepot;
    const matchesDesignation = selectedDesignation === 'All' ? true : s.designation === selectedDesignation;
    return matchesSearch && matchesDepot && matchesDesignation;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-zinc-100">Manpower Management</h2>
          <p className="text-zinc-500 mt-1">Manage technical staff and personnel across all depots.</p>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={exportToExcel}
            className="bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 px-6 py-3 rounded-xl font-semibold flex items-center gap-2 transition-all"
          >
            <Download className="w-5 h-5" />
            Export Excel
          </button>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-xl font-semibold flex items-center gap-2 transition-all shadow-lg shadow-emerald-900/20"
          >
            <UserPlus className="w-5 h-5" />
            Add Staff Member
          </button>
        </div>
      </header>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
          <input 
            type="text" 
            placeholder="Search by name or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl py-3 pl-12 pr-4 text-zinc-200 focus:outline-none focus:border-emerald-500/50 transition-colors"
          />
        </div>

        <select 
          value={selectedDesignation}
          onChange={(e) => setSelectedDesignation(e.target.value as any)}
          className="bg-zinc-900 border border-zinc-800 rounded-2xl py-3 px-4 text-zinc-200 focus:outline-none focus:border-emerald-500/50"
        >
          <option value="All">All Designations</option>
          {DESIGNATIONS.map(d => <option key={d} value={d}>{d}</option>)}
        </select>

        {user.role === 'admin' && (
          <select 
            value={selectedDepot}
            onChange={(e) => setSelectedDepot(e.target.value as any)}
            className="bg-zinc-900 border border-zinc-800 rounded-2xl py-3 px-4 text-zinc-200 focus:outline-none focus:border-emerald-500/50"
          >
            <option value="All">All Depots</option>
            {DEPOTS.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        )}
      </div>

      {/* Staff Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredStaff.map((s) => (
          <div key={s.id} className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 hover:border-zinc-700 transition-all group relative">
            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
              <button 
                onClick={() => handleDeleteStaff(s.id)}
                className="p-2 text-zinc-500 hover:text-red-500 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 rounded-2xl bg-zinc-800 flex items-center justify-center border border-zinc-700 group-hover:border-emerald-500/30 group-hover:bg-emerald-500/5 transition-all">
                <Users className="w-8 h-8 text-zinc-400 group-hover:text-emerald-500" />
              </div>
              <div>
                <h4 className="font-bold text-xl text-zinc-100">{s.name}</h4>
                <p className="text-xs font-mono uppercase tracking-widest text-emerald-500">{s.designation}</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm text-zinc-400">
                <IdCard className="w-4 h-4 text-zinc-600" />
                <span>ID: <span className="text-zinc-200 font-mono">{s.employeeId || 'N/A'}</span></span>
              </div>
              <div className="flex items-center gap-3 text-sm text-zinc-400">
                <MapPin className="w-4 h-4 text-zinc-600" />
                <span>Depot: <span className="text-zinc-200">{s.depot}</span></span>
              </div>
              <div className="flex items-center gap-3 text-sm text-zinc-400">
                <Briefcase className="w-4 h-4 text-zinc-600" />
                <span>Role: <span className="text-zinc-200">{s.designation}</span></span>
              </div>
            </div>
          </div>
        ))}
        {filteredStaff.length === 0 && (
          <div className="col-span-full py-20 text-center bg-zinc-900/50 border border-dashed border-zinc-800 rounded-3xl">
            <Users className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
            <p className="text-zinc-500">No staff members found.</p>
          </div>
        )}
      </div>

      {/* Add Staff Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 w-full max-w-md rounded-3xl shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
              <h3 className="text-xl font-bold">Add Staff Member</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-zinc-500 hover:text-zinc-300">
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleAddStaff} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-mono uppercase tracking-widest text-zinc-500 mb-2">Full Name</label>
                <input 
                  type="text" 
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 text-zinc-200 focus:outline-none focus:border-emerald-500/50"
                  placeholder="Enter full name"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-widest text-zinc-500 mb-2">Employee ID</label>
                <input 
                  type="text" 
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 text-zinc-200 focus:outline-none focus:border-emerald-500/50"
                  placeholder="e.g. EMP-001"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono uppercase tracking-widest text-zinc-500 mb-2">Designation</label>
                  <select 
                    value={designation}
                    onChange={(e) => setDesignation(e.target.value as Designation)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 text-zinc-200 focus:outline-none focus:border-emerald-500/50"
                  >
                    {DESIGNATIONS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-mono uppercase tracking-widest text-zinc-500 mb-2">Depot</label>
                  <select 
                    value={depot}
                    onChange={(e) => setDepot(e.target.value as Depot)}
                    disabled={user.role !== 'admin'}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 text-zinc-200 focus:outline-none focus:border-emerald-500/50 disabled:opacity-50"
                  >
                    {DEPOTS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
              </div>

              <div className="pt-4">
                <button 
                  type="submit"
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-4 rounded-xl transition-all shadow-lg shadow-emerald-900/20"
                >
                  Register Staff Member
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
