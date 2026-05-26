import { useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";

import { auth } from "./firebase";
import Login from "./Login";
import Dashboard from "./Dashboard";

export default function App() {
  const [user, setUser] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setCheckingAuth(false);
    });

    return () => unsub();
  }, []);

  if (checkingAuth) {
    return <div className="min-h-screen bg-black text-white p-8">Loading...</div>;
  }

  if (!user) return <Login />;

  return <Dashboard user={user} onLogout={() => signOut(auth)} />;
}
