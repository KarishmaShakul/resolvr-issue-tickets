// Static reference data used across the app

export const categories: { value: string; label: string }[] = [
  { value: "technical", label: "Technical" },
  { value: "network", label: "Network" },
  { value: "hardware", label: "Hardware" },
  { value: "software", label: "Software" },
  { value: "access", label: "Access & Permissions" },
  { value: "hr", label: "HR" },
  { value: "facilities", label: "Facilities" },
  { value: "other", label: "Other" },
];

export const priorities: { value: string; label: string; color: string }[] = [
  { value: "low", label: "Low", color: "text-muted-foreground" },
  { value: "medium", label: "Medium", color: "text-primary" },
  { value: "high", label: "High", color: "text-warning" },
  { value: "critical", label: "Critical", color: "text-destructive" },
];
