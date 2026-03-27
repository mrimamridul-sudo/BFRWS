/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Download,
  Search,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Plus
} from 'lucide-react';
import { collection, onSnapshot, query, orderBy, addDoc, updateDoc, doc, where } from 'firebase/firestore';
import { db } from '../firebase';
import { handleFirestoreError, OperationType } from '../lib/firestore';
import { User, Staff, AttendanceRecord, Shift, Depot } from '../types';
import { DEPOTS, SHIFTS } from '../constants';
import * as XLSX from 'xlsx';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface AttendanceProps {
  user: User;
}

export default function Attendance({ user }: AttendanceProps) {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedShift, setSelectedShift] = useState<Shift>('Morning');
  const [selectedDepot, setSelectedDepot] = useState<Depot>(user.depot || 'JPG-JNN');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    // Fetch Staff
    const staffQuery = query(collection(db, 'staff'), orderBy('name', 'asc'));
    const unsubscribeStaff = onSnapshot(staffQuery, (snapshot) => {
      const staffData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Staff));
      setStaff(staffData);
    }, (error) => handleFirestoreError(error, OperationType.GET, 'staff'));

    // Fetch Attendance for selected date and shift
    const attendanceQuery = query(
      collection(db, 'attendance'), 
      where('date', '==', selectedDate),
      where('shift', '==', selectedShift)
    );
    const unsubscribeAttendance = onSnapshot(attendanceQuery, (snapshot) => {
      const attendanceData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AttendanceRecord));
      setAttendance(attendanceData);
    }, (error) => handleFirestoreError(error, OperationType.GET, 'attendance'));

    return () => {
      unsubscribeStaff();
      unsubscribeAttendance();
    };
  }, [selectedDate, selectedShift]);

  const filteredStaff = staff.filter(s => {
    const matchesDepot = s.depot === selectedDepot;
    const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (s.employeeId?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
    return matchesDepot && matchesSearch;
  });

  const getRecord = (staffId: string) => {
    return attendance.find(r => r.staffId === staffId && r.date === selectedDate && r.shift === selectedShift);
  };

  const updateAttendance = async (staffId: string, status: AttendanceRecord['status'], extraDuty: boolean = false) => {
    const existingRecord = getRecord(staffId);
    
    if (existingRecord) {
      try {
        await updateDoc(doc(db, 'attendance', existingRecord.id), {
          status,
          extraDuty,
          updatedAt: new Date().toISOString()
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `attendance/${existingRecord.id}`);
      }
    } else {
      const newRecord = {
        staffId,
        date: selectedDate,
        shift: selectedShift,
        status,
        extraDuty,
        depot: staff.find(s => s.id === staffId)?.depot || selectedDepot,
        createdAt: new Date().toISOString(),
      };
      try {
        await addDoc(collection(db, 'attendance'), newRecord);
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, 'attendance');
      }
    }
  };

  const exportMonthlyReport = () => {
    const date = new Date(selectedDate);
    const month = date.getMonth();
    const year = date.getFullYear();
    
    const monthlyRecords = attendance.filter(r => {
      const rDate = new Date(r.date);
      return rDate.getMonth() === month && rDate.getFullYear() === year && 
             staff.find(s => s.id === r.staffId)?.depot === selectedDepot;
    });

    const exportData = monthlyRecords.map(r => {
      const s = staff.find(staffMember => staffMember.id === r.staffId);
      return {
        'Date': r.date,
        'Employee ID': s?.employeeId || 'N/A',
        'Name': s?.name || 'Unknown',
        'Designation': s?.designation || 'Unknown',
        'Depot': s?.depot || 'Unknown',
        'Shift': r.shift,
        'Status': r.status,
        'Extra Duty': r.extraDuty ? 'Yes' : 'No'
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Monthly Attendance");
    XLSX.writeFile(workbook, `Attendance_${selectedDepot}_${year}_${month + 1}.xlsx`);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-zinc-100">Daily Attendance</h2>
          <p className="text-zinc-500 mt-1">Mark and manage staff attendance shift-wise.</p>
        </div>

        <button 
          onClick={exportMonthlyReport}
          className="bg-zinc-800 hover:bg-zinc-700 text-white px-6 py-3 rounded-xl font-semibold flex items-center gap-2 transition-all border border-zinc-700"
        >
          <Download className="w-5 h-5" />
          Monthly Report
        </button>
      </header>

      {/* Controls */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <label className="text-xs font-mono uppercase tracking-widest text-zinc-500">Date</label>
            <div className="relative">
              <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input 
                type="date" 
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 pl-12 pr-4 text-zinc-200 focus:outline-none focus:border-emerald-500/50"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-mono uppercase tracking-widest text-zinc-500">Shift</label>
            <div className="relative">
              <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <select 
                value={selectedShift}
                onChange={(e) => setSelectedShift(e.target.value as Shift)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 pl-12 pr-4 text-zinc-200 focus:outline-none focus:border-emerald-500/50"
              >
                {SHIFTS.map(s => <option key={s.type} value={s.type}>{s.type} ({s.timing})</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-mono uppercase tracking-widest text-zinc-500">Depot</label>
            <select 
              value={selectedDepot}
              onChange={(e) => setSelectedDepot(e.target.value as Depot)}
              disabled={user.role !== 'admin'}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 text-zinc-200 focus:outline-none focus:border-emerald-500/50 disabled:opacity-50"
            >
              {DEPOTS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-mono uppercase tracking-widest text-zinc-500">Search Staff</label>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input 
                type="text" 
                placeholder="Name or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 pl-12 pr-4 text-zinc-200 focus:outline-none focus:border-emerald-500/50"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Attendance Table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-zinc-950/50 text-zinc-500 text-[10px] uppercase tracking-widest font-mono">
                <th className="px-6 py-4 font-medium">Staff Member</th>
                <th className="px-6 py-4 font-medium">Designation</th>
                <th className="px-6 py-4 font-medium">Attendance Status</th>
                <th className="px-6 py-4 font-medium">Extra Duty</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {filteredStaff.map((s) => {
                const record = getRecord(s.id);
                return (
                  <tr key={s.id} className="hover:bg-zinc-800/30 transition-colors group">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-zinc-200">{s.name}</p>
                        <p className="text-xs text-zinc-500 font-mono">{s.employeeId}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs text-zinc-400">{s.designation}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => updateAttendance(s.id, 'Present', record?.extraDuty)}
                          className={cn(
                            "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5",
                            record?.status === 'Present' 
                              ? "bg-emerald-500 text-white" 
                              : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                          )}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Present
                        </button>
                        <button 
                          onClick={() => updateAttendance(s.id, 'Absent', false)}
                          className={cn(
                            "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5",
                            record?.status === 'Absent' 
                              ? "bg-red-500 text-white" 
                              : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                          )}
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          Absent
                        </button>
                        <button 
                          onClick={() => updateAttendance(s.id, 'Leave', false)}
                          className={cn(
                            "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5",
                            record?.status === 'Leave' 
                              ? "bg-amber-500 text-white" 
                              : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                          )}
                        >
                          <AlertCircle className="w-3.5 h-3.5" />
                          Leave
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <button 
                        onClick={() => updateAttendance(s.id, record?.status || 'Present', !record?.extraDuty)}
                        disabled={record?.status !== 'Present'}
                        className={cn(
                          "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 disabled:opacity-30 disabled:cursor-not-allowed",
                          record?.extraDuty 
                            ? "bg-blue-500 text-white" 
                            : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                        )}
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Extra Duty
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filteredStaff.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-zinc-500 italic">
                    No staff members found for this depot.
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
