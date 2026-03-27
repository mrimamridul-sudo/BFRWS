/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Bus as BusIcon,
  X,
  Trash2,
  Settings2,
  Calendar,
  Hash,
  Info,
  Download
} from 'lucide-react';
import { collection, onSnapshot, query, orderBy, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { handleFirestoreError, OperationType } from '../lib/firestore';
import { User, Bus, Depot } from '../types';
import { DEPOTS } from '../constants';
import * as XLSX from 'xlsx';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface FleetProps {
  user: User;
}

export default function Fleet({ user }: FleetProps) {
  const [buses, setBuses] = useState<Bus[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDepot, setSelectedDepot] = useState<Depot | 'All'>(user.role === 'admin' ? 'All' : user.depot!);

  // Form State
  const [busNumber, setBusNumber] = useState('');
  const [depot, setDepot] = useState<Depot>(user.depot || 'JPG-JNN');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [engineNumber, setEngineNumber] = useState('');
  const [chassisNumber, setChassisNumber] = useState('');

  useEffect(() => {
    const fleetQuery = query(collection(db, 'buses'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(fleetQuery, (snapshot) => {
      const fleetData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Bus));
      setBuses(fleetData);
    }, (error) => handleFirestoreError(error, OperationType.GET, 'buses'));

    return () => unsubscribe();
  }, []);

  const handleAddBus = async (e: React.FormEvent) => {
    e.preventDefault();
    const newBusData = {
      busNumber,
      depot,
      model,
      year,
      engineNumber,
      chassisNumber,
      createdAt: new Date().toISOString(),
    };

    try {
      await addDoc(collection(db, 'buses'), newBusData);
      setIsModalOpen(false);
      resetForm();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'buses');
    }
  };

  const exportToExcel = () => {
    const dataToExport = filteredBuses.map(bus => ({
      'Bus Number': bus.busNumber,
      'Depot': bus.depot,
      'Model': bus.model || 'N/A',
      'Year': bus.year || 'N/A',
      'Engine Number': bus.engineNumber || 'N/A',
      'Chassis Number': bus.chassisNumber || 'N/A',
      'Added On': new Date(bus.createdAt).toLocaleDateString()
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Fleet');
    XLSX.writeFile(workbook, `Fleet_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleDeleteBus = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'buses', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `buses/${id}`);
    }
  };

  const resetForm = () => {
    setBusNumber('');
    setDepot(user.depot || 'JPG-JNN');
    setModel('');
    setYear('');
    setEngineNumber('');
    setChassisNumber('');
  };

  const filteredBuses = buses.filter(bus => {
    const matchesSearch = bus.busNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (bus.model?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
    const matchesDepot = selectedDepot === 'All' ? true : bus.depot === selectedDepot;
    return matchesSearch && matchesDepot;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-zinc-100">Fleet Management</h2>
          <p className="text-zinc-500 mt-1">Register and manage all buses in the fleet across depots.</p>
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
            <Plus className="w-5 h-5" />
            Add New Bus
          </button>
        </div>
      </header>

      {/* Filters & Search */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
          <input 
            type="text" 
            placeholder="Search by bus number or model..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl py-3 pl-12 pr-4 text-zinc-200 focus:outline-none focus:border-emerald-500/50 transition-colors"
          />
        </div>

        {user.role === 'admin' && (
          <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 p-1 rounded-2xl">
            <button 
              onClick={() => setSelectedDepot('All')}
              className={cn(
                "px-4 py-2 rounded-xl text-sm font-medium transition-all",
                selectedDepot === 'All' ? "bg-zinc-800 text-zinc-100" : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              All
            </button>
            {DEPOTS.map(d => (
              <button 
                key={d}
                onClick={() => setSelectedDepot(d)}
                className={cn(
                  "px-4 py-2 rounded-xl text-sm font-medium transition-all",
                  selectedDepot === d ? "bg-zinc-800 text-zinc-100" : "text-zinc-500 hover:text-zinc-300"
                )}
              >
                {d}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Bus Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredBuses.map((bus) => (
          <div key={bus.id} className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 hover:border-zinc-700 transition-all group relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
              <button 
                onClick={() => handleDeleteBus(bus.id)}
                className="p-2 text-zinc-500 hover:text-red-500 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 rounded-2xl bg-zinc-800 flex items-center justify-center border border-zinc-700 group-hover:border-emerald-500/30 group-hover:bg-emerald-500/5 transition-all">
                <BusIcon className="w-8 h-8 text-zinc-400 group-hover:text-emerald-500" />
              </div>
              <div>
                <h4 className="font-bold text-xl text-zinc-100">{bus.busNumber}</h4>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    {bus.depot}
                  </span>
                  {bus.year && <span className="text-[10px] font-mono text-zinc-500">{bus.year}</span>}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-y-4 gap-x-2">
              <div className="space-y-1">
                <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-600">Model</p>
                <div className="flex items-center gap-2 text-sm text-zinc-300">
                  <Settings2 className="w-3.5 h-3.5 text-zinc-700" />
                  {bus.model || 'N/A'}
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-600">Engine No.</p>
                <div className="flex items-center gap-2 text-sm text-zinc-300">
                  <Hash className="w-3.5 h-3.5 text-zinc-700" />
                  {bus.engineNumber || 'N/A'}
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-600">Chassis No.</p>
                <div className="flex items-center gap-2 text-sm text-zinc-300">
                  <Hash className="w-3.5 h-3.5 text-zinc-700" />
                  {bus.chassisNumber || 'N/A'}
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-600">Added On</p>
                <div className="flex items-center gap-2 text-sm text-zinc-300">
                  <Calendar className="w-3.5 h-3.5 text-zinc-700" />
                  {new Date(bus.createdAt).toLocaleDateString()}
                </div>
              </div>
            </div>
          </div>
        ))}
        {filteredBuses.length === 0 && (
          <div className="col-span-full py-20 text-center bg-zinc-900/50 border border-dashed border-zinc-800 rounded-3xl">
            <BusIcon className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
            <p className="text-zinc-500">No buses found in the fleet.</p>
          </div>
        )}
      </div>

      {/* New Bus Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 w-full max-w-2xl rounded-3xl shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
              <h3 className="text-xl font-bold">Add New Bus to Fleet</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-zinc-500 hover:text-zinc-300">
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleAddBus} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-mono uppercase tracking-widest text-zinc-500 mb-2">Bus Number</label>
                    <input 
                      type="text" 
                      required
                      value={busNumber}
                      onChange={(e) => setBusNumber(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 text-zinc-200 focus:outline-none focus:border-emerald-500/50"
                      placeholder="e.g. BUS-102"
                    />
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
                  <div>
                    <label className="block text-xs font-mono uppercase tracking-widest text-zinc-500 mb-2">Model</label>
                    <input 
                      type="text" 
                      value={model}
                      onChange={(e) => setModel(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 text-zinc-200 focus:outline-none focus:border-emerald-500/50"
                      placeholder="e.g. Ashok Leyland Viking"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-mono uppercase tracking-widest text-zinc-500 mb-2">Year of Manufacture</label>
                    <input 
                      type="text" 
                      value={year}
                      onChange={(e) => setYear(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 text-zinc-200 focus:outline-none focus:border-emerald-500/50"
                      placeholder="e.g. 2022"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-mono uppercase tracking-widest text-zinc-500 mb-2">Engine Number</label>
                    <input 
                      type="text" 
                      value={engineNumber}
                      onChange={(e) => setEngineNumber(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 text-zinc-200 focus:outline-none focus:border-emerald-500/50"
                      placeholder="Enter engine number"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-mono uppercase tracking-widest text-zinc-500 mb-2">Chassis Number</label>
                    <input 
                      type="text" 
                      value={chassisNumber}
                      onChange={(e) => setChassisNumber(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 text-zinc-200 focus:outline-none focus:border-emerald-500/50"
                      placeholder="Enter chassis number"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <button 
                  type="submit"
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-4 rounded-xl transition-all shadow-lg shadow-emerald-900/20"
                >
                  Register Bus
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
