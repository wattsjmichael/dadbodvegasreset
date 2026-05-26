import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Dumbbell,
  Martini,
  School,
  Trophy,
  Utensils,
  Briefcase,
  Trash2,
  Save,
} from "lucide-react";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "./firebase";

const START_DATE = "2026-05-26";
const END_DATE = "2026-07-24";
const TARGET_WEIGHT = 185;

const checklistItems = [
  { key: "workout", label: "6:30 Workout", xp: 50, icon: Dumbbell },
  { key: "calories", label: "Calories Hit", xp: 35, icon: Utensils },
  { key: "protein", label: "Protein Hit", xp: 35, icon: Utensils },
  { key: "fiber", label: "Fiber Hit", xp: 25, icon: Utensils },
  { key: "noAlcohol", label: "No Alcohol", xp: 50, icon: Martini },
  { key: "noEatingOut", label: "No Eating Out", xp: 40, icon: Utensils },
  { key: "schoolWork", label: "School Work", xp: 25, icon: School },
];

const eventTypes = {
  porkys: { label: "Porky's", color: "border-red-400 bg-red-500/20 text-red-100", icon: Briefcase },
  para: { label: "Para/Sub", color: "border-blue-400 bg-blue-500/20 text-blue-100", icon: School },
  school: { label: "School Calendar", color: "border-purple-400 bg-purple-500/20 text-purple-100", icon: School },
  workout: { label: "Workout", color: "border-emerald-400 bg-emerald-500/20 text-emerald-100", icon: Dumbbell },
  family: { label: "Family", color: "border-amber-400 bg-amber-500/20 text-amber-100", icon: CalendarDays },
};

const defaultData = {
  profile: {
    startWeight: 205,
    currentWeight: 205,
    calorieTarget: 2200,
    proteinTarget: 180,
    fiberTarget: 30,
  },
  days: {},
  events: [],
};

function formatDate(date) {
  return date.toISOString().split("T")[0];
}

function toDate(key) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function todayKey() {
  return formatDate(new Date());
}

function daysBetween(a, b) {
  return Math.floor((toDate(b) - toDate(a)) / 86400000) + 1;
}

