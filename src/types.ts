/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type Role = 'admin' | 'user';

export type Depot = 'JPG-JNN' | 'SLG-NJN' | 'MAL' | 'ILP' | 'MNG' | 'JPG-NJN' | 'NBSTC' | 'SLG-JNN';

export interface User {
  id: string;
  username: string;
  role: Role;
  depot?: Depot;
  fullName?: string;
  email?: string;
  phone?: string;
  joinedDate?: string;
}

export interface MaintenanceJob {
  id: string;
  busNumber: string;
  depot: Depot;
  date: string;
  jobDescription: string;
  technician: string;
  status: 'Pending' | 'In Progress' | 'Completed';
  notes?: string;
  odometerReading?: string;
  createdAt: string;
}

export interface ScheduledMaintenance {
  id: string;
  busNumber: string;
  depot: Depot;
  scheduledDate: string;
  maintenanceType: string;
  odometerReading?: string;
  status: 'Scheduled' | 'Completed' | 'Missed';
  createdAt: string;
}

export type Designation = 'Technician' | 'Electrician' | 'Helper' | 'Tyreman' | 'Cleaner' | 'Body technician';

export type Shift = 'Morning' | 'Evening' | 'General';

export interface Staff {
  id: string;
  name: string;
  designation: Designation;
  depot: Depot;
  employeeId?: string;
  createdAt: string;
}

export interface AttendanceRecord {
  id: string;
  staffId: string;
  date: string;
  shift: Shift;
  status: 'Present' | 'Absent' | 'Leave';
  extraDuty: boolean;
  notes?: string;
}

export interface Comment {
  id: string;
  userId: string;
  username: string;
  depot: Depot;
  text: string;
  createdAt: string;
}

export interface Bus {
  id: string;
  busNumber: string;
  depot: Depot;
  model?: string;
  year?: string;
  engineNumber?: string;
  chassisNumber?: string;
  lastMaintenanceDate?: string;
  createdAt: string;
}

export interface Breakdown {
  id: string;
  busNumber: string;
  depot: Depot;
  date: string;
  location: string;
  routeNo: string;
  causes: string;
  lossKm: number;
  createdAt: string;
}
