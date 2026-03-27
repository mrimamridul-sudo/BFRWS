/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Depot, Designation, Shift } from './types';

export const DEPOTS: Depot[] = [
  'JPG-JNN',
  'SLG-NJN',
  'MAL',
  'ILP',
  'MNG',
  'JPG-NJN',
  'NBSTC',
  'SLG-JNN'
];

export const DESIGNATIONS: Designation[] = [
  'Technician',
  'Electrician',
  'Helper',
  'Tyreman',
  'Cleaner',
  'Body technician'
];

export const SHIFTS: { type: Shift; timing: string }[] = [
  { type: 'Morning', timing: '05:30am to 02:00pm' },
  { type: 'Evening', timing: '01:30pm to 10:00pm' },
  { type: 'General', timing: '09:00am to 06:00pm' }
];

export const ADMIN_CREDENTIALS = {
  id: 'JPGmridul',
  password: 'Mri@#JPG123'
};
