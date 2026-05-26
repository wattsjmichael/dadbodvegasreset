import { useState } from "react";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from "firebase/auth";

import { auth } from "./firebase";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function signUp() {
    await createUserWithEmailAndPassword(auth, email, password);
  }

  async function login() {
    await signInWithEmailAndPassword(auth, email, password);
  }

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="bg-zinc-900 p-8 rounded-2xl w-full max-w-sm space-y-4">
        <h1 className="text-3xl font-black text-amber-300">
          Vegas Reset
        </h1>

        <input
          className="w-full p-3 rounded-xl bg-zinc-800"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          className="w-full p-3 rounded-xl bg-zinc-800"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button
          onClick={login}
          className="w-full bg-amber-300 text-black p-3 rounded-xl font-bold"
        >
          Login
        </button>

        <button
          onClick={signUp}
          className="w-full bg-zinc-700 p-3 rounded-xl"
        >
          Create Account
        </button>
      </div>
    </div>
  );
}