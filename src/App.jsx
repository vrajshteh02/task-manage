import React, { useState, useEffect, useMemo } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Plus,
  Trash2,
  Edit,
  Calendar as CalendarIcon,
  Users,
  LayoutDashboard,
  BarChart3,
  Search,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  UserPlus,
  Moon,
  Sun,
  X,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Briefcase,
} from "lucide-react";

// Import Firebase connection
import { db } from "@/lib/firebase";
import {
  collection,
  onSnapshot,
  doc,
  setDoc,
  deleteDoc,
} from "firebase/firestore";

// Local date formatting utility
const formatDateLocal = (year, month, day) => {
  const m = String(month + 1).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  return `${year}-${m}-${d}`;
};

const getMonthGrid = (year, month) => {
  const firstDay = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();

  const grid = [];
  for (let i = 0; i < firstDay; i++) grid.push(null);
  for (let d = 1; d <= totalDays; d++) {
    grid.push(formatDateLocal(year, month, d));
  }
  return grid;
};



export default function TaskBoard() {
  const today = new Date();
  const todayStr = formatDateLocal(today.getFullYear(), today.getMonth(), today.getDate());

  // App Theme & Navigation State
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [activeTab, setActiveTab] = useState("board"); // board, team, calendar, analytics
  const [currentRole, setCurrentRole] = useState(null); // null, 'admin', or member ID (number)

  // Login Panel / Lock Screen Input States
  const [passcodeAttempt, setPasscodeAttempt] = useState("");
  const [loginError, setLoginError] = useState("");
  const [selectedMemberLogin, setSelectedMemberLogin] = useState("");
  const [selectedRoleType, setSelectedRoleType] = useState("member"); // 'member' or 'admin'


  // Core Data States
  const [tasks, setTasks] = useState(() => {
    const saved = localStorage.getItem("tasks");
    return saved ? JSON.parse(saved) : [];
  });
  const [members, setMembers] = useState(() => {
    const saved = localStorage.getItem("members");
    return saved ? JSON.parse(saved) : [];
  });

  // Input States for New Task Creation
  const [taskInput, setTaskInput] = useState("");
  const [detailInput, setDetailInput] = useState("");
  const [memberSelect, setMemberSelect] = useState("");
  const [prioritySelect, setPrioritySelect] = useState("Medium");
  const [deadline, setDeadline] = useState("");

  // Input States for Member Creation
  const [memberNameInput, setMemberNameInput] = useState("");
  const [memberRoleInput, setMemberRoleInput] = useState("");

  // Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMember, setFilterMember] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  // Interaction / Modal States
  const [selectedDate, setSelectedDate] = useState(null);
  const [editingTask, setEditingTask] = useState(null);
  const [activeDragId, setActiveDragId] = useState(null);
  const [dragOverColumn, setDragOverColumn] = useState(null);
  const [dragOverMemberId, setDragOverMemberId] = useState(null);

  // Calendar State
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  // Determine if Firebase is active
  const isFirebaseActive = useMemo(() => {
    return (
      import.meta.env.VITE_FIREBASE_API_KEY &&
      import.meta.env.VITE_FIREBASE_API_KEY !== "YOUR_API_KEY_HERE" &&
      import.meta.env.VITE_FIREBASE_PROJECT_ID &&
      import.meta.env.VITE_FIREBASE_PROJECT_ID !== "YOUR_PROJECT_ID_HERE"
    );
  }, []);

  // Syncing with Database / Storage
  useEffect(() => {
    if (!isFirebaseActive) {
      // Local Fallback Storage Sync
      localStorage.setItem("tasks", JSON.stringify(tasks));
      return;
    }

    // Subscribe to Live Cloud Firestore Tasks
    const unsubscribe = onSnapshot(collection(db, "tasks"), (snapshot) => {
      const list = [];
      snapshot.forEach(doc => {
        list.push(doc.data());
      });
      setTasks(list);
    });

    return () => unsubscribe();
  }, [isFirebaseActive]);

  useEffect(() => {
    if (!isFirebaseActive) {
      // Local Fallback Storage Sync
      localStorage.setItem("members", JSON.stringify(members));
      return;
    }

    // Subscribe to Live Cloud Firestore Members
    const unsubscribe = onSnapshot(collection(db, "members"), (snapshot) => {
      const list = [];
      snapshot.forEach(doc => {
        list.push(doc.data());
      });
      setMembers(list);
    });

    return () => unsubscribe();
  }, [isFirebaseActive]);

  // Sync theme
  useEffect(() => {
    const root = document.documentElement;
    if (isDarkMode) {
      root.classList.remove("light");
    } else {
      root.classList.add("light");
    }
  }, [isDarkMode]);

  // Statistics Calculations
  const stats = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter(t => t.status === "Completed").length;
    const pending = tasks.filter(t => t.status === "Pending").length;
    const progress = tasks.filter(t => t.status === "In Progress").length;
    const review = tasks.filter(t => t.status === "In Review").length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    // Overdue calculations
    const overdue = tasks.filter(t => {
      if (!t.deadline || t.status === "Completed") return false;
      return new Date(t.deadline) < new Date(todayStr);
    }).length;

    return { total, completed, pending, progress, review, completionRate, overdue };
  }, [tasks, todayStr]);

  const getMemberDetails = (id) => {
    return members.find(x => x.id == id) || null;
  };

  const getPriorityColor = (p) => {
    switch (p) {
      case "High": return "bg-rose-500/10 text-rose-400 border border-rose-500/20";
      case "Medium": return "bg-amber-500/10 text-amber-400 border border-amber-500/20";
      case "Low": return "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20";
      default: return "bg-slate-500/10 text-slate-400 border border-slate-500/20";
    }
  };

  const getStatusColorBadge = (status) => {
    switch (status) {
      case "Pending": return "bg-slate-500/20 text-slate-400";
      case "In Progress": return "bg-blue-500/20 text-blue-400";
      case "In Review": return "bg-amber-500/20 text-amber-400";
      case "Completed": return "bg-emerald-500/20 text-emerald-400";
      default: return "bg-slate-500/20 text-slate-400";
    }
  };

  // Authenticate admin portal access
  const handleAdminLogin = () => {
    const defaultCode = import.meta.env.VITE_ADMIN_PASSCODE || "admin123";
    if (passcodeAttempt === defaultCode) {
      setCurrentRole("admin");
      setPasscodeAttempt("");
      setLoginError("");
    } else {
      setLoginError("Access Denied: Incorrect passcode.");
    }
  };

  // Add Task
  const handleAddTask = async (e) => {
    e.preventDefault();
    if (!taskInput.trim()) return;

    const newTask = {
      id: Date.now(),
      title: taskInput.trim(),
      detail: detailInput.trim() || "No extra details provided.",
      assignedTo: memberSelect ? Number(memberSelect) : null,
      status: "Pending",
      priority: prioritySelect,
      deadline: deadline || todayStr
    };

    if (isFirebaseActive) {
      await setDoc(doc(db, "tasks", String(newTask.id)), newTask);
    } else {
      setTasks(prev => [...prev, newTask]);
    }

    setTaskInput("");
    setDetailInput("");
    setMemberSelect("");
    setPrioritySelect("Medium");
    setDeadline("");
  };

  // Delete Task
  const handleDeleteTask = async (id) => {
    if (currentRole !== "admin") {
      alert("Portal Access Restricted: Only the Team Leader can delete tasks.");
      return;
    }
    if (confirm("Are you sure you want to delete this task?")) {
      if (isFirebaseActive) {
        await deleteDoc(doc(db, "tasks", String(id)));
      } else {
        setTasks(prev => prev.filter(t => t.id !== id));
      }
      if (editingTask && editingTask.id === id) setEditingTask(null);
    }
  };

  // Edit Task Action
  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingTask.title.trim()) return;

    const updatedTask = {
      ...editingTask,
      assignedTo: editingTask.assignedTo ? Number(editingTask.assignedTo) : null
    };

    if (isFirebaseActive) {
      await setDoc(doc(db, "tasks", String(updatedTask.id)), updatedTask);
    } else {
      setTasks(prev => prev.map(t => t.id === editingTask.id ? updatedTask : t));
    }
    setEditingTask(null);
  };

  // Add Team Member
  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!memberNameInput.trim()) return;

    const colors = [
      "from-pink-500 to-rose-600",
      "from-purple-500 to-indigo-600",
      "from-blue-500 to-cyan-600",
      "from-emerald-500 to-teal-600",
      "from-amber-500 to-orange-600",
      "from-fuchsia-500 to-purple-600"
    ];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];

    const newMember = {
      id: Date.now(),
      name: memberNameInput.trim(),
      role: memberRoleInput.trim() || "Team Contributor",
      color: randomColor
    };

    if (isFirebaseActive) {
      await setDoc(doc(db, "members", String(newMember.id)), newMember);
    } else {
      setMembers(prev => [...prev, newMember]);
    }

    setMemberNameInput("");
    setMemberRoleInput("");
  };

  // Delete Member
  const handleDeleteMember = async (id) => {
    if (currentRole !== "admin") {
      alert("Portal Access Restricted: Only the Team Leader can delete members.");
      return;
    }
    if (confirm("Deleting this member will return their assigned tasks to the Unassigned Pool. Continue?")) {
      if (isFirebaseActive) {
        // Delete member document
        await deleteDoc(doc(db, "members", String(id)));
        // Reassign all member's tasks to unassigned in Firestore
        const affectedTasks = tasks.filter(t => t.assignedTo == id);
        affectedTasks.forEach(async (t) => {
          await setDoc(doc(db, "tasks", String(t.id)), { ...t, assignedTo: null });
        });
      } else {
        setMembers(prev => prev.filter(m => m.id !== id));
        setTasks(prev => prev.map(t => t.assignedTo == id ? { ...t, assignedTo: null } : t));
      }
    }
  };

  // Clear all tasks and members
  const handleClearAllData = async () => {
    if (confirm("This will permanently clear all tasks and members from the dashboard. Continue?")) {
      if (isFirebaseActive) {
        // Clean up current Firestore tasks
        tasks.forEach(async (t) => {
          await deleteDoc(doc(db, "tasks", String(t.id)));
        });
        // Clean up current Firestore members
        members.forEach(async (m) => {
          await deleteDoc(doc(db, "members", String(m.id)));
        });
      } else {
        setTasks([]);
        setMembers([]);
        localStorage.removeItem("tasks");
        localStorage.removeItem("members");
      }
    }
  };

  // Drag and Drop implementation
  const handleDragStart = (e, taskId) => {
    e.dataTransfer.setData("taskId", taskId);
    setActiveDragId(taskId);
  };

  const handleDragEnd = () => {
    setActiveDragId(null);
    setDragOverColumn(null);
    setDragOverMemberId(null);
  };

  const handleDropToColumn = async (e, targetStatus) => {
    e.preventDefault();
    const taskId = Number(e.dataTransfer.getData("taskId"));
    if (taskId) {
      if (isFirebaseActive) {
        const t = tasks.find(x => x.id == taskId);
        if (t) {
          await setDoc(doc(db, "tasks", String(taskId)), { ...t, status: targetStatus });
        }
      } else {
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: targetStatus } : t));
      }
    }
    handleDragEnd();
  };

  const handleDropToMember = async (e, memberId) => {
    e.preventDefault();
    const taskId = Number(e.dataTransfer.getData("taskId"));
    if (taskId) {
      if (isFirebaseActive) {
        const t = tasks.find(x => x.id == taskId);
        if (t) {
          await setDoc(doc(db, "tasks", String(taskId)), { ...t, assignedTo: memberId });
        }
      } else {
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, assignedTo: memberId } : t));
      }
    }
    handleDragEnd();
  };

  // Calendar utility calculations
  const monthGrid = getMonthGrid(year, month);
  const tasksByDate = useMemo(() => {
    const map = {};
    tasks.forEach(t => {
      if (!t.deadline) return;
      if (!map[t.deadline]) map[t.deadline] = [];
      map[t.deadline].push(t);
    });
    return map;
  }, [tasks]);

  const changeMonth = (dir) => {
    let newMonth = month + dir;
    let newYear = year;
    if (newMonth < 0) { newMonth = 11; newYear--; }
    if (newMonth > 11) { newMonth = 0; newYear++; }
    setMonth(newMonth);
    setYear(newYear);
  };

  const getMonthName = (m) => {
    return new Date(2026, m, 1).toLocaleString('default', { month: 'long' });
  };

  // Filter Tasks list dynamically
  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
      // If a member portal is active, they only see tasks assigned to them
      const matchPortal = currentRole === "admin" ? true : t.assignedTo == currentRole;
      if (!matchPortal) return false;

      const matchSearch = (t.title || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.detail || "").toLowerCase().includes(searchQuery.toLowerCase());
      const matchMember = filterMember === "all" ? true :
        filterMember === "unassigned" ? (t.assignedTo == null) :
          t.assignedTo == filterMember;
      const matchPriority = filterPriority === "all" ? true : t.priority === filterPriority;
      const matchStatus = filterStatus === "all" ? true : t.status === filterStatus;

      return matchSearch && matchMember && matchPriority && matchStatus;
    });
  }, [tasks, searchQuery, filterMember, filterPriority, filterStatus, currentRole]);

  // Board display split columns
  const columns = ["Pending", "In Progress", "In Review", "Completed"];

  if (currentRole === null) {
    return (
      <div className={`min-h-screen flex items-center justify-center p-6 transition-colors duration-300 font-sans relative overflow-hidden ${isDarkMode ? "bg-[#09090b] text-foreground" : "bg-slate-50 text-slate-900"}`}>
        
        {/* Glow Effects */}
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-purple-500/10 rounded-full filter blur-[120px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-indigo-500/10 rounded-full filter blur-[120px] pointer-events-none" />
        
        {/* Sign In Container */}
        <div className="w-full max-w-[440px] glass border border-border/40 rounded-3xl p-8 relative shadow-2xl space-y-6">
          
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="inline-flex p-3 bg-purple-500/10 text-purple-400 rounded-2xl animate-pulse">
              <Sparkles className="size-6" />
            </div>
            <h2 className="text-xl font-bold tracking-tight">Access Workspace Portal</h2>
            <p className="text-xs text-muted-foreground">Select your entry role type to access the workspace board.</p>
          </div>

          {/* Segment Selector for Role Type */}
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-secondary/40 rounded-2xl border border-border/20">
            <button
              onClick={() => {
                setSelectedRoleType("member");
                setLoginError("");
              }}
              className={`py-2 rounded-xl text-xs font-semibold tracking-wide transition-all ${
                selectedRoleType === "member"
                  ? "bg-purple-600 text-white shadow-lg shadow-purple-600/15"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Team Member
            </button>
            <button
              onClick={() => {
                setSelectedRoleType("admin");
                setLoginError("");
              }}
              className={`py-2 rounded-xl text-xs font-semibold tracking-wide transition-all ${
                selectedRoleType === "admin"
                  ? "bg-purple-600 text-white shadow-lg shadow-purple-600/15"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Leader (Admin)
            </button>
          </div>

          {/* Tab Content: Team Member Portal */}
          {selectedRoleType === "member" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Choose Your Account</label>
                <select
                  value={selectedMemberLogin}
                  onChange={(e) => {
                    setSelectedMemberLogin(e.target.value);
                    setLoginError("");
                  }}
                  className="w-full bg-secondary/50 border border-border/30 rounded-xl px-4 py-3 text-sm text-foreground font-medium outline-none focus:border-purple-500/50 transition-colors cursor-pointer"
                >
                  <option value="">Select your name...</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.role})
                    </option>
                  ))}
                </select>
              </div>

              {members.length === 0 ? (
                <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-center space-y-1.5 animate-fade-in">
                  <p className="text-[11px] text-amber-400 font-semibold leading-relaxed">
                    No active team members are registered in the roster yet.
                  </p>
                  <p className="text-[9px] text-muted-foreground">
                    Please log in as the Team Leader (Admin) to configure your team roster.
                  </p>
                </div>
              ) : (
                <Button
                  onClick={() => {
                    if (!selectedMemberLogin) {
                      setLoginError("Please choose a member account first.");
                      return;
                    }
                    setCurrentRole(Number(selectedMemberLogin));
                    setLoginError("");
                  }}
                  className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs tracking-wider uppercase py-3.5 rounded-xl shadow-lg shadow-purple-600/15 hover:shadow-purple-600/20 active:scale-[0.99] transition-all flex items-center justify-center gap-2"
                >
                  Enter Portal <ArrowRight className="size-4" />
                </Button>
              )}
            </div>
          )}

          {/* Tab Content: Team Leader (Admin) Portal */}
          {selectedRoleType === "admin" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Admin Access Passcode</label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={passcodeAttempt}
                  onChange={(e) => {
                    setPasscodeAttempt(e.target.value);
                    setLoginError("");
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAdminLogin();
                  }}
                  className="w-full bg-secondary/50 border border-border/30 rounded-xl px-4 py-3 text-sm text-foreground outline-none focus:border-purple-500/50 transition-colors"
                />
              </div>

              <Button
                onClick={handleAdminLogin}
                className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs tracking-wider uppercase py-3.5 rounded-xl shadow-lg shadow-purple-600/15 hover:shadow-purple-600/20 active:scale-[0.99] transition-all flex items-center justify-center gap-2"
              >
                Authenticate & Enter <ArrowRight className="size-4" />
              </Button>
            </div>
          )}

          {/* Error Message */}
          {loginError && (
            <div className="p-3 bg-rose-500/15 border border-rose-500/20 text-rose-400 text-xs rounded-xl font-medium text-center animate-shake">
              {loginError}
            </div>
          )}

          {/* Quick Helper Tip */}
          <div className="pt-4 border-t border-border/10 text-center text-[10px] text-muted-foreground flex justify-between items-center px-1">
            <span>Passcode: <code>admin123</code></span>
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="hover:text-foreground transition-colors flex items-center gap-1 font-semibold"
            >
              {isDarkMode ? <Sun className="size-3" /> : <Moon className="size-3" />}
              {isDarkMode ? "Light Mode" : "Dark Mode"}
            </button>
          </div>

        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300 font-sans">

      {/* Dynamic Warning Banner for Local Offline Mode */}
      {!isFirebaseActive && (
        <div className="bg-gradient-to-r from-amber-600 to-orange-500 text-white text-xs py-2.5 px-4 text-center font-bold flex items-center justify-center gap-2 relative shadow-md">
          <AlertTriangle className="size-4 animate-bounce" />
          <span>📡 Running in Local Cache Mode. Paste your Firebase credentials into the <code>.env</code> file in your IDE to go multiplayer live!</span>
          <button
            onClick={() => alert("Check the instructions inside the 'implementation_plan.md' file inside your IDE to find where to get your Firebase Console credentials.")}
            className="underline hover:text-amber-100 ml-1.5"
          >
            How to set up?
          </button>
        </div>
      )}

      {/* Dynamic Header */}
      <header className="border-b border-border/40 backdrop-blur-md sticky top-0 z-40 bg-card/85">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-tr from-purple-500 to-indigo-600 p-2 rounded-xl text-white shadow-lg shadow-purple-500/20">
              <Sparkles className="size-5 animate-pulse" />
            </div>
            <div>
              <h1 className="font-extrabold tracking-tight text-lg flex items-center gap-2">
                Velocity<span className="text-purple-400 font-medium text-sm px-2 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/20">Task.JS</span>
              </h1>
            </div>
          </div>

          {/* Tab Navigation Menu */}
          <nav className="hidden md:flex items-center bg-secondary/60 p-1 rounded-xl border border-border/30">
            {[
              { id: "board", label: "Dashboard Board", icon: LayoutDashboard },
              { id: "team", label: "Team Members", icon: Users },
              { id: "calendar", label: "Monthly Calendar", icon: CalendarIcon },
              { id: "analytics", label: "Reports & Analytics", icon: BarChart3 },
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${isActive
                    ? "bg-primary text-primary-foreground shadow-lg shadow-purple-600/20"
                    : "text-muted-foreground hover:text-foreground"
                    }`}
                >
                  <Icon className="size-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>

          <div className="flex items-center gap-3">
            {/* Active User Badge & Lock Screen Trigger */}
            <div className="flex items-center gap-3 bg-secondary/60 pl-3 pr-1.5 py-1 rounded-xl border border-border/20">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500"></span>
                </span>
                <span className="text-[11px] font-bold text-foreground">
                  {currentRole === "admin" ? (
                    "Leader (Admin)"
                  ) : (
                    members.find(m => m.id == currentRole)?.name || "Team Member"
                  )}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentRole(null)}
                className="h-7 px-2.5 rounded-lg text-[9px] font-bold uppercase tracking-wider bg-background hover:bg-secondary text-muted-foreground hover:text-foreground flex items-center gap-1 border border-border/10"
                title="Lock Workspace / Switch Portal"
              >
                Switch Portal
              </Button>
            </div>

            {/* Clear Board Button */}
            {/* <Button
              variant="outline"
              size="sm"
              onClick={handleClearAllData}
              className="text-xs border-dashed text-purple-400 border-purple-500/30 hover:bg-purple-500/10"
            >
              Clear Board Data
            </Button> */}

            {/* Dark Mode Toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="rounded-full text-muted-foreground hover:text-foreground"
            >
              {isDarkMode ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </Button>
          </div>
        </div>

        {/* Mobile Nav */}
        <div className="md:hidden flex border-t border-border/40 justify-around bg-card py-2">
          {[
            { id: "board", label: "Board", icon: LayoutDashboard },
            { id: "team", label: "Team", icon: Users },
            { id: "calendar", label: "Calendar", icon: CalendarIcon },
            { id: "analytics", label: "Reports", icon: BarChart3 },
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-col items-center gap-1 text-[10px] py-1 px-3 rounded-lg ${isActive ? "text-purple-400 font-bold" : "text-muted-foreground"
                  }`}
              >
                <Icon className="size-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </header>

      {/* Main Content Layout */}
      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">

        {/* Statistics Widgets Banner */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="glass relative overflow-hidden group hover:scale-[1.01] transition-transform duration-200">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Active Tasks</p>
                <h3 className="text-2xl font-bold mt-1">{stats.total}</h3>
              </div>
              <div className="p-3 bg-purple-500/10 text-purple-400 rounded-xl">
                <Briefcase className="size-5" />
              </div>
            </CardContent>
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 to-indigo-600 opacity-60" />
          </Card>

          <Card className="glass relative overflow-hidden group hover:scale-[1.01] transition-transform duration-200">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Task Completion</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <h3 className="text-2xl font-bold">{stats.completionRate}%</h3>
                  <span className="text-[10px] text-emerald-400 font-medium flex items-center gap-0.5">
                    <TrendingUp className="size-3" /> +4.2%
                  </span>
                </div>
              </div>
              <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl">
                <CheckCircle2 className="size-5" />
              </div>
            </CardContent>
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500 opacity-60" />
          </Card>

          <Card className="glass relative overflow-hidden group hover:scale-[1.01] transition-transform duration-200">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">In Progress & Review</p>
                <h3 className="text-2xl font-bold mt-1">{stats.progress + stats.review}</h3>
              </div>
              <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl">
                <Clock className="size-5" />
              </div>
            </CardContent>
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-cyan-500 opacity-60" />
          </Card>

          <Card className={`glass relative overflow-hidden group hover:scale-[1.01] transition-transform duration-200 ${stats.overdue > 0 ? 'ring-1 ring-rose-500/30' : ''}`}>
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Overdue Alerts</p>
                <h3 className={`text-2xl font-bold mt-1 ${stats.overdue > 0 ? 'text-rose-400' : ''}`}>{stats.overdue}</h3>
              </div>
              <div className={`p-3 rounded-xl ${stats.overdue > 0 ? 'bg-rose-500/15 text-rose-400' : 'bg-slate-500/10 text-slate-400'}`}>
                <AlertTriangle className="size-5" />
              </div>
            </CardContent>
            <div className={`absolute bottom-0 left-0 right-0 h-1 ${stats.overdue > 0 ? 'bg-rose-500' : 'bg-slate-500/40'}`} />
          </Card>
        </div>

        {/* ----------------- TAB: KANBAN BOARD ----------------- */}
        {activeTab === "board" && (
          <div className="space-y-6">

            {/* Quick Controls Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

              {currentRole === "admin" ? (
                /* Leader Task Form */
                <Card className="glass lg:col-span-1 border border-border/30">
                  <CardHeader className="pb-3 border-b border-border/20">
                    <CardTitle className="text-md font-bold flex items-center gap-2">
                      <Sparkles className="size-4 text-purple-400" /> Lead Task Dispatcher
                    </CardTitle>
                    <CardDescription className="text-xs">Create and dispatch tasks to specific members</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-4 p-5">
                    <form onSubmit={handleAddTask} className="space-y-4">
                      <div>
                        <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">Task Title</label>
                        <Input
                          placeholder="e.g. Design Login Form"
                          value={taskInput}
                          onChange={e => setTaskInput(e.target.value)}
                          className="bg-secondary/40 border-border/40 focus:bg-secondary/20"
                          required
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">Description / Details</label>
                        <textarea
                          placeholder="Add specific requirements or details..."
                          value={detailInput}
                          onChange={e => setDetailInput(e.target.value)}
                          className="w-full h-20 rounded-lg border border-input bg-secondary/40 px-3 py-1.5 text-sm transition-all focus-visible:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary/20 outline-none resize-none focus:bg-secondary/20"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">Assignee</label>
                          <select
                            value={memberSelect}
                            onChange={e => setMemberSelect(e.target.value)}
                            className="w-full h-9 rounded-lg border border-input bg-secondary text-sm px-2 text-foreground focus-visible:ring-2 focus-visible:ring-primary/20 outline-none"
                          >
                            <option value="">Unassigned Pool</option>
                            {members.map(m => (
                              <option key={m.id} value={m.id}>{m.name}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">Priority</label>
                          <select
                            value={prioritySelect}
                            onChange={e => setPrioritySelect(e.target.value)}
                            className="w-full h-9 rounded-lg border border-input bg-secondary text-sm px-2 text-foreground focus-visible:ring-2 focus-visible:ring-primary/20 outline-none"
                          >
                            <option value="Low">Low</option>
                            <option value="Medium">Medium</option>
                            <option value="High">High</option>
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">Due Deadline</label>
                        <Input
                          type="date"
                          value={deadline}
                          onChange={e => setDeadline(e.target.value)}
                          className="bg-secondary/40 border-border/40 focus:bg-secondary/20"
                        />
                      </div>
                      <Button type="submit" className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-lg py-2 flex items-center justify-center gap-1">
                        <Plus className="size-4" /> Dispatch Task
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              ) : (
                /* Member Profile Overview Card */
                <Card className="glass lg:col-span-1 border border-border/30 overflow-hidden relative">
                  <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                    <Sparkles className="size-36 text-purple-400" />
                  </div>
                  <CardHeader className="pb-3 border-b border-border/20 bg-purple-500/5">
                    <div className="flex items-center gap-3">
                      <div className={`size-10 rounded-xl bg-gradient-to-tr ${getMemberDetails(currentRole)?.color || 'from-purple-500 to-indigo-600'} text-white flex items-center justify-center font-bold text-sm shadow-md`}>
                        {getMemberDetails(currentRole)?.name.split(" ").map(w => w[0]).join("")}
                      </div>
                      <div>
                        <CardTitle className="text-md font-bold text-foreground">
                          {getMemberDetails(currentRole)?.name}
                        </CardTitle>
                        <CardDescription className="text-xs text-purple-400 font-medium">
                          {getMemberDetails(currentRole)?.role}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-5 p-5 space-y-4">
                    <div className="p-3.5 bg-secondary/35 rounded-xl border border-border/10">
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Welcome to your personal workspace portal. You are logged in with **View & Status Update** access. You can update the progress of your assigned tasks.
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-center">
                      <div className="p-3 bg-secondary/20 rounded-xl border border-border/10">
                        <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">My Active Tasks</span>
                        <h4 className="text-xl font-extrabold mt-1 text-foreground">
                          {tasks.filter(t => t.assignedTo == currentRole && t.status !== "Completed").length}
                        </h4>
                      </div>
                      <div className="p-3 bg-secondary/20 rounded-xl border border-border/10">
                        <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Completed</span>
                        <h4 className="text-xl font-extrabold mt-1 text-emerald-400">
                          {tasks.filter(t => t.assignedTo == currentRole && t.status === "Completed").length}
                        </h4>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] font-bold text-muted-foreground uppercase">
                        <span>Personal Progress</span>
                        <span className="text-purple-400">
                          {tasks.filter(t => t.assignedTo == currentRole).length > 0
                            ? Math.round((tasks.filter(t => t.assignedTo == currentRole && t.status === "Completed").length / tasks.filter(t => t.assignedTo == currentRole).length) * 100)
                            : 0}%
                        </span>
                      </div>
                      <div className="w-full h-2 bg-secondary/40 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-purple-500 rounded-full"
                          style={{
                            width: `${tasks.filter(t => t.assignedTo == currentRole).length > 0
                              ? Math.round((tasks.filter(t => t.assignedTo == currentRole && t.status === "Completed").length / tasks.filter(t => t.assignedTo == currentRole).length) * 100)
                              : 0}%`
                          }}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Dynamic Task Filters Panel */}
              <Card className="glass lg:col-span-2 border border-border/30">
                <CardHeader className="pb-3 border-b border-border/20">
                  <CardTitle className="text-md font-bold flex items-center gap-2">
                    <Search className="size-4 text-purple-400" /> Filter & Search Board
                  </CardTitle>
                  <CardDescription className="text-xs">Locate specific tasks and refine display</CardDescription>
                </CardHeader>
                <CardContent className="pt-4 p-5 space-y-4">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                      <Input
                        placeholder="Search by keywords..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="pl-9 bg-secondary/40 border-border/40"
                      />
                    </div>
                    {searchQuery && (
                      <Button variant="ghost" onClick={() => setSearchQuery("")} className="px-2">
                        Clear
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">By Assignee</label>
                      <select
                        value={filterMember}
                        onChange={e => setFilterMember(e.target.value)}
                        className="w-full h-9 rounded-lg border border-input bg-secondary text-xs px-2 text-foreground outline-none"
                      >
                        <option value="all">All Members</option>
                        <option value="unassigned">Unassigned Pool</option>
                        {members.map(m => (
                          <option key={m.id} value={m.id}>{m.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">By Priority</label>
                      <select
                        value={filterPriority}
                        onChange={e => setFilterPriority(e.target.value)}
                        className="w-full h-9 rounded-lg border border-input bg-secondary text-xs px-2 text-foreground outline-none"
                      >
                        <option value="all">All Priorities</option>
                        <option value="Low">Low</option>
                        <option value="Medium">Medium</option>
                        <option value="High">High</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">By Status</label>
                      <select
                        value={filterStatus}
                        onChange={e => setFilterStatus(e.target.value)}
                        className="w-full h-9 rounded-lg border border-input bg-secondary text-xs px-2 text-foreground outline-none"
                      >
                        <option value="all">All Statuses</option>
                        {columns.map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Drag drop hint banner */}
                  <div className="rounded-xl border border-dashed border-border p-3 bg-secondary/20 flex items-center justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="size-3.5 text-purple-400" />
                      Drag cards and drop on Kanban status columns to update instantly.
                    </span>
                    {(filterMember !== "all" || filterPriority !== "all" || filterStatus !== "all" || searchQuery !== "") && (
                      <button
                        onClick={() => {
                          setFilterMember("all");
                          setFilterPriority("all");
                          setFilterStatus("all");
                          setSearchQuery("");
                        }}
                        className="text-purple-400 hover:underline font-medium"
                      >
                        Reset Filters
                      </button>
                    )}
                  </div>
                </CardContent>
              </Card>

            </div>

            {/* Kanban Columns Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              {columns.map(status => {
                const columnTasks = filteredTasks.filter(t => t.status === status);
                const isOver = dragOverColumn === status;

                return (
                  <div
                    key={status}
                    onDragOver={e => {
                      e.preventDefault();
                      setDragOverColumn(status);
                    }}
                    onDragLeave={() => setDragOverColumn(null)}
                    onDrop={e => handleDropToColumn(e, status)}
                    className={`flex flex-col rounded-2xl p-4 transition-all duration-200 min-h-[450px] ${isOver
                      ? "bg-purple-900/10 border-2 border-dashed border-purple-500/50 scale-[1.01]"
                      : "bg-secondary/40 border border-border/40"
                      }`}
                  >

                    {/* Column Header */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${status === "Pending" ? "bg-slate-400" :
                          status === "In Progress" ? "bg-blue-500" :
                            status === "In Review" ? "bg-amber-500" : "bg-emerald-500"
                          }`} />
                        <h4 className="font-bold text-sm">{status}</h4>
                      </div>
                      <span className="text-xs px-2 py-0.5 rounded-md bg-secondary/80 font-bold">
                        {columnTasks.length}
                      </span>
                    </div>

                    {/* Task list */}
                    <div className="flex-1 space-y-3.5 overflow-y-auto">
                      {columnTasks.length === 0 ? (
                        <div className="h-full flex items-center justify-center border border-dashed border-border/10 rounded-xl p-6 text-center text-xs text-muted-foreground">
                          Drop tasks here
                        </div>
                      ) : (
                        columnTasks.map(t => {
                          const assignee = getMemberDetails(t.assignedTo);
                          const isBeingDragged = activeDragId === t.id;

                          return (
                            <div
                              key={t.id}
                              draggable
                              onDragStart={e => handleDragStart(e, t.id)}
                              onDragEnd={handleDragEnd}
                              className={`p-4 rounded-xl glass hover:border-border/60 hover:shadow-lg transition-all duration-200 cursor-grab active:cursor-grabbing border border-border/30 relative flex flex-col justify-between gap-3 ${t.status === "Pending" ? "status-pending" :
                                t.status === "In Progress" ? "status-inprogress" :
                                  t.status === "In Review" ? "status-underreview" : "status-completed"
                                } ${isBeingDragged ? "opacity-35 scale-95" : ""}`}
                            >

                              {/* Task Card Header */}
                              <div>
                                <div className="flex items-start justify-between gap-2">
                                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${getPriorityColor(t.priority)}`}>
                                    {t.priority}
                                  </span>
                                  <div className="flex items-center gap-1.5 opacity-100 transition-opacity">
                                    <button
                                      onClick={() => setEditingTask(t)}
                                      className="p-1 hover:bg-secondary rounded text-muted-foreground hover:text-foreground"
                                      title={currentRole === "admin" ? "Edit Task" : "View / Update Status"}
                                    >
                                      <Edit className="size-3.5" />
                                    </button>
                                    {currentRole === "admin" && (
                                      <button
                                        onClick={() => handleDeleteTask(t.id)}
                                        className="p-1 hover:bg-rose-500/10 rounded text-muted-foreground hover:text-rose-400"
                                        title="Delete Task"
                                      >
                                        <Trash2 className="size-3.5" />
                                      </button>
                                    )}
                                  </div>
                                </div>
                                <h5 className="font-bold text-sm mt-2 text-foreground tracking-tight leading-tight line-clamp-1">
                                  {t.title}
                                </h5>
                                <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                                  {t.detail}
                                </p>
                              </div>

                              {/* Task Card Footer */}
                              <div className="flex items-center justify-between border-t border-border/10 pt-2.5 mt-1 text-[11px]">
                                <div className="flex items-center gap-1 text-muted-foreground">
                                  <CalendarIcon className="size-3 text-purple-400/70" />
                                  <span className={new Date(t.deadline) < new Date(todayStr) && t.status !== "Completed" ? "text-rose-400 font-bold" : ""}>
                                    {t.deadline === todayStr ? "Today" : t.deadline}
                                  </span>
                                </div>

                                {/* Assignee Bubble */}
                                {assignee ? (
                                  <div className="flex items-center gap-1.5" title={assignee.name}>
                                    <div className={`size-5 rounded-full bg-gradient-to-tr ${assignee.color} text-white flex items-center justify-center font-bold text-[9px] uppercase tracking-wider`}>
                                      {assignee.name.split(" ").map(w => w[0]).join("")}
                                    </div>
                                    <span className="text-muted-foreground truncate max-w-[70px]">{assignee.name.split(" ")[0]}</span>
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground italic text-[10px]">Unassigned</span>
                                )}
                              </div>

                            </div>
                          );
                        })
                      )}
                    </div>

                  </div>
                );
              })}
            </div>

            {/* Quick Unassigned Pool Drag Zone */}
            <Card
              onDragOver={e => {
                e.preventDefault();
                setDragOverMemberId("unassigned");
              }}
              onDragLeave={() => setDragOverMemberId(null)}
              onDrop={e => handleDropToMember(e, null)}
              className={`p-4 rounded-xl border border-dashed text-center text-xs transition-all ${dragOverMemberId === "unassigned"
                ? "bg-purple-900/10 border-purple-500/50 scale-[1.01]"
                : "bg-secondary/10 border-border/20 text-muted-foreground"
                }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Trash2 className="size-4 text-purple-400" />
                <span>Drag task here to release to <strong>Unassigned Pool</strong></span>
              </div>
            </Card>

          </div>
        )}

        {/* ----------------- TAB: TEAM MEMBERS ----------------- */}
        {activeTab === "team" && (
          <div className="space-y-6">

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

              {currentRole === "admin" ? (
                /* Add Member Card */
                <Card className="glass border border-border/30">
                  <CardHeader className="pb-3 border-b border-border/20">
                    <CardTitle className="text-md font-bold flex items-center gap-2">
                      <UserPlus className="size-4 text-purple-400" /> Recruit Member
                    </CardTitle>
                    <CardDescription className="text-xs">Add a new professional member to the team</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-4 p-5">
                    <form onSubmit={handleAddMember} className="space-y-4">
                      <div>
                        <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">Full Name</label>
                        <Input
                          placeholder="e.g. Liam Carter"
                          value={memberNameInput}
                          onChange={e => setMemberNameInput(e.target.value)}
                          className="bg-secondary/40 border-border/40"
                          required
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">Designation Role</label>
                        <Input
                          placeholder="e.g. Frontend Dev"
                          value={memberRoleInput}
                          onChange={e => setMemberRoleInput(e.target.value)}
                          className="bg-secondary/40 border-border/40"
                        />
                      </div>
                      <Button type="submit" className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg py-2 flex items-center justify-center gap-1">
                        <Plus className="size-4" /> Recuit Member
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              ) : (
                /* Member View Info */
                <Card className="glass border border-border/30">
                  <CardHeader className="pb-3 border-b border-border/20 bg-purple-500/5">
                    <CardTitle className="text-md font-bold flex items-center gap-2">
                      <Users className="size-4 text-purple-400" /> Team Hub Directory
                    </CardTitle>
                    <CardDescription className="text-xs">Active roster details</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-4 p-5 space-y-3.5">
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      You are in viewing mode. Below is the list of active team members working alongside you on these projects.
                    </p>
                    <div className="p-3 bg-secondary/15 rounded-xl border border-border/10 text-center text-xs">
                      <strong className="text-purple-400 font-extrabold">{members.length}</strong> active members in service.
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Members Grid list */}
              <Card className="glass lg:col-span-2 border border-border/30">
                <CardHeader className="pb-3 border-b border-border/20">
                  <CardTitle className="text-md font-bold flex items-center gap-2">
                    <Users className="size-4 text-purple-400" /> Team Roster ({members.length})
                  </CardTitle>
                  <CardDescription className="text-xs">Drop active tasks directly onto members to reassign immediately</CardDescription>
                </CardHeader>
                <CardContent className="pt-4 p-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {members.map(m => {
                      const memberTasks = tasks.filter(t => t.assignedTo == m.id);
                      const isOver = dragOverMemberId === m.id;

                      return (
                        <div
                          key={m.id}
                          onDragOver={e => {
                            e.preventDefault();
                            setDragOverMemberId(m.id);
                          }}
                          onDragLeave={() => setDragOverMemberId(null)}
                          onDrop={e => handleDropToMember(e, m.id)}
                          className={`p-4 rounded-xl border flex items-center justify-between transition-all duration-200 ${isOver
                            ? "bg-purple-900/10 border-2 border-dashed border-purple-500/50 scale-[1.01]"
                            : "bg-secondary/20 border border-border/30 hover:border-border/60"
                            }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`size-10 rounded-xl bg-gradient-to-tr ${m.color} text-white flex items-center justify-center font-bold text-sm shadow-md`}>
                              {m.name.split(" ").map(w => w[0]).join("")}
                            </div>
                            <div>
                              <h5 className="font-bold text-sm text-foreground">{m.name}</h5>
                              <p className="text-xs text-muted-foreground">{m.role}</p>
                              <div className="mt-1 flex items-center gap-2">
                                <span className="text-[10px] text-purple-400 font-semibold">{memberTasks.length} tasks</span>
                                <span className="text-[9px] text-muted-foreground">•</span>
                                <span className="text-[10px] text-emerald-400 font-semibold">{memberTasks.filter(t => t.status === "Completed").length} completed</span>
                              </div>
                            </div>
                          </div>

                          {currentRole === "admin" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteMember(m.id)}
                              className="text-muted-foreground hover:text-rose-400 rounded-full"
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

            </div>

          </div>
        )}

        {/* ----------------- TAB: CALENDAR ----------------- */}
        {activeTab === "calendar" && (
          <Card className="glass border border-border/30">
            <CardHeader className="pb-3 border-b border-border/20">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-md font-bold flex items-center gap-2">
                    <CalendarIcon className="size-4 text-purple-400" /> Deadline Dispatch Calendar
                  </CardTitle>
                  <CardDescription className="text-xs">Visualize and manage project deadlines</CardDescription>
                </div>
                <div className="flex items-center bg-secondary/80 rounded-xl p-1 border border-border/30">
                  <Button variant="ghost" size="icon" onClick={() => changeMonth(-1)} className="rounded-lg h-8 w-8">
                    <ChevronLeft className="size-4" />
                  </Button>
                  <span className="mx-3 text-xs font-bold min-w-[100px] text-center">
                    {getMonthName(month)} {year}
                  </span>
                  <Button variant="ghost" size="icon" onClick={() => changeMonth(1)} className="rounded-lg h-8 w-8">
                    <ChevronRight className="size-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-4 p-5">

              {/* Calendar Days Row */}
              <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold text-muted-foreground mb-2">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
                  <div key={d} className="py-2">{d}</div>
                ))}
              </div>

              {/* Calendar Grid Cells */}
              <div className="grid grid-cols-7 gap-2">
                {monthGrid.map((dateStr, idx) => {
                  const dayTasks = dateStr ? tasksByDate[dateStr] || [] : [];
                  const isToday = dateStr === todayStr;

                  return (
                    <div
                      key={idx}
                      onClick={() => dateStr && setSelectedDate(dateStr)}
                      className={`min-h-[110px] rounded-xl border p-2 flex flex-col justify-between transition-all duration-200 cursor-pointer ${!dateStr
                        ? "bg-transparent border-transparent pointer-events-none opacity-20"
                        : isToday
                          ? "bg-purple-500/10 border-purple-500/50 shadow-md shadow-purple-500/5"
                          : "bg-secondary/15 border-border/25 hover:border-border/70 hover:bg-secondary/35"
                        }`}
                    >
                      <div className="flex justify-between items-start">
                        <span className={`text-xs font-bold rounded-full size-6 flex items-center justify-center ${isToday ? "bg-purple-600 text-white font-black" : "text-muted-foreground"
                          }`}>
                          {dateStr ? dateStr.split("-")[2] : ""}
                        </span>
                        {dayTasks.length > 0 && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400 font-bold">
                            {dayTasks.length}
                          </span>
                        )}
                      </div>

                      {/* Display small indicator bars/titles */}
                      <div className="space-y-1">
                        {dayTasks.slice(0, 2).map(t => (
                          <div
                            key={t.id}
                            className={`text-[9px] px-1.5 py-0.5 rounded truncate font-medium ${t.status === "Completed" ? "bg-emerald-500/15 text-emerald-400" :
                              t.status === "In Progress" ? "bg-blue-500/15 text-blue-400" :
                                "bg-slate-500/15 text-slate-300"
                              }`}
                            title={t.title}
                          >
                            {t.title}
                          </div>
                        ))}
                        {dayTasks.length > 2 && (
                          <div className="text-[8px] text-muted-foreground text-center font-bold">
                            + {dayTasks.length - 2} more
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

            </CardContent>
          </Card>
        )}

        {/* ----------------- TAB: ANALYTICS & REPORTS ----------------- */}
        {activeTab === "analytics" && (
          <div className="space-y-6 animate-fade-in">

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

              {/* Analytics Summary */}
              <Card className="glass border border-border/30">
                <CardHeader className="pb-3 border-b border-border/20">
                  <CardTitle className="text-sm font-bold">Efficiency Breakdown</CardTitle>
                  <CardDescription className="text-xs">Real-time team completion statistics</CardDescription>
                </CardHeader>
                <CardContent className="pt-4 p-5 space-y-6">

                  {/* Progress Meter */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-muted-foreground font-semibold">Total Completion Progress</span>
                      <span className="text-emerald-400 font-bold">{stats.completionRate}%</span>
                    </div>
                    <div className="w-full h-2.5 bg-secondary/80 rounded-full overflow-hidden border border-border/20">
                      <div
                        className="h-full bg-gradient-to-r from-purple-500 to-emerald-400 transition-all duration-500 rounded-full"
                        style={{ width: `${stats.completionRate}%` }}
                      />
                    </div>
                  </div>

                  {/* Task Status Meters */}
                  <div className="space-y-3.5">
                    <h5 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Statuses distribution</h5>

                    {[
                      { label: "Completed", count: stats.completed, color: "bg-emerald-500" },
                      { label: "In Review", count: stats.review, color: "bg-amber-500" },
                      { label: "In Progress", count: stats.progress, color: "bg-blue-500" },
                      { label: "Pending Dispatch", count: stats.pending, color: "bg-slate-400" },
                    ].map(st => {
                      const percent = stats.total > 0 ? Math.round((st.count / stats.total) * 100) : 0;
                      return (
                        <div key={st.label} className="space-y-1">
                          <div className="flex justify-between text-[11px] font-medium">
                            <span className="text-muted-foreground">{st.label}</span>
                            <span>{st.count} ({percent}%)</span>
                          </div>
                          <div className="w-full h-1.5 bg-secondary/40 rounded-full overflow-hidden">
                            <div className={`h-full ${st.color} rounded-full`} style={{ width: `${percent}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                </CardContent>
              </Card>

              {/* Detailed Tasks Filtered Table Report */}
              <Card className="glass lg:col-span-2 border border-border/30">
                <CardHeader className="pb-3 border-b border-border/20 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-bold">Velocity Query Output</CardTitle>
                    <CardDescription className="text-xs">Search database results based on filters ({filteredTasks.length} hits)</CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="pt-4 p-5">

                  {filteredTasks.length === 0 ? (
                    <div className="py-12 text-center text-xs text-muted-foreground">
                      No tasks found matching active query settings. Try adjusting filters on the Board.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left border-collapse">
                        <thead>
                          <tr className="border-b border-border/20 text-muted-foreground">
                            <th className="py-2.5 font-bold">Task Title</th>
                            <th className="py-2.5 font-bold">Assignee</th>
                            <th className="py-2.5 font-bold">Priority</th>
                            <th className="py-2.5 font-bold">Deadline</th>
                            <th className="py-2.5 font-bold">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/10">
                          {filteredTasks.map(t => {
                            const assignee = getMemberDetails(t.assignedTo);
                            return (
                              <tr key={t.id} className="hover:bg-secondary/20 transition-colors">
                                <td className="py-3 font-bold text-foreground max-w-[200px] truncate">{t.title}</td>
                                <td className="py-3">
                                  {assignee ? (
                                    <span className="flex items-center gap-1">
                                      <span className={`size-4 rounded-full bg-gradient-to-tr ${assignee.color} text-white flex items-center justify-center text-[7px] uppercase font-bold`}>
                                        {assignee.name.split(" ").map(w => w[0]).join("")}
                                      </span>
                                      {assignee.name}
                                    </span>
                                  ) : (
                                    <span className="text-muted-foreground italic">Unassigned</span>
                                  )}
                                </td>
                                <td className="py-3">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${getPriorityColor(t.priority)}`}>
                                    {t.priority}
                                  </span>
                                </td>
                                <td className="py-3">{t.deadline}</td>
                                <td className="py-3">
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${getStatusColorBadge(t.status)}`}>
                                    {t.status}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}

                </CardContent>
              </Card>

            </div>

          </div>
        )}

      </main>

      {/* ----------------- MODAL: EDIT TASK DIALOG ----------------- */}
      {editingTask && (
        <Dialog open={!!editingTask} onOpenChange={open => !open && setEditingTask(null)}>
          <DialogContent className="glass border border-border/30 bg-card text-foreground max-w-md rounded-2xl shadow-2xl">
            <DialogHeader>
              <DialogTitle className="text-lg font-extrabold tracking-tight flex items-center gap-2">
                <Edit className="size-4 text-purple-400" /> Edit Dispatch Details
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Modify properties of task: <strong>{editingTask.title}</strong>
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSaveEdit} className="space-y-4 pt-3.5">
              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Task Title</label>
                <Input
                  value={editingTask.title}
                  onChange={e => setEditingTask(prev => ({ ...prev, title: e.target.value }))}
                  className="bg-secondary/40 border-border/40 text-foreground"
                  disabled={currentRole !== "admin"}
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Requirements Details</label>
                <textarea
                  value={editingTask.detail}
                  onChange={e => setEditingTask(prev => ({ ...prev, detail: e.target.value }))}
                  className="w-full h-24 rounded-lg border border-input bg-secondary/40 px-3 py-1.5 text-xs transition-all focus-visible:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary/20 outline-none resize-none focus:bg-secondary/20 text-foreground"
                  disabled={currentRole !== "admin"}
                />
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Assignee</label>
                  <select
                    value={editingTask.assignedTo || ""}
                    onChange={e => setEditingTask(prev => ({ ...prev, assignedTo: e.target.value ? Number(e.target.value) : null }))}
                    className="w-full h-9 rounded-lg border border-input bg-secondary text-xs px-2 text-foreground outline-none"
                    disabled={currentRole !== "admin"}
                  >
                    <option value="">Unassigned Pool</option>
                    {members.map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Priority</label>
                  <select
                    value={editingTask.priority}
                    onChange={e => setEditingTask(prev => ({ ...prev, priority: e.target.value }))}
                    className="w-full h-9 rounded-lg border border-input bg-secondary text-xs px-2 text-foreground outline-none"
                    disabled={currentRole !== "admin"}
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Board Status</label>
                  <select
                    value={editingTask.status}
                    onChange={e => setEditingTask(prev => ({ ...prev, status: e.target.value }))}
                    className="w-full h-9 rounded-lg border border-input bg-secondary text-xs px-2 text-foreground outline-none focus:ring-2 focus:ring-purple-500/25"
                  >
                    {columns.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Due Deadline</label>
                  <Input
                    type="date"
                    value={editingTask.deadline}
                    onChange={e => setEditingTask(prev => ({ ...prev, deadline: e.target.value }))}
                    className="bg-secondary/40 border-border/40 text-xs text-foreground"
                    disabled={currentRole !== "admin"}
                  />
                </div>
              </div>

              <DialogFooter className={`flex items-center gap-2 pt-2 border-t border-border/10 ${currentRole === "admin" ? 'justify-between' : 'justify-end'}`}>
                {currentRole === "admin" && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => handleDeleteTask(editingTask.id)}
                    className="text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 gap-1 rounded-lg"
                  >
                    <Trash2 className="size-3.5" /> Delete Task
                  </Button>
                )}
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={() => setEditingTask(null)} className="text-xs rounded-lg">
                    Cancel
                  </Button>
                  <Button type="submit" className="text-xs bg-purple-600 hover:bg-purple-500 text-white rounded-lg">
                    {currentRole === "admin" ? "Save Changes" : "Update Status"}
                  </Button>
                </div>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* ----------------- MODAL: CALENDAR CELL SELECTION ----------------- */}
      {selectedDate && (
        <Dialog open={!!selectedDate} onOpenChange={open => !open && setSelectedDate(null)}>
          <DialogContent className="glass border border-border/30 bg-card text-foreground max-w-md rounded-2xl shadow-2xl">
            <DialogHeader>
              <CalendarIcon className="size-4 text-purple-400" /> Deadlines for {selectedDate}
              <DialogTitle className="text-base font-extrabold tracking-tight flex items-center gap-2">
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Review, modify, or add items scheduled for this day.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 pt-3.5">
              <div className="space-y-2.5 max-h-[220px] overflow-y-auto">
                {tasksByDate[selectedDate]?.length > 0 ? (
                  tasksByDate[selectedDate].map(t => {
                    const assignee = getMemberDetails(t.assignedTo);
                    return (
                      <div key={t.id} className="p-3.5 rounded-xl border border-border/30 bg-secondary/20 hover:border-border/60 transition-all flex items-center justify-between gap-4">
                        <div className="flex-1">
                          <h6 className="font-bold text-xs text-foreground tracking-tight leading-snug line-clamp-1">{t.title}</h6>
                          <div className="flex items-center gap-1.5 mt-1 text-[10px] text-muted-foreground">
                            <span className={`px-1.5 py-0.25 rounded font-bold ${getPriorityColor(t.priority)}`}>{t.priority}</span>
                            <span>•</span>
                            <span>{assignee ? assignee.name : "Unassigned"}</span>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setEditingTask(t);
                            setSelectedDate(null);
                          }}
                          className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground"
                        >
                          <Edit className="size-3.5" />
                        </Button>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-xs text-muted-foreground py-8 text-center italic">No tasks scheduled for this day.</p>
                )}
              </div>

              {/* Quick schedule box - hidden for members */}
              {currentRole === "admin" && (
                <div className="p-3 bg-purple-500/5 rounded-xl border border-purple-500/10 space-y-2.5">
                  <h6 className="text-[10px] font-bold text-purple-400 uppercase tracking-wider">Quick Schedule Task</h6>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Task title..."
                      id="quick-calendar-input"
                      className="flex-1 bg-secondary/40 text-xs h-8 border-border/40 text-foreground"
                      onKeyDown={async (e) => {
                        if (e.key === 'Enter' && e.target.value.trim()) {
                          const newTask = {
                            id: Date.now(),
                            title: e.target.value.trim(),
                            detail: "Created from Calendar view.",
                            assignedTo: null,
                            status: "Pending",
                            priority: "Medium",
                            deadline: selectedDate
                          };
                          if (isFirebaseActive) {
                            await setDoc(doc(db, "tasks", String(newTask.id)), newTask);
                          } else {
                            setTasks(prev => [...prev, newTask]);
                          }
                          e.target.value = "";
                        }
                      }}
                    />
                    <Button
                      onClick={async () => {
                        const input = document.getElementById("quick-calendar-input");
                        if (input && input.value.trim()) {
                          const newTask = {
                            id: Date.now(),
                            title: input.value.trim(),
                            detail: "Created from Calendar view.",
                            assignedTo: null,
                            status: "Pending",
                            priority: "Medium",
                            deadline: selectedDate
                          };
                          if (isFirebaseActive) {
                            await setDoc(doc(db, "tasks", String(newTask.id)), newTask);
                          } else {
                            setTasks(prev => [...prev, newTask]);
                          }
                          input.value = "";
                        }
                      }}
                      className="text-xs h-8 px-3 bg-purple-600 hover:bg-purple-500 text-white rounded-lg"
                    >
                      Add
                    </Button>
                  </div>
                  <p className="text-[9px] text-muted-foreground italic">Type and press Enter to quickly add to this deadline.</p>
                </div>
              )}

              <div className="flex justify-end pt-2 border-t border-border/10">
                <Button variant="outline" onClick={() => setSelectedDate(null)} className="text-xs rounded-lg">
                  Close panel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

    </div>
  );
}
