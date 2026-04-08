import { AppLayout } from "@/components/app-layout";
import { StatCard } from "@/components/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BarChart3, TrendingUp, Clock, Users, Sparkles, Loader2, Info, AlertTriangle, CheckCircle2 } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";
import { useTickets, useTicketStats } from "@/hooks/use-tickets";
import { categories } from "@/data/mock-data";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const STATUS_COLORS: Record<string, string> = {
  Open: "hsl(217, 91%, 60%)",
  "In Progress": "hsl(38, 92%, 50%)",
  Resolved: "hsl(160, 84%, 39%)",
};

interface Insight {
  title: string;
  description: string;
  type: "info" | "warning" | "success";
}

const insightIcons = {
  info: Info,
  warning: AlertTriangle,
  success: CheckCircle2,
};

const insightColors = {
  info: "text-primary border-primary/20 bg-primary/5",
  warning: "text-warning border-warning/20 bg-warning/5",
  success: "text-success border-success/20 bg-success/5",
};

export default function AdminAnalyticsPage() {
  const { data: stats, isLoading: statsLoading } = useTicketStats();
  const { data: tickets = [], isLoading: ticketsLoading } = useTickets();
  const [insights, setInsights] = useState<Insight[]>([]);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [insightsFetched, setInsightsFetched] = useState(false);

  const isLoading = statsLoading || ticketsLoading;

  const statusData = [
    { name: "Open", value: stats?.open ?? 0, color: STATUS_COLORS["Open"] },
    { name: "In Progress", value: stats?.inProgress ?? 0, color: STATUS_COLORS["In Progress"] },
    { name: "Resolved", value: stats?.resolved ?? 0, color: STATUS_COLORS["Resolved"] },
  ];

  const categoryData = categories
    .map((c) => ({ category: c.label, count: tickets.filter((t) => t.category === c.value).length }))
    .filter((d) => d.count > 0);

  const resolutionRate = stats && stats.total > 0 ? Math.round((stats.resolved / stats.total) * 100) : 0;

  const fetchInsights = async () => {
    if (!stats || insightsLoading) return;
    setInsightsLoading(true);
    try {
      const categoryBreakdown = categoryData.map((c) => `${c.category}: ${c.count}`).join(", ");
      const recentTrends = `${tickets.length} tickets total. Open backlog: ${stats.open}. Active: ${stats.inProgress}.`;

      const { data, error } = await supabase.functions.invoke("ai-insights", {
        body: { stats, categoryBreakdown, recentTrends },
      });
      if (error) throw error;
      setInsights(data?.insights ?? []);
      setInsightsFetched(true);
    } catch {
      setInsights([]);
      setInsightsFetched(true);
    } finally {
      setInsightsLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-display font-bold">Analytics & Reports</h1>
          <p className="text-muted-foreground text-sm">Track performance and ticket trends</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)
          ) : (
            <>
              <StatCard title="Total Tickets" value={stats?.total ?? 0} icon={BarChart3} />
              <StatCard title="Avg Resolution" value="-" icon={Clock} iconClassName="bg-warning/10 text-warning" />
              <StatCard title="Resolution Rate" value={resolutionRate} icon={TrendingUp} trend="%" iconClassName="bg-primary/10 text-primary" />
              <StatCard title="Open Issues" value={stats?.open ?? 0} icon={Users} iconClassName="bg-success/10 text-success" />
            </>
          )}
        </div>

        {/* AI Insights */}
        <Card className="border-primary/20">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                AI Insights
                <Badge variant="secondary" className="text-xs font-normal">Powered by AI</Badge>
              </CardTitle>
              {!insightsFetched && !insightsLoading && (
                <Button variant="outline" size="sm" className="gap-1.5" onClick={fetchInsights} disabled={isLoading}>
                  <Sparkles className="h-3.5 w-3.5" /> Generate Insights
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {insightsLoading ? (
              <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Analyzing ticket data and generating insights...
              </div>
            ) : !insightsFetched ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Click "Generate Insights" to get AI-powered analysis of your ticket data.
              </p>
            ) : insights.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No insights available. Add more tickets for better analysis.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {insights.map((insight, i) => {
                  const Icon = insightIcons[insight.type] ?? Info;
                  return (
                    <div key={i} className={`rounded-lg border p-4 space-y-1 ${insightColors[insight.type] ?? insightColors.info}`}>
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 shrink-0" />
                        <h4 className="text-sm font-medium">{insight.title}</h4>
                      </div>
                      <p className="text-xs opacity-80">{insight.description}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle className="text-lg">Tickets by Category</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={categoryData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="category" className="text-xs" tick={{ fill: "hsl(215, 16%, 47%)" }} />
                  <YAxis allowDecimals={false} tick={{ fill: "hsl(215, 16%, 47%)" }} />
                  <Tooltip contentStyle={{ background: "hsl(0, 0%, 100%)", border: "1px solid hsl(214, 32%, 91%)", borderRadius: "8px" }} />
                  <Bar dataKey="count" fill="hsl(217, 91%, 60%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-lg">Tickets by Status</CardTitle></CardHeader>
            <CardContent className="flex items-center justify-center">
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={statusData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                    {statusData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
