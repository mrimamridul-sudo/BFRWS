/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  AlertOctagon, 
  Plus, 
  Search, 
  Trash2, 
  X, 
  Download,
  Calendar,
  MapPin,
  Route,
  Activity,
  ArrowRightLeft
} from 'lucide-react';
import { collection, onSnapshot, query, orderBy, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { handleFirestoreError, OperationType } from '../lib/firestore';
import { User, Breakdown, Depot } from '../types';
import { DEPOTS } from '../constants';
import * as XLSX from 'xlsx';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface BreakdownsProps {
  user: User;
}

export default function Breakdowns({ user }: BreakdownsProps) {
  const [breakdowns, setBreakdowns] = useState<Breakdown[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDepot, setSelectedDepot] = useState<Depot | 'All'>(user.role === 'admin' ? 'All' : user.depot!);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().substring(0, 7)); // YYYY-MM

  // Form State
  const [busNumber, setBusNumber] = useState('');
  const [depot, setDepot] = useState<Depot>(user.depot || 'JPG-JNN');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [location, setLocation] = useState('');
  const [routeNo, setRouteNo] = useState('');
  const [causes, setCauses] = useState('');
  const [lossKm, setLossKm] = useState<number>(0);

  useEffect(() => {
    const breakdownQuery = query(collection(db, 'breakdowns'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(breakdownQuery, (snapshot) => {
      const breakdownData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Breakdown));
      setBreakdowns(breakdownData);
    }, (error) => handleFirestoreError(error, OperationType.GET, 'breakdowns'));

    return () => unsubscribe();
  }, []);

  const handleAddBreakdown = async (e: React.FormEvent) => {
    e.preventDefault();
    const newBreakdownData = {
      busNumber,
      depot,
      date,
      location,
      routeNo,
      causes,
      lossKm,
      createdAt: new Date().toISOString(),
    };

    try {
      await addDoc(collection(db, 'breakdowns'), newBreakdownData);
      setIsModalOpen(false);
      resetForm();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'breakdowns');
    }
  };

  const handleDeleteBreakdown = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'breakdowns', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `breakdowns/${id}`);
    }
  };

  const resetForm = () => {
    setBusNumber('');
    setDepot(user.depot || 'JPG-JNN');
    setDate(new Date().toISOString().split('T')[0]);
    setLocation('');
    setRouteNo('');
    setCauses('');
    setLossKm(0);
  };

  const exportToExcel = (mode: 'current' | 'all_depots_monthly') => {
    let dataToExport: Breakdown[] = [];
    let fileName = '';

    if (mode === 'current') {
      dataToExport = filteredBreakdowns;
      fileName = `Breakdowns_${selectedDepot}_${selectedMonth}.xlsx`;
    } else {
      // All depots for the selected month
      dataToExport = breakdowns.filter(b => b.date.startsWith(selectedMonth));
      fileName = `All_Depots_Breakdowns_${selectedMonth}.xlsx`;
    }

    if (dataToExport.length === 0) {
      alert('No data to export for the selected criteria.');
      return;
    }

    const excelData = dataToExport.map(b => ({
      'Bus Number': b.busNumber,
      'Date': b.date,
      'Depot': b.depot,
      'Location': b.location,
      'Route No': b.routeNo,
      'Causes': b.causes,
      'Loss KM': b.lossKm,
      'Logged At': new Date(b.createdAt).toLocaleString()
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Breakdowns');
    XLSX.writeFile(workbook, fileName);
  };

  const filteredBreakdowns = breakdowns.filter(b => {
    const matchesSearch = b.busNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         b.causes.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDepot = selectedDepot === 'All' ? true : b.depot === selectedDepot;
    const matchesMonth = b.date.startsWith(selectedMonth);
    return matchesSearch && matchesDepot && matchesMonth;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-zinc-100">Breakdown Logs</h2>
          <p className="text-zinc-500 mt-1">Track and analyze bus breakdowns across depots.</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex bg-zinc-900 border border-zinc-800 p-1 rounded-xl">
             <button 
              onClick={() => exportToExcel('current')}
              className="px-4 py-2 text-xs font-semibold text-zinc-300 hover:text-white flex items-center gap-2 transition-all"
              title="Export filtered view"
            >
              <Download className="w-4 h-4" />
              Export Filtered
            </button>
            {user.role === 'admin' && (
              <button 
                onClick={() => exportToExcel('all_depots_monthly')}
                className="px-4 py-2 text-xs font-semibold text-emerald-500 hover:text-emerald-400 border-l border-zinc-800 flex items-center gap-2 transition-all"
                title="Export all depots for selected month"
              >
                <Download className="w-4 h-4" />
                All Depots Monthly
              </button>
            )}
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-red-600 hover:bg-red-500 text-white px-6 py-3 rounded-xl font-semibold flex items-center gap-2 transition-all shadow-lg shadow-red-900/20"
          >
            <Plus className="w-5 h-5" />
            Log Breakdown
          </button>
        </div>
      </header>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="relative md:col-span-2">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
          <input 
            type="text" 
            placeholder="Search by bus number or cause..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl py-3 pl-12 pr-4 text-zinc-200 focus:outline-none focus:border-red-500/50 transition-colors"
          />
        </div>

        <input 
          type="month" 
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="bg-zinc-900 border border-zinc-800 rounded-2xl py-3 px-4 text-zinc-200 focus:outline-none focus:border-red-500/50"
        />

        {user.role === 'admin' && (
          <select 
            value={selectedDepot}
            onChange={(e) => setSelectedDepot(e.target.value as any)}
            className="bg-zinc-900 border border-zinc-800 rounded-2xl py-3 px-4 text-zinc-200 focus:outline-none focus:border-red-500/50"
          >
            <option value="All">All Depots</option>
            {DEPOTS.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        )}
      </div>

      {/* Breakdown List */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredBreakdowns.map((b) => (
          <div key={b.id} className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 hover:border-red-500/30 transition-all group relative overflow-hidden">
            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
              <button 
                onClick={() => handleDeleteBreakdown(b.id)}
                className="p-2 text-zinc-500 hover:text-red-500 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 rounded-2xl bg-red-500/10 flex items-center justify-center border border-red-500/20 group-hover:bg-red-500 group-hover:text-white transition-all">
                <AlertOctagon className="w-8 h-8" />
              </div>
              <div>
                <h4 className="font-bold text-xl text-zinc-100">{b.busNumber}</h4>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-red-500 bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20">
                    {b.depot}
                  </span>
                  <span className="text-[10px] font-mono text-zinc-500">{b.date}</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-600 flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> Location
                  </p>
                  <p className="text-sm text-zinc-300 truncate">{b.location}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-600 flex items-center gap-1">
                    <Route className="w-3 h-3" /> Route
                  </p>
                  <p className="text-sm text-zinc-300">{b.routeNo}</p>
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-600 flex items-center gap-1">
                  <Activity className="w-3 h-3" /> Cause
                </p>
                <p className="text-sm text-zinc-300 line-clamp-2">{b.causes}</p>
              </div>

              <div className="pt-4 border-t border-zinc-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ArrowRightLeft className="w-4 h-4 text-zinc-600" />
                  <span className="text-sm font-bold text-zinc-200">{b.lossKm} <span className="text-[10px] text-zinc-500 font-normal">KM LOSS</span></span>
                </div>
                <span className="text-[10px] text-zinc-600 font-mono">{new Date(b.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            </div>
          </div>
        ))}
        {filteredBreakdowns.length === 0 && (
          <div className="col-span-full py-20 text-center bg-zinc-900/50 border border-dashed border-zinc-800 rounded-3xl">
            <AlertOctagon className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
            <p className="text-zinc-500">No breakdown records found for this period.</p>
          </div>
        )}
      </div>

      {/* Log Breakdown Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 w-full max-w-2xl rounded-3xl shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
              <h3 className="text-xl font-bold">Log Bus Breakdown</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-zinc-500 hover:text-zinc-300">
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleAddBreakdown} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-mono uppercase tracking-widest text-zinc-500 mb-2">Bus Number</label>
                    <input 
                      type="text" 
                      required
                      value={busNumber}
                      onChange={(e) => setBusNumber(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 text-zinc-200 focus:outline-none focus:border-red-500/50"
                      placeholder="e.g. WB-51-1234"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-mono uppercase tracking-widest text-zinc-500 mb-2">Depot</label>
                    <select 
                      value={depot}
                      onChange={(e) => setDepot(e.target.value as Depot)}
                      disabled={user.role !== 'admin'}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 text-zinc-200 focus:outline-none focus:border-red-500/50 disabled:opacity-50"
                    >
                      {DEPOTS.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-mono uppercase tracking-widest text-zinc-500 mb-2">Date</label>
                    <input 
                      type="date" 
                      required
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 text-zinc-200 focus:outline-none focus:border-red-500/50"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-mono uppercase tracking-widest text-zinc-500 mb-2">Location</label>
                    <input 
                      type="text" 
                      required
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 text-zinc-200 focus:outline-none focus:border-red-500/50"
                      placeholder="e.g. Near Siliguri Junction"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-mono uppercase tracking-widest text-zinc-500 mb-2">Route No.</label>
                      <input 
                        type="text" 
                        required
                        value={routeNo}
                        onChange={(e) => setRouteNo(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 text-zinc-200 focus:outline-none focus:border-red-500/50"
                        placeholder="e.g. R-12"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-mono uppercase tracking-widest text-zinc-500 mb-2">Loss KM</label>
                      <input 
                        type="number" 
                        required
                        value={lossKm}
                        onChange={(e) => setLossKm(Number(e.target.value))}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 text-zinc-200 focus:outline-none focus:border-red-500/50"
                        placeholder="0"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-mono uppercase tracking-widest text-zinc-500 mb-2">Causes</label>
                    <textarea 
                      required
                      value={causes}
                      onChange={(e) => setCauses(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 text-zinc-200 focus:outline-none focus:border-red-500/50 h-24 resize-none"
                      placeholder="Describe the cause of breakdown..."
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <button 
                  type="submit"
                  className="w-full bg-red-600 hover:bg-red-500 text-white font-semibold py-4 rounded-xl transition-all shadow-lg shadow-red-900/20"
                >
                  Log Breakdown
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