function getDayLabel(key) {
  return toDate(key).toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

export default function Dashboard({ user, onLogout }) {
  const [data, setData] = useState(defaultData);
  const [selectedDate, setSelectedDate] = useState(todayKey());
  const [calendarMonth, setCalendarMonth] = useState(toDate(todayKey()));
  const [newEvent, setNewEvent] = useState({ title: "", time: "", type: "porkys" });
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!user) return;

    const ref = doc(db, "users", user.uid);

    return onSnapshot(ref, async (snap) => {
      if (snap.exists()) {
        setData({ ...defaultData, ...snap.data() });
      } else {
        await setDoc(ref, defaultData);
        setData(defaultData);
      }
      setLoaded(true);
    });
  }, [user]);

  async function saveData(nextData) {
    setData(nextData);
    await setDoc(doc(db, "users", user.uid), nextData, { merge: true });
  }

  const selectedDay = data.days[selectedDate] || {
    checks: {},
    notes: "",
    breakfast: "",
    lunch: "",
    weight: "",
  };

  const totalDays = daysBetween(START_DATE, END_DATE);
  const dayNumber = Math.max(1, Math.min(totalDays, daysBetween(START_DATE, selectedDate)));
  const daysLeft = Math.max(0, daysBetween(selectedDate, END_DATE) - 1);

  const todayXp = checklistItems.reduce(
    (sum, item) => sum + (selectedDay.checks?.[item.key] ? item.xp : 0),
    0
  );

  const maxDailyXp = checklistItems.reduce((sum, item) => sum + item.xp, 0);

  const xpTotal = useMemo(() => {
    return Object.values(data.days || {}).reduce((total, day) => {
      return total + checklistItems.reduce(
        (sum, item) => sum + (day.checks?.[item.key] ? item.xp : 0),
        0
      );
    }, 0);
  }, [data.days]);

  const level = Math.floor(xpTotal / 250) + 1;
  const levelProgress = xpTotal % 250;
  const poundsLost = Math.max(0, Number(data.profile.startWeight) - Number(data.profile.currentWeight));
  const poundsToGo = Math.max(0, Number(data.profile.currentWeight) - TARGET_WEIGHT);

  const monthCells = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const first = new Date(year, month, 1);
    const blanks = first.getDay();
    const days = new Date(year, month + 1, 0).getDate();

    return [
      ...Array(blanks).fill(null),
      ...Array.from({ length: days }, (_, i) => new Date(year, month, i + 1)),
    ];
  }, [calendarMonth]);

  function updateProfile(key, value) {
    saveData({
      ...data,
      profile: { ...data.profile, [key]: value },
    });
  }

  function updateDay(patch) {
    saveData({
      ...data,
      days: {
        ...data.days,
        [selectedDate]: { ...selectedDay, ...patch },
      },
    });
  }

  function toggleCheck(key) {
    updateDay({
      checks: {
        ...selectedDay.checks,
        [key]: !selectedDay.checks?.[key],
      },
    });
  }

  function addEvent() {
    if (!newEvent.title.trim()) return;

    saveData({
      ...data,
      events: [
        ...(data.events || []),
        {
          id: crypto.randomUUID(),
          date: selectedDate,
          title: newEvent.title,
          time: newEvent.time,
          type: newEvent.type,
        },
      ],
    });

    setNewEvent({ title: "", time: "", type: "porkys" });
  }

  function deleteEvent(id) {
    saveData({
      ...data,
      events: data.events.filter((event) => event.id !== id),
    });
  }

  if (!loaded) {
    return <div className="min-h-screen bg-black text-white p-8">Loading Vegas...</div>;
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <motion.header
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-zinc-900 to-black border border-amber-500/30 rounded-3xl p-6"
        >
          <div className="flex justify-between gap-4">
            <div>
              <p className="text-amber-300 uppercase tracking-[0.35em] text-xs">
                Rat Pack Training Arc
              </p>
              <h1 className="text-4xl md:text-6xl font-black mt-2">Vegas Reset</h1>
              <p className="text-zinc-400 mt-2">
                Day {dayNumber} of {totalDays} · {daysLeft} days until Vegas
              </p>
            </div>
            <button onClick={onLogout} className="text-sm text-zinc-400 hover:text-white">
              Logout
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
            <Metric label="Level" value={level} />
            <Metric label="Total XP" value={xpTotal} />
            <Metric label="Lost" value={`${poundsLost.toFixed(1)} lb`} />
            <Metric label="To Goal" value={`${poundsToGo.toFixed(1)} lb`} />
          </div>

          <div className="mt-6">
            <div className="flex justify-between text-sm text-zinc-400 mb-2">
              <span>Level Progress</span>
              <span>{levelProgress}/250 XP</span>
            </div>
            <div className="h-4 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-300"
                style={{ width: `${(levelProgress / 250) * 100}%` }}
              />
            </div>
          </div>
        </motion.header>

        <section className="grid lg:grid-cols-[1fr_1.2fr] gap-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-4">
            <div className="flex items-center justify-between mb-4">
              <button onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))}>
                <ChevronLeft />
              </button>
              <h2 className="font-black text-xl">
                {calendarMonth.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
              </h2>
              <button onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))}>
                <ChevronRight />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-2 text-center text-xs text-zinc-500 mb-2">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => <div key={d}>{d}</div>)}
            </div>

            <div className="grid grid-cols-7 gap-2">
              {monthCells.map((day, i) => {
                if (!day) return <div key={i} />;

                const key = formatDate(day);
                const events = data.events.filter((e) => e.date === key);
                const completed = checklistItems.filter((item) => data.days[key]?.checks?.[item.key]).length;

                return (
                  <button
                    key={key}
                    onClick={() => setSelectedDate(key)}
                    className={`min-h-20 rounded-xl border p-2 text-left ${
                      selectedDate === key
                        ? "border-amber-300 bg-amber-300/10"
                        : "border-zinc-800 bg-black/30"
                    }`}
                  >
                    <div className="flex justify-between">
                      <span className="font-bold">{day.getDate()}</span>
                      {completed > 0 && <span className="text-[10px] text-emerald-300">{completed}/7</span>}
                    </div>
                    <div className="mt-1 space-y-1">
                      {events.slice(0, 2).map((event) => (
                        <div
                          key={event.id}
                          className={`text-[10px] truncate rounded border px-1 ${eventTypes[event.type]?.color}`}
                        >
                          {event.title}
                        </div>
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-4 md:p-6 space-y-5">
            <div className="flex justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black">{getDayLabel(selectedDate)}</h2>
                <p className="text-zinc-400">{todayXp}/{maxDailyXp} XP today</p>
              </div>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-black border border-zinc-700 rounded-xl p-2"
              />
            </div>

            <div className="h-3 bg-zinc-800 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-400" style={{ width: `${(todayXp / maxDailyXp) * 100}%` }} />
            </div>

            <div className="grid sm:grid-cols-2 gap-2">
              {checklistItems.map((item) => {
                const Icon = item.icon;
                const checked = selectedDay.checks?.[item.key];

                return (
                  <button
                    key={item.key}
                    onClick={() => toggleCheck(item.key)}
                    className={`flex items-center gap-3 rounded-xl border p-3 text-left ${
                      checked ? "bg-emerald-500/15 border-emerald-400/50" : "bg-black/30 border-zinc-800"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <div>
                      <p className="font-semibold">{item.label}</p>
                      <p className="text-xs text-zinc-400">+{item.xp} XP</p>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="grid md:grid-cols-3 gap-3">
              <Input label="Today's Weight" value={selectedDay.weight || ""} onChange={(v) => updateDay({ weight: v })} />
              <Input label="Current Weight" value={data.profile.currentWeight} onChange={(v) => updateProfile("currentWeight", v)} />
              <Input label="Calories" value={data.profile.calorieTarget} onChange={(v) => updateProfile("calorieTarget", v)} />
              <Input label="Protein" value={data.profile.proteinTarget} onChange={(v) => updateProfile("proteinTarget", v)} />
              <Input label="Fiber" value={data.profile.fiberTarget} onChange={(v) => updateProfile("fiberTarget", v)} />
            </div>

            <textarea
              className="w-full bg-black border border-zinc-700 rounded-xl p-3 min-h-20"
              placeholder="Breakfast plan/log"
              value={selectedDay.breakfast || ""}
              onChange={(e) => updateDay({ breakfast: e.target.value })}
            />

            <textarea
              className="w-full bg-black border border-zinc-700 rounded-xl p-3 min-h-20"
              placeholder="Lunch plan/log"
              value={selectedDay.lunch || ""}
              onChange={(e) => updateDay({ lunch: e.target.value })}
            />

            <textarea
              className="w-full bg-black border border-zinc-700 rounded-xl p-3 min-h-20"
              placeholder="One sentence journal"
              value={selectedDay.notes || ""}
              onChange={(e) => updateDay({ notes: e.target.value })}
            />
          </div>
        </section>

        <section className="bg-zinc-900 border border-zinc-800 rounded-3xl p-4 md:p-6 space-y-4">
          <h2 className="text-xl font-black flex items-center gap-2">
            <CalendarDays /> Calendar Events
          </h2>

          <div className="grid md:grid-cols-[1fr_auto_auto_auto] gap-2">
            <input
              className="bg-black border border-zinc-700 rounded-xl p-2"
              placeholder="Event title"
              value={newEvent.title}
              onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
            />
            <input
              className="bg-black border border-zinc-700 rounded-xl p-2"
              placeholder="Time"
              value={newEvent.time}
              onChange={(e) => setNewEvent({ ...newEvent, time: e.target.value })}
            />
            <select
              className="bg-black border border-zinc-700 rounded-xl p-2"
              value={newEvent.type}
              onChange={(e) => setNewEvent({ ...newEvent, type: e.target.value })}
            >
              {Object.entries(eventTypes).map(([key, type]) => (
                <option key={key} value={key}>{type.label}</option>
              ))}
            </select>
            <button onClick={addEvent} className="bg-amber-300 text-black rounded-xl px-4 font-bold flex items-center justify-center gap-2">
              <Save className="w-4 h-4" /> Add
            </button>
          </div>

          <div className="space-y-2">
            {data.events.filter((e) => e.date === selectedDate).map((event) => (
              <div key={event.id} className={`rounded-xl border p-3 flex justify-between ${eventTypes[event.type]?.color}`}>
                <div>
                  <p className="font-bold">{event.title}</p>
                  <p className="text-xs opacity-80">{eventTypes[event.type]?.label} {event.time && `· ${event.time}`}</p>
                </div>
                <button onClick={() => deleteEvent(event.id)}>
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function Metric({ label, value }) {
  return (
    <div className="bg-black/40 border border-zinc-800 rounded-2xl p-4">
      <p className="text-xs uppercase tracking-widest text-zinc-500">{label}</p>
      <p className="text-2xl font-black mt-1">{value}</p>
    </div>
  );
}

function Input({ label, value, onChange }) {
  return (
    <label>
      <span className="text-xs text-zinc-400">{label}</span>
      <input
        className="mt-1 bg-black border border-zinc-700 rounded-xl p-2 w-full"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}