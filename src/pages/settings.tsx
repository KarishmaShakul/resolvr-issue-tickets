import { AppLayout } from "@/components/app-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";

export default function SettingsPage() {
  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <h1 className="text-2xl font-display font-bold">Settings</h1>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">General</CardTitle>
            <CardDescription>Organization and application settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Organization Name</Label>
                <Input defaultValue="Resolvr Inc." />
              </div>
              <div className="space-y-2">
                <Label>Time Zone</Label>
                <Input defaultValue="UTC-5 (Eastern)" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">AI Features</CardTitle>
            <CardDescription>Configure AI-powered automation</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Auto-Categorization</p>
                <p className="text-xs text-muted-foreground">Automatically categorize tickets using AI</p>
              </div>
              <Switch defaultChecked />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Priority Detection</p>
                <p className="text-xs text-muted-foreground">AI-based priority suggestions</p>
              </div>
              <Switch defaultChecked />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Duplicate Detection</p>
                <p className="text-xs text-muted-foreground">Alert users about similar existing tickets</p>
              </div>
              <Switch defaultChecked />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Solution Suggestions</p>
                <p className="text-xs text-muted-foreground">Suggest solutions from resolved tickets</p>
              </div>
              <Switch defaultChecked />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button>Save Settings</Button>
        </div>
      </div>
    </AppLayout>
  );
}
