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
  Flame,
  Star,
  Lock,
  Medal,
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
  porkys: { label: "Porky's", dot: "bg-red-400", color: "border-red-400/40 bg-red-500/15 text-red-100", icon: Briefcase },
  para: { label: "Para/Sub", dot: "bg-blue-400", color: "border-blue-400/40 bg-blue-500/15 text-blue-100", icon: School },
  school: { label: "School", dot: "bg-purple-400", color: "border-purple-400/40 bg-purple-500/15 text-purple-100", icon: School },
  workout: { label: "Workout", dot: "bg-emerald-400", color: "border-emerald-400/40 bg-emerald-500/15 text-emerald-100", icon: Dumbbell },
  family: { label: "Family", dot: "bg-amber-300", color: "border-amber-400/40 bg-amber-500/15 text-amber-100", icon: CalendarDays },
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
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
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

function getStreak(days, checkKey) {
  let streak = 0;
  const today = toDate(todayKey());

  for (let i = 0; i < 365; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    const key = formatDate(date);
    if (days?.[key]?.checks?.[checkKey]) streak += 1;
    else break;
  }

  return streak;
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

  const selectedDay = data.days?.[selectedDate] || {
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
  const noAlcoholStreak = getStreak(data.days, "noAlcohol");
  const workoutStreak = getStreak(data.days, "workout");

  const achievements = [
    { title: "First Blood", desc: "Log your first complete day", unlocked: xpTotal >= 100, icon: Star },
    { title: "Dry Heat", desc: "7 alcohol-free days", unlocked: noAlcoholStreak >= 7, icon: Martini },
    { title: "Iron Habit", desc: "5 workout days in a row", unlocked: workoutStreak >= 5, icon: Dumbbell },
    { title: "Under 200", desc: "Break below 200 lbs", unlocked: Number(data.profile.currentWeight) < 200, icon: Medal },
    { title: "Vegas Mode", desc: "Reach Level 10", unlocked: level >= 10, icon: Trophy },
    { title: "Final Form", desc: "Hit 185 lbs", unlocked: Number(data.profile.currentWeight) <= 185, icon: Flame },
  ];

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
    <div className="min-h-screen bg-[#08070b] text-zinc-100 p-3 md:p-8">
      <div className="max-w-7xl mx-auto space-y-4 md:space-y-6">
        <motion.header
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden border border-amber-400/30 rounded-[2rem] p-5 md:p-7 bg-[radial-gradient(circle_at_top_left,_rgba(251,191,36,0.18),_transparent_34%),linear-gradient(135deg,_#18110a,_#09090b_55%,_#111827)]"
        >
          <div className="absolute right-5 top-5 text-amber-300/10 text-8xl font-black hidden md:block">LV</div>

          <div className="flex justify-between gap-4 relative z-10">
            <div>
              <p className="text-amber-300 uppercase tracking-[0.35em] text-[10px] md:text-xs">
                Rat Pack Training Arc
              </p>
              <h1 className="text-4xl md:text-6xl font-black mt-2">Vegas Reset</h1>
              <p className="text-zinc-300 mt-2">
                Day {dayNumber} of {totalDays} · {daysLeft} days until Vegas
              </p>
            </div>
            <button onClick={onLogout} className="text-sm text-zinc-400 hover:text-white h-fit">
              Logout
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6 relative z-10">
            <Metric label="Level" value={level} />
            <Metric label="Total XP" value={xpTotal} />
            <Metric label="Lost" value={`${poundsLost.toFixed(1)} lb`} />
            <Metric label="To Goal" value={`${poundsToGo.toFixed(1)} lb`} />
          </div>

          <div className="mt-6 relative z-10">
            <div className="flex justify-between text-sm text-zinc-400 mb-2">
              <span>Level Progress</span>
              <span>{levelProgress}/250 XP</span>
            </div>
            <div className="h-4 bg-black/60 rounded-full overflow-hidden border border-zinc-700">
              <div
                className="h-full bg-gradient-to-r from-amber-400 to-yellow-200"
                style={{ width: `${(levelProgress / 250) * 100}%` }}
              />
            </div>
          </div>
        </motion.header>

        <section className="grid xl:grid-cols-[0.9fr_1.1fr] gap-4">
          <div className="space-y-4 xl:order-2">
            <div className="bg-zinc-950/80 border border-zinc-800 rounded-[1.75rem] p-4 md:p-5">
              <div className="flex justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-amber-300">Today</p>
                  <h2 className="text-2xl md:text-3xl font-black mt-1">{getDayLabel(selectedDate)}</h2>
                  <p className="text-zinc-400">{todayXp}/{maxDailyXp} XP today</p>
                </div>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-black border border-zinc-700 rounded-xl p-2 h-fit max-w-[145px]"
                />
              </div>

              <div className="h-3 bg-black rounded-full overflow-hidden border border-zinc-800 mt-4">
                <div className="h-full bg-emerald-400" style={{ width: `${(todayXp / maxDailyXp) * 100}%` }} />
              </div>

              <div className="grid grid-cols-2 gap-2 mt-4">
                {checklistItems.map((item) => {
                  const Icon = item.icon;
                  const checked = selectedDay.checks?.[item.key];

                  return (
                    <button
                      key={item.key}
                      onClick={() => toggleCheck(item.key)}
                      className={`flex items-center gap-2 rounded-2xl border p-3 text-left transition min-h-[76px] ${
                        checked ? "bg-emerald-500/15 border-emerald-400/50" : "bg-black/30 border-zinc-800 hover:border-zinc-600"
                      }`}
                    >
                      <Icon className={`w-5 h-5 shrink-0 ${checked ? "text-emerald-300" : "text-zinc-400"}`} />
                      <div>
                        <p className="font-semibold text-sm leading-tight">{item.label}</p>
                        <p className="text-xs text-zinc-400">+{item.xp} XP</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="bg-zinc-950/80 border border-zinc-800 rounded-[1.75rem] p-4 md:p-5 space-y-4">
              <h2 className="text-xl font-black flex items-center gap-2"><Utensils className="text-emerald-300" /> Food + Body</h2>

              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <Input label="Today's Weight" value={selectedDay.weight || ""} onChange={(v) => updateDay({ weight: v })} />
                <Input label="Current Weight" value={data.profile.currentWeight} onChange={(v) => updateProfile("currentWeight", v)} />
                <Input label="Calories" value={data.profile.calorieTarget} onChange={(v) => updateProfile("calorieTarget", v)} />
                <Input label="Protein" value={data.profile.proteinTarget} onChange={(v) => updateProfile("proteinTarget", v)} />
                <Input label="Fiber" value={data.profile.fiberTarget} onChange={(v) => updateProfile("fiberTarget", v)} />
              </div>

              <textarea
                className="w-full bg-black border border-zinc-700 rounded-2xl p-3 min-h-20"
                placeholder="Breakfast plan/log"
                value={selectedDay.breakfast || ""}
                onChange={(e) => updateDay({ breakfast: e.target.value })}
              />

              <textarea
                className="w-full bg-black border border-zinc-700 rounded-2xl p-3 min-h-20"
                placeholder="Lunch plan/log"
                value={selectedDay.lunch || ""}
                onChange={(e) => updateDay({ lunch: e.target.value })}
              />

              <textarea
                className="w-full bg-black border border-zinc-700 rounded-2xl p-3 min-h-20"
                placeholder="One sentence journal"
                value={selectedDay.notes || ""}
                onChange={(e) => updateDay({ notes: e.target.value })}
              />
            </div>

            <div className="bg-zinc-950/80 border border-zinc-800 rounded-[1.75rem] p-4 md:p-5">
              <h2 className="text-xl font-black flex items-center gap-2 mb-4"><Trophy className="text-amber-300" /> Achievements</h2>
              <div className="grid sm:grid-cols-2 gap-2">
                {achievements.map((achievement) => {
                  const Icon = achievement.unlocked ? achievement.icon : Lock;
                  return (
                    <div
                      key={achievement.title}
                      className={`rounded-2xl border p-3 ${achievement.unlocked ? "border-amber-300/40 bg-amber-400/10" : "border-zinc-800 bg-black/25 opacity-70"}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl ${achievement.unlocked ? "bg-amber-300 text-black" : "bg-zinc-800 text-zinc-500"}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-bold">{achievement.title}</p>
                          <p className="text-xs text-zinc-400">{achievement.desc}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="grid grid-cols-2 gap-2 mt-4">
                <MiniStat icon={Martini} label="Dry Streak" value={`${noAlcoholStreak} days`} />
                <MiniStat icon={Dumbbell} label="Workout Streak" value={`${workoutStreak} days`} />
              </div>
            </div>
          </div>

          <div className="bg-zinc-950/80 border border-zinc-800 rounded-[1.75rem] p-4 md:p-5 shadow-2xl xl:order-1">
            <div className="flex items-center justify-between mb-4">
              <button className="p-2 rounded-xl bg-zinc-900 border border-zinc-800" onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))}>
                <ChevronLeft />
              </button>
              <div className="text-center">
                <h2 className="font-black text-xl md:text-2xl">
                  {calendarMonth.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
                </h2>
                <p className="text-xs text-zinc-500">Tap a day to log it</p>
              </div>
              <button className="p-2 rounded-xl bg-zinc-900 border border-zinc-800" onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))}>
                <ChevronRight />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1.5 md:gap-2 text-center text-[10px] uppercase tracking-widest text-zinc-500 mb-2">
              {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => <div key={`${d}-${i}`}>{d}</div>)}
            </div>

            <div className="grid grid-cols-7 gap-1.5 md:gap-2">
              {monthCells.map((day, i) => {
                if (!day) return <div key={i} />;

                const key = formatDate(day);
                const events = (data.events || []).filter((e) => e.date === key);
                const completed = checklistItems.filter((item) => data.days?.[key]?.checks?.[item.key]).length;
                const isToday = key === todayKey();
                const isSelected = selectedDate === key;

                return (
                  <button
                    key={key}
                    onClick={() => setSelectedDate(key)}
                    className={`min-h-[58px] md:min-h-[90px] rounded-2xl border p-2 text-left transition relative overflow-hidden ${
                      isSelected
                        ? "border-amber-300 bg-amber-300/10 shadow-lg shadow-amber-500/10"
                        : "border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800/80"
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <span className={`font-black text-sm ${isToday ? "text-amber-300" : "text-zinc-200"}`}>{day.getDate()}</span>
                      {completed > 0 && <span className="hidden md:inline text-[10px] text-emerald-300 bg-emerald-500/10 border border-emerald-400/20 px-1.5 rounded-full">{completed}/7</span>}
                    </div>

                    <div className="flex gap-1 mt-2 flex-wrap">
                      {completed > 0 && <span className="w-2 h-2 rounded-full bg-emerald-400" />}
                      {events.slice(0, 4).map((event) => (
                        <span key={event.id} className={`w-2 h-2 rounded-full ${eventTypes[event.type]?.dot || "bg-zinc-500"}`} />
                      ))}
                    </div>

                    <div className="hidden md:block mt-2 space-y-1">
                      {events.slice(0, 2).map((event) => (
                        <div
                          key={event.id}
                          className={`text-[10px] truncate rounded-lg border px-1.5 py-0.5 ${eventTypes[event.type]?.color || "border-zinc-700 bg-zinc-800"}`}
                        >
                          {event.title}
                        </div>
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mt-4 text-xs">
              {Object.entries(eventTypes).map(([key, type]) => (
                <div key={key} className="flex items-center gap-2 text-zinc-400">
                  <span className={`w-2.5 h-2.5 rounded-full ${type.dot}`} />
                  {type.label}
                </div>
              ))}
              <div className="flex items-center gap-2 text-zinc-400">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                Logged
              </div>
            </div>
          </div>
        </section>

        <section className="grid xl:grid-cols-[1fr] gap-4">
          <div className="bg-zinc-950/80 border border-zinc-800 rounded-[1.75rem] p-4 md:p-5 space-y-4">
            <h2 className="text-xl font-black flex items-center gap-2"><Utensils className="text-emerald-300" /> Food + Body</h2>

            <div className="grid md:grid-cols-3 gap-3">
              <Input label="Today's Weight" value={selectedDay.weight || ""} onChange={(v) => updateDay({ weight: v })} />
              <Input label="Current Weight" value={data.profile.currentWeight} onChange={(v) => updateProfile("currentWeight", v)} />
              <Input label="Calories" value={data.profile.calorieTarget} onChange={(v) => updateProfile("calorieTarget", v)} />
              <Input label="Protein" value={data.profile.proteinTarget} onChange={(v) => updateProfile("proteinTarget", v)} />
              <Input label="Fiber" value={data.profile.fiberTarget} onChange={(v) => updateProfile("fiberTarget", v)} />
            </div>

            <textarea
              className="w-full bg-black border border-zinc-700 rounded-2xl p-3 min-h-20"
              placeholder="Breakfast plan/log"
              value={selectedDay.breakfast || ""}
              onChange={(e) => updateDay({ breakfast: e.target.value })}
            />

            <textarea
              className="w-full bg-black border border-zinc-700 rounded-2xl p-3 min-h-20"
              placeholder="Lunch plan/log"
              value={selectedDay.lunch || ""}
              onChange={(e) => updateDay({ lunch: e.target.value })}
            />

            <textarea
              className="w-full bg-black border border-zinc-700 rounded-2xl p-3 min-h-20"
              placeholder="One sentence journal"
              value={selectedDay.notes || ""}
              onChange={(e) => updateDay({ notes: e.target.value })}
            />
          </div>

          <div className="bg-zinc-950/80 border border-zinc-800 rounded-[1.75rem] p-4 md:p-5 space-y-4">
            <h2 className="text-xl font-black flex items-center gap-2">
              <CalendarDays className="text-blue-300" /> Calendar Events
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
              <button onClick={addEvent} className="bg-amber-300 text-black rounded-xl px-4 py-2 font-bold flex items-center justify-center gap-2">
                <Save className="w-4 h-4" /> Add
              </button>
            </div>

            <div className="space-y-2">
              {(data.events || []).filter((e) => e.date === selectedDate).map((event) => {
                const type = eventTypes[event.type];
                const Icon = type?.icon || CalendarDays;
                return (
                  <div key={event.id} className={`rounded-2xl border p-3 flex justify-between ${type?.color || "border-zinc-700 bg-zinc-800"}`}>
                    <div className="flex items-center gap-3">
                      <Icon className="w-4 h-4" />
                      <div>
                        <p className="font-bold">{event.title}</p>
                        <p className="text-xs opacity-80">{type?.label} {event.time && `· ${event.time}`}</p>
                      </div>
                    </div>
                    <button onClick={() => deleteEvent(event.id)}>
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
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

function MiniStat({ icon: Icon, label, value }) {
  return (
    <div className="bg-black/30 border border-zinc-800 rounded-2xl p-3 flex items-center gap-3">
      <Icon className="w-5 h-5 text-amber-300" />
      <div>
        <p className="text-xs text-zinc-500 uppercase tracking-widest">{label}</p>
        <p className="font-black">{value}</p>
      </div>
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
