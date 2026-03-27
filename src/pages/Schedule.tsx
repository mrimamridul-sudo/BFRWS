/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  CalendarClock,
  Calendar,
  Bus as BusIcon,
  Tag,
  CheckCircle2,
  X,
  AlertCircle,
  ArrowRight,
  Gauge
} from 'lucide-react';
import { collection, onSnapshot, query, orderBy, addDoc, updateDoc, deleteDoc, doc, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { handleFirestoreError, OperationType } from '../lib/firestore';
import { User, ScheduledMaintenance, Depot, MaintenanceJob, Bus } from '../types';
import { DEPOTS } from '../constants';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ScheduleProps {
  user: User;
}

export default function Schedule({ user }: ScheduleProps) {
  const [schedules, setSchedules] = useState<ScheduledMaintenance[]>([]);
  const [fleet, setFleet] = useState<Bus[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Form State
  const [busNumber, setBusNumber] = useState('');
  const [maintenanceType, setMaintenanceType] = useState('');
  const [odometerReading, setOdometerReading] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [depot, setDepot] = useState<Depot>(user.depot || 'JPG-JNN');

  useEffect(() => {
    const schedulesQuery = query(collection(db, 'schedules'), orderBy('createdAt', 'desc'));
    const unsubscribeSchedules = onSnapshot(schedulesQuery, (snapshot) => {
      const schedulesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ScheduledMaintenance));
      setSchedules(schedulesData);
    }, (error) => handleFirestoreError(error, OperationType.GET, 'schedules'));

    const fleetQuery = query(collection(db, 'buses'), orderBy('busNumber', 'asc'));
    const unsubscribeFleet = onSnapshot(fleetQuery, (snapshot) => {
      const fleetData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Bus));
      setFleet(fleetData);
    }, (error) => handleFirestoreError(error, OperationType.GET, 'buses'));

    return () => {
      unsubscribeSchedules();
      unsubscribeFleet();
    };
  }, []);

  const handleAddSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    const newSchedule = {
      busNumber,
      depot,
      scheduledDate,
      maintenanceType,
      odometerReading,
      status: 'Scheduled',
      createdAt: new Date().toISOString(),
    };

    try {
      await addDoc(collection(db, 'schedules'), newSchedule);
      setIsModalOpen(false);
      resetForm();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'schedules');
    }
  };

  const resetForm = () => {
    setBusNumber('');
    setMaintenanceType('');
    setOdometerReading('');
    setScheduledDate('');
    setDepot(user.depot || 'JPG-JNN');
  };

  const convertToActiveJob = async (schedule: ScheduledMaintenance) => {
    const newJob = {
      busNumber: schedule.busNumber,
      depot: schedule.depot,
      date: new Date().toISOString(),
      jobDescription: `Scheduled Maintenance: ${schedule.maintenanceType}`,
      technician: 'Assigned from Schedule',
      odometerReading: schedule.odometerReading,
      status: 'Pending',
      createdAt: new Date().toISOString(),
    };

    try {
      // Add to Active Jobs
      await addDoc(collection(db, 'maintenance_jobs'), newJob);

      // Update Schedule Status
      await updateDoc(doc(db, 'schedules', schedule.id), {
        status: 'Completed'
      });

      alert(`Job sheet created for ${schedule.busNumber}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'maintenance_jobs/schedules');
    }
  };

  const filteredSchedules = schedules.filter(s => {
    const matchesSearch = s.busNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         s.maintenanceType.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDepot = user.role === 'admin' ? true : s.depot === user.depot;
    const isNotCompleted = s.status !== 'Completed';
    return matchesSearch && matchesDepot && isNotCompleted;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-zinc-100">Scheduled Maintenance</h2>
          <p className="text-zinc-500 mt-1">Plan and track upcoming fleet maintenance per depot.</p>
        </div>

        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-xl font-semibold flex items-center gap-2 transition-all shadow-lg shadow-emerald-900/20"
        >
          <Plus className="w-5 h-5" />
          Schedule Maintenance
        </button>
      </header>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
          <input 
            type="text" 
            placeholder="Search by bus number or type..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl py-3 pl-12 pr-4 text-zinc-200 focus:outline-none focus:border-emerald-500/50 transition-colors"
          />
        </div>
      </div>

      {/* Schedule List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredSchedules.map((schedule) => (
          <div key={schedule.id} className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 hover:border-zinc-700 transition-all group">
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-zinc-800 flex items-center justify-center border border-zinc-700 group-hover:border-emerald-500/30 group-hover:bg-emerald-500/5 transition-all">
                  <CalendarClock className="w-6 h-6 text-zinc-400 group-hover:text-emerald-500" />
                </div>
                <div>
                  <h4 className="font-bold text-lg text-zinc-100">{schedule.busNumber}</h4>
                  <p className="text-xs text-zinc-500 font-mono uppercase tracking-widest">{schedule.depot}</p>
                </div>
              </div>
              <div className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
                {schedule.status}
              </div>
            </div>

            <div className="space-y-4 mb-6">
              <div className="flex items-start gap-3">
                <Tag className="w-4 h-4 text-zinc-600 mt-1 shrink-0" />
                <p className="text-sm text-zinc-300 leading-relaxed">{schedule.maintenanceType}</p>
              </div>
              <div className="flex items-center gap-3">
                <Calendar className="w-4 h-4 text-zinc-600 shrink-0" />
                <p className="text-sm text-zinc-400">Scheduled: <span className="text-zinc-200 font-mono">{new Date(schedule.scheduledDate).toLocaleDateString()}</span></p>
              </div>
              {schedule.odometerReading && (
                <div className="flex items-center gap-3">
                  <Gauge className="w-4 h-4 text-zinc-600 shrink-0" />
                  <p className="text-sm text-zinc-400">Odometer: <span className="text-zinc-200 font-mono">{schedule.odometerReading} km</span></p>
                </div>
              )}
            </div>

            <button 
              onClick={() => convertToActiveJob(schedule)}
              className="w-full bg-zinc-800 hover:bg-emerald-600 text-zinc-300 hover:text-white border border-zinc-700 hover:border-emerald-500 py-3 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2"
            >
              Start Maintenance Now
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        ))}
        {filteredSchedules.length === 0 && (
          <div className="col-span-full py-20 text-center bg-zinc-900/50 border border-dashed border-zinc-800 rounded-3xl">
            <CalendarClock className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
            <p className="text-zinc-500">No upcoming maintenance scheduled.</p>
          </div>
        )}
      </div>

      {/* New Schedule Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 w-full max-w-lg rounded-3xl shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
              <h3 className="text-xl font-bold">Schedule Maintenance</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-zinc-500 hover:text-zinc-300">
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleAddSchedule} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono uppercase tracking-widest text-zinc-500 mb-2">Bus Number</label>
                  <input 
                    type="text" 
                    required
                    list="bus-list"
                    value={busNumber}
                    onChange={(e) => {
                      const val = e.target.value;
                      setBusNumber(val);
                      // Auto-select depot if bus is found in fleet
                      const foundBus = fleet.find(b => b.busNumber === val);
                      if (foundBus && user.role === 'admin') {
                        setDepot(foundBus.depot);
                      }
                    }}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 text-zinc-200 focus:outline-none focus:border-emerald-500/50"
                    placeholder="e.g. BUS-102"
                  />
                  <datalist id="bus-list">
                    {fleet.filter(b => user.role === 'admin' || b.depot === user.depot).map(b => (
                      <option key={b.id} value={b.busNumber}>{b.model ? `${b.busNumber} (${b.model})` : b.busNumber}</option>
                    ))}
                  </datalist>
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

              <div>
                <label className="block text-xs font-mono uppercase tracking-widest text-zinc-500 mb-2">Scheduled Date</label>
                <input 
                  type="date" 
                  required
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 text-zinc-200 focus:outline-none focus:border-emerald-500/50"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-widest text-zinc-500 mb-2">Odometer Reading (Optional)</label>
                <input 
                  type="text" 
                  value={odometerReading}
                  onChange={(e) => setOdometerReading(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 text-zinc-200 focus:outline-none focus:border-emerald-500/50"
                  placeholder="e.g. 45000"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-widest text-zinc-500 mb-2">Maintenance Type</label>
                <textarea 
                  required
                  value={maintenanceType}
                  onChange={(e) => setMaintenanceType(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 text-zinc-200 focus:outline-none focus:border-emerald-500/50 h-32 resize-none"
                  placeholder="e.g. Engine Oil Change, Brake Inspection..."
                />
              </div>

              <div className="pt-4">
                <button 
                  type="submit"
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-4 rounded-xl transition-all shadow-lg shadow-emerald-900/20"
                >
                  Schedule Job
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
