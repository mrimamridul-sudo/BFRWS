/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Search, 
  History as HistoryIcon,
  Calendar,
  User as UserIcon,
  Tag,
  CheckCircle2,
  Gauge,
  Download,
  Trash2
} from 'lucide-react';
import { collection, onSnapshot, query, orderBy, where, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { handleFirestoreError, OperationType } from '../lib/firestore';
import { User, MaintenanceJob } from '../types';
import * as XLSX from 'xlsx';

interface HistoryProps {
  user: User;
}

export default function History({ user }: HistoryProps) {
  const [jobs, setJobs] = useState<MaintenanceJob[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const jobsQuery = query(
      collection(db, 'maintenance_jobs'), 
      where('status', '==', 'Completed'),
      orderBy('createdAt', 'desc')
    );
    const unsubscribe = onSnapshot(jobsQuery, (snapshot) => {
      const jobsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MaintenanceJob));
      setJobs(jobsData);
    }, (error) => handleFirestoreError(error, OperationType.GET, 'maintenance_jobs'));

    return () => unsubscribe();
  }, []);

  const deleteJob = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'maintenance_jobs', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `maintenance_jobs/${id}`);
    }
  };

  const filteredJobs = jobs.filter(job => {
    const matchesSearch = job.busNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         job.jobDescription.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDepot = user.role === 'admin' ? true : job.depot === user.depot;
    return matchesSearch && matchesDepot;
  });

  const exportToExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(filteredJobs.map(job => ({
      'Bus Number': job.busNumber,
      'Depot': job.depot,
      'Job Description': job.jobDescription,
      'Technician': job.technician,
      'Odometer': job.odometerReading || 'N/A',
      'Completion Date': new Date(job.date).toLocaleDateString(),
      'Status': job.status
    })));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Maintenance History");
    XLSX.writeFile(workbook, `Maintenance_History_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-zinc-100">Maintenance History</h2>
          <p className="text-zinc-500 mt-1">Review and export completed maintenance records.</p>
        </div>

        <button 
          onClick={exportToExcel}
          className="bg-zinc-800 hover:bg-zinc-700 text-white px-6 py-3 rounded-xl font-semibold flex items-center gap-2 transition-all border border-zinc-700"
        >
          <Download className="w-5 h-5" />
          Export History
        </button>
      </header>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
          <input 
            type="text" 
            placeholder="Search history by bus number or job..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl py-3 pl-12 pr-4 text-zinc-200 focus:outline-none focus:border-emerald-500/50 transition-colors"
          />
        </div>
      </div>

      {/* History Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredJobs.map((job) => (
          <div key={job.id} className="bg-zinc-900/40 border border-zinc-800/50 rounded-3xl p-6 transition-all">
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-zinc-800/50 flex items-center justify-center border border-zinc-700/50">
                  <HistoryIcon className="w-6 h-6 text-zinc-500" />
                </div>
                <div>
                  <h4 className="font-bold text-lg text-zinc-300">{job.busNumber}</h4>
                  <p className="text-xs text-zinc-500 font-mono uppercase tracking-widest">{job.depot}</p>
                </div>
              </div>
              <div className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border bg-emerald-500/5 text-emerald-500/50 border-emerald-500/10">
                {job.status}
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Tag className="w-4 h-4 text-zinc-600 mt-1 shrink-0" />
                <p className="text-sm text-zinc-400 leading-relaxed">{job.jobDescription}</p>
              </div>
              <div className="flex items-center gap-3">
                <UserIcon className="w-4 h-4 text-zinc-600 shrink-0" />
                <p className="text-sm text-zinc-500">Technician: <span className="text-zinc-300">{job.technician}</span></p>
              </div>
              <div className="flex items-center gap-3">
                <Calendar className="w-4 h-4 text-zinc-600 shrink-0" />
                <p className="text-sm text-zinc-500">Completed: <span className="text-zinc-300 font-mono">{new Date(job.date).toLocaleDateString()}</span></p>
              </div>
              {job.odometerReading && (
                <div className="flex items-center gap-3">
                  <Gauge className="w-4 h-4 text-zinc-600 shrink-0" />
                  <p className="text-sm text-zinc-500">Odometer: <span className="text-zinc-300 font-mono">{job.odometerReading} km</span></p>
                </div>
              )}
            </div>

            {user.role === 'admin' && (
              <div className="mt-6 pt-6 border-t border-zinc-800/50 flex justify-end">
                <button 
                  onClick={() => deleteJob(job.id)}
                  className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white border border-red-500/20 rounded-xl text-xs font-semibold transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Record
                </button>
              </div>
            )}
          </div>
        ))}
        {filteredJobs.length === 0 && (
          <div className="col-span-full py-20 text-center bg-zinc-900/30 border border-dashed border-zinc-800 rounded-3xl">
            <HistoryIcon className="w-12 h-12 text-zinc-800 mx-auto mb-4" />
            <p className="text-zinc-600">No completed maintenance records found.</p>
          </div>
        )}
      </div>
    </div>
  );
}
