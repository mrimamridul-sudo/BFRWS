/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  BrowserRouter as Router, 
  Routes, 
  Route, 
  Navigate 
} from 'react-router-dom';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, onSnapshot, getDoc, setDoc, collection, query, where, getDocs, deleteDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Maintenance from './pages/Maintenance';
import Schedule from './pages/Schedule';
import History from './pages/History';
import Fleet from './pages/Fleet';
import Manpower from './pages/Manpower';
import Attendance from './pages/Attendance';
import Comments from './pages/Comments';
import AdminPanel from './pages/AdminPanel';
import Profile from './pages/Profile';
import UserDirectory from './pages/UserDirectory';
import Breakdowns from './pages/Breakdowns';
import Layout from './components/Layout';
import { User } from './types';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    let unsubscribeUser: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      setAuthError(null);
      
      // Clean up previous user listener if it exists
      if (unsubscribeUser) {
        unsubscribeUser();
        unsubscribeUser = null;
      }

      if (firebaseUser) {
        try {
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          const docSnap = await getDoc(userDocRef);

          if (docSnap.exists()) {
            // User is already authorized and mapped to UID
            unsubscribeUser = onSnapshot(userDocRef, (snap) => {
              if (snap.exists()) {
                setUser(snap.data() as User);
                setLoading(false);
              }
            });
          } else {
            // Check if email is whitelisted (pre-created by Admin)
            const usersRef = collection(db, 'users');
            const q = query(usersRef, where('email', '==', firebaseUser.email));
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
              // Found a pre-authorized record!
              const existingDoc = querySnapshot.docs[0];
              const existingData = existingDoc.data();
              
              // Standardize: Move data to UID-based document
              const authorizedUser: User = {
                ...existingData as User,
                id: firebaseUser.uid,
                username: existingData.username || firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
                fullName: firebaseUser.displayName || existingData.fullName || '',
                email: firebaseUser.email!,
                joinedDate: existingData.joinedDate || new Date().toISOString(),
              };

              await setDoc(userDocRef, authorizedUser);
              await deleteDoc(existingDoc.ref); // Remove the temporary random-id doc
              
              setUser(authorizedUser);
              setLoading(false);
            } else if (firebaseUser.email === 'mrima.mridul@gmail.com') {
              // Super Admin - Auto Authorize
              const adminUser: User = {
                id: firebaseUser.uid,
                username: 'Super Admin',
                role: 'admin',
                fullName: firebaseUser.displayName || 'Mridul',
                email: firebaseUser.email!,
                joinedDate: new Date().toISOString(),
                depot: 'NBSTC'
              };
              await setDoc(userDocRef, adminUser);
              setUser(adminUser);
              setLoading(false);
            } else {
              // NOT AUTHORIZED
              await signOut(auth);
              setAuthError('Access Denied. Your email is not authorized. Please contact your administrator.');
              setUser(null);
              setLoading(false);
            }
          }
        } catch (err) {
          console.error("Auth Guard Error:", err);
          setLoading(false);
        }
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeUser) unsubscribeUser();
    };
  }, []);

  const handleLogout = async () => {
    try {
      await auth.signOut();
      setUser(null);
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-zinc-950">
        <div className="text-zinc-400 font-mono animate-pulse">Initializing System...</div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route 
          path="/login" 
          element={user ? <Navigate to="/" /> : <Login externalError={authError} />} 
        />
        
        <Route 
          path="/" 
          element={user ? <Layout user={user} onLogout={handleLogout} /> : <Navigate to="/login" />}
        >
          <Route index element={<Dashboard user={user!} />} />
          <Route path="maintenance" element={<Maintenance user={user!} />} />
          <Route path="schedule" element={<Schedule user={user!} />} />
          <Route path="fleet" element={<Fleet user={user!} />} />
          <Route path="manpower" element={<Manpower user={user!} />} />
          <Route path="attendance" element={<Attendance user={user!} />} />
          <Route path="comments" element={<Comments user={user!} />} />
          <Route path="breakdowns" element={<Breakdowns user={user!} />} />
          <Route path="history" element={<History user={user!} />} />
          <Route path="profile" element={<Profile user={user!} />} />
          <Route path="directory" element={<UserDirectory />} />
          <Route 
            path="admin" 
            element={user?.role === 'admin' ? <AdminPanel /> : <Navigate to="/" />} 
          />
        </Route>
      </Routes>
    </Router>
  );
}
