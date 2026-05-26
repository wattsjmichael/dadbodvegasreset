import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  CalendarDays,
  Camera,
  ChevronLeft,
  ChevronRight,
  Dumbbell,
  Martini,
  School,
  Trophy,
  Utensils,
  Briefcase,
  Trash2,
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
  { key: "school", label: "School Work", xp: 25, icon: School },
];

const eventTypes = {
  porkys: {
    label: "Porky's",
    className: "bg-red-500/20 border-red-400/40 text-red-100",
    icon: Briefcase,
  },
  para: {
    label: "Para/Sub",
    className: "bg-blue-500/20 border-blue-400/40 text-blue-100",
    icon: School,
  },
  schoolCalendar: {
    label: "School Calendar",
    className: "bg-purple-500/20 border-purple-400/40 text-purple-100",
    icon: School,
  },
  workout: {
    label: "Workout",
    className: "bg-emerald-500/20 border-emerald-400/40 text-emerald-100",
    icon: Dumbbell,
  },
  family: {
    label: "Family",
    className: "bg-amber-500/20 border-amber-400/40 text-amber-100",
    icon: CalendarDays,
  },
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

function toDate(dateString) {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");

  return `${y}-${m}-${d}`;
}

function todayKey() {
  return formatDate(new Date());
}

function daysBetween(start, end) {
  const ms = toDate(end) - toDate(start);
  return Math.floor(ms / 86400000) + 1;
}

function getDayName(dateString) {
  return toDate(dateString).toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

export default function Dashboard({ user, onLogout }) {
  const [data, setData] = useState(defaultData);

  const [selectedDate, setSelectedDate] = useState(todayKey());

  const [calendarMonth, setCalendarMonth] = useState(
    toDate(START_DATE)
  );

  const [newEvent, setNewEvent] = useState({
    title: "",
    type: "porkys",
    time: "",
  });

  useEffect(() => {
    if (!user) return;

    const ref = doc(db, "users", user.uid);

    const unsub = onSnapshot(ref, (snapshot) => {
      if (snapshot.exists()) {
        setData(snapshot.data());
      } else {
        setDoc(ref, defaultData);
      }
    });

    return () => unsub();
  }, [user]);

  async function saveData(nextData) {
    setData(nextData);

    await setDoc(
      doc(db, "users", user.uid),
      nextData,
      { merge: true }
    );
  }

  const selectedDay = data.days[selectedDate] || {
    checks: {},
    notes: "",
    photos: [],
    meals: {
      breakfast: "",
      lunch: "",
    },
  };

  const totalDays = daysBetween(START_DATE, END_DATE);

  const dayNumber = Math.max(
    1,
    Math.min(totalDays, daysBetween(START_DATE, selectedDate))
  );

  const daysLeft = Math.max(
    0,
    daysBetween(selectedDate, END_DATE) - 1
  );

  const maxDailyXp = checklistItems.reduce(
    (sum, item) => sum + item.xp,
    0
  );

  const todayXp = checklistItems.reduce(
    (sum, item) =>
      sum + (selectedDay.checks?.[item.key] ? item.xp : 0),
    0
  );

  const xpTotal = useMemo(() => {
    return Object.values(data.days).reduce((total, day) => {
      return (
        total +
        checklistItems.reduce(
          (sum, item) =>
            sum + (day.checks?.[item.key] ? item.xp : 0),
          0
        )
      );
    }, 0);
  }, [data.days]);

  const level = Math.floor(xpTotal / 250) + 1;

  const levelProgress = xpTotal % 250;

  const poundsLost = Math.max(
    0,
    Number(data.profile.startWeight) -
      Number(data.profile.currentWeight)
  );

  const poundsToGo = Math.max(
    0,
    Number(data.profile.currentWeight) - TARGET_WEIGHT
  );

  const selectedEvents = data.events.filter(
    (event) => event.date === selectedDate
  );

  const monthDays = useMemo(() => {
    const year = calendarMonth.getFullYear();

    const month = calendarMonth.getMonth();

    const first = new Date(year, month, 1);

    const startOffset = first.getDay();

    const daysInMonth = new Date(
      year,
      month + 1,
      0
    ).getDate();

    const cells = [];

    for (let i = 0; i < startOffset; i++) {
      cells.push(null);
    }

    for (let d = 1; d <= daysInMonth; d++) {
      cells.push(new Date(year, month, d));
    }

    return cells;
  }, [calendarMonth]);

  function updateProfile(key, value) {
    saveData({
      ...data,
      profile: {
        ...data.profile,
        [key]: value,
      },
    });
  }

  function updateDay(patch) {
    saveData({
      ...data,
      days: {
        ...data.days,
        [selectedDate]: {
          ...selectedDay,
          ...patch,
        },
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
        ...data.events,
        {
          id: crypto.randomUUID(),
          date: selectedDate,
          ...newEvent,
        },
      ],
    });

    setNewEvent({
      title: "",
      type: "porkys",
      time: "",
    });
  }

  function removeEvent(id) {
    saveData({
      ...data,
      events: data.events.filter(
        (event) => event.id !== id
      ),
    });
  }

  function changeMonth(amount) {
    setCalendarMonth(
      new Date(
        calendarMonth.getFullYear(),
        calendarMonth.getMonth() + amount,
        1
      )
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">

        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid lg:grid-cols-[1.5fr_1fr] gap-4"
        >

          <div className="bg-gradient-to-br from-zinc-900 to-black border border-amber-500/30 rounded-2xl p-6">

            <div className="flex justify-between items-start">
              <div>
                <p className="text-amber-300 uppercase tracking-[0.35em] text-xs">
                  Rat Pack Training Arc
                </p>

                <h1 className="text-4xl md:text-6xl font-black mt-2">
                  Vegas Reset
                </h1>

                <p className="text-zinc-400 mt-2">
                  Day {dayNumber} of {totalDays}
                </p>

                <p className="text-zinc-500">
                  {daysLeft} days until Vegas
                </p>
              </div>

              <button
                onClick={onLogout}
                className="text-sm text-zinc-400 hover:text-white"
              >
                Logout
              </button>
            </div>

            <div className="grid md:grid-cols-4 gap-3 mt-6">

              <Metric label="Level" value={level} />

              <Metric label="Total XP" value={xpTotal} />

              <Metric
                label="Lost"
                value={`${poundsLost.toFixed(1)} lb`}
              />

              <Metric
                label="To Goal"
                value={`${poundsToGo.toFixed(1)} lb`}
              />

            </div>

            <div className="mt-6">

              <div className="flex justify-between text-sm text-zinc-400 mb-2">
                <span>Level progress</span>
                <span>{levelProgress}/250 XP</span>
              </div>

              <div className="h-4 bg-zinc-800 rounded-full overflow-hidden">

                <div
                  className="h-full bg-amber-300 rounded-full"
                  style={{
                    width: `${(levelProgress / 250) * 100}%`,
                  }}
                />

              </div>

            </div>

          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">

            <h2 className="text-xl font-bold mb-4">
              Targets
            </h2>

            <div className="grid grid-cols-2 gap-3">

              <Input
                label="Current Weight"
                value={data.profile.currentWeight}
                onChange={(v) =>
                  updateProfile("currentWeight", v)
                }
              />

              <Input
                label="Calories"
                value={data.profile.calorieTarget}
                onChange={(v) =>
                  updateProfile("calorieTarget", v)
                }
              />

              <Input
                label="Protein"
                value={data.profile.proteinTarget}
                onChange={(v) =>
                  updateProfile("proteinTarget", v)
                }
              />

              <Input
                label="Fiber"
                value={data.profile.fiberTarget}
                onChange={(v) =>
                  updateProfile("fiberTarget", v)
                }
              />

            </div>

          </div>

        </motion.div>

      </div>
    </div>
  );
}

function Metric({ label, value }) {
  return (
    <div className="bg-black/40 border border-zinc-800 rounded-2xl p-4">
      <p className="text-xs uppercase tracking-widest text-zinc-500">
        {label}
      </p>

      <p className="text-2xl font-black mt-1">
        {value}
      </p>
    </div>
  );
}

function Input({ label, value, onChange }) {
  return (
    <label className="block">
      <span className="text-xs text-zinc-400">
        {label}
      </span>

      <input
        className="mt-1 bg-black border border-zinc-700 rounded-xl p-2 w-full"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}