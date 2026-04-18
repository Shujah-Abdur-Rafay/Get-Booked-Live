import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, Loader2, CheckCircle, XCircle, Clock, Activity } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

type AITask = {
  id: string;
  related_entity_type: string;
  related_entity_id: string;
  provider: string;
  task_type: string;
  status: string;
  error_message: string | null;
  created_at: string;
  completed_at: string | null;
};

type ActivityLog = {
  id: string;
  actor_type: string;
  action_type: string;
  entity_type: string;
  metadata: Record<string, any>;
  created_at: string;
};

export default function AdminAIMonitor() {
  const [tasks, setTasks] = useState<AITask[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const [tasksRes, logsRes] = await Promise.all([
        supabase
          .from("ai_tasks")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(50),
        supabase
          .from("activity_logs")
          .select("*")
          .in("actor_type", ["manus", "marblism"])
          .order("created_at", { ascending: false })
          .limit(50),
      ]);
      setTasks((tasksRes.data as AITask[]) || []);
      setLogs((logsRes.data as ActivityLog[]) || []);
      setLoading(false);
    };
    fetchData();
  }, []);

  const statusIcon: Record<string, React.ReactNode> = {
    completed: <CheckCircle className="w-3 h-3 text-[#3EFFBE]" />,
    failed: <XCircle className="w-3 h-3 text-[#FF5C5C]" />,
    processing: <Loader2 className="w-3 h-3 text-[#FFB83E] animate-spin" />,
    queued: <Clock className="w-3 h-3 text-muted-foreground" />,
  };

  const providerColor: Record<string, string> = {
    manus: "text-[#C8FF3E] bg-[#C8FF3E]/10",
    marblism: "text-[#3EC8FF] bg-[#3EC8FF]/10",
  };

  const completed = tasks.filter((t) => t.status === "completed").length;
  const failed = tasks.filter((t) => t.status === "failed").length;
  const processing = tasks.filter((t) => t.status === "processing").length;

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48 bg-[#0e1420]" />
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 rounded-xl bg-[#0e1420]" />)}
        </div>
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-12 rounded-lg bg-[#0e1420]" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-[#C8FF3E]" />
        <h2 className="font-syne font-bold text-base lowercase">ai operations monitor</h2>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "total tasks", value: tasks.length, color: "#F0F2F7" },
          { label: "completed", value: completed, color: "#3EFFBE" },
          { label: "failed", value: failed, color: "#FF5C5C" },
          { label: "in progress", value: processing, color: "#FFB83E" },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl border border-white/[0.06] bg-[#0e1420] px-4 py-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">{stat.label}</p>
            <p className="font-syne text-lg font-bold" style={{ color: stat.color }}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Recent Tasks */}
      <div>
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-3">recent ai tasks</h3>
        {tasks.length === 0 ? (
          <div className="rounded-xl border border-white/[0.06] bg-[#0e1420] p-6 text-center">
            <p className="text-sm text-muted-foreground">no ai tasks yet</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {tasks.slice(0, 20).map((task) => (
              <div key={task.id} className="rounded-lg border border-white/[0.06] bg-[#0e1420] px-4 py-2.5 flex items-center gap-3">
                {statusIcon[task.status] || statusIcon.queued}
                <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${providerColor[task.provider] || "text-muted-foreground bg-white/5"}`}>
                  {task.provider}
                </span>
                <span className="text-[11px] font-medium truncate flex-1 lowercase">{task.task_type.replace(/_/g, " ")}</span>
                <span className="text-[10px] text-muted-foreground shrink-0">
                  {new Date(task.created_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                </span>
                {task.error_message && (
                  <span className="text-[9px] text-[#FF5C5C] truncate max-w-[120px]" title={task.error_message}>
                    {task.error_message}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Activity Feed */}
      <div>
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-1.5">
          <Activity className="w-3 h-3" /> ai activity feed
        </h3>
        {logs.length === 0 ? (
          <div className="rounded-xl border border-white/[0.06] bg-[#0e1420] p-6 text-center">
            <p className="text-sm text-muted-foreground">no ai activity recorded yet</p>
          </div>
        ) : (
          <div className="space-y-1">
            {logs.slice(0, 20).map((log) => (
              <div key={log.id} className="flex items-center gap-2 px-3 py-2 text-[11px]">
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${log.actor_type === "manus" ? "bg-[#C8FF3E]" : "bg-[#3EC8FF]"}`} />
                <span className="text-muted-foreground">{log.actor_type}</span>
                <span className="text-foreground font-medium lowercase">{log.action_type.replace(/_/g, " ")}</span>
                <span className="text-muted-foreground/60 ml-auto shrink-0">
                  {new Date(log.created_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
