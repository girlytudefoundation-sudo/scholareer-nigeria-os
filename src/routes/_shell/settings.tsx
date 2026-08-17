import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Save } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useOrgData, fallbackSettings } from "@/hooks/use-data";
import { useAuth } from "@/lib/auth";
import { audit, orgService, settingsService } from "@/services";
import { TERMS } from "@/lib/constants";
import type { GradeBand, ModuleKey, Organization, Settings } from "@/db/types";

export const Route = createFileRoute("/_shell/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Scholareer School OS" },
      { name: "description", content: "School profile, grading scheme, modules and result policy." },
      { property: "og:title", content: "Settings — Scholareer School OS" },
      { property: "og:description", content: "Configure grading bands, session, term and module access." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SettingsPage,
});

const MODULE_LABELS: Record<ModuleKey, string> = {
  students: "Students",
  teachers: "Teachers",
  academics: "Classes & Subjects",
  results: "Results & RACE",
  finance: "Finance",
  attendance: "Attendance",
  library: "Library",
  visitors: "Visitors",
  idcards: "ID Cards",
  reports: "Reports",
};

function SettingsPage() {
  const { data, orgId } = useOrgData();
  const { user, has, refreshOrg } = useAuth();
  const canManage = has("settings.manage");

  const [profile, setProfile] = useState<Organization | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);

  useEffect(() => {
    if (data?.organization) setProfile(data.organization);
  }, [data?.organization]);

  useEffect(() => {
    if (data?.settings) setSettings(data.settings);
    else if (orgId && data) setSettings(fallbackSettings(orgId));
  }, [data, orgId]);

  if (!profile || !settings || !orgId) {
    return (
      <div>
        <PageHeader title="Settings" description="Loading school configuration…" />
      </div>
    );
  }

  async function saveProfile() {
    if (!profile || !orgId) return;
    await orgService.update(orgId, profile);
    await refreshOrg();
    await audit(orgId, user?.name ?? "System", "UPDATE", "Organization", orgId, "School profile updated");
    toast.success("School profile saved");
  }

  async function saveSettings(next?: Settings) {
    if (!orgId) return;
    const payload = next ?? settings;
    if (!payload) return;
    await settingsService.update(orgId, payload);
    toast.success("Settings saved");
  }

  function updateBand(index: number, patch: Partial<GradeBand>) {
    setSettings((s) =>
      s ? { ...s, grading: s.grading.map((g, i) => (i === index ? { ...g, ...patch } : g)) } : s,
    );
  }

  return (
    <div>
      <PageHeader title="Settings" description="School profile, academics and modules" />

      <Tabs defaultValue="school">
        <TabsList>
          <TabsTrigger value="school">School</TabsTrigger>
          <TabsTrigger value="academics">Academics</TabsTrigger>
          <TabsTrigger value="modules">Modules</TabsTrigger>
        </TabsList>

        <TabsContent value="school" className="mt-4">
          <div className="surface-card grid gap-3 p-5 sm:grid-cols-2">
            <F label="School name">
              <Input value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} />
            </F>
            <F label="School code">
              <Input value={profile.schoolCode} onChange={(e) => setProfile({ ...profile, schoolCode: e.target.value })} />
            </F>
            <F label="Address">
              <Input value={profile.address} onChange={(e) => setProfile({ ...profile, address: e.target.value })} />
            </F>
            <F label="Phone">
              <Input value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} />
            </F>
            <F label="Email">
              <Input value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} />
            </F>
            <F label="Motto">
              <Input value={profile.motto} onChange={(e) => setProfile({ ...profile, motto: e.target.value })} />
            </F>
            <F label="Principal">
              <Input
                value={profile.principalName}
                onChange={(e) => setProfile({ ...profile, principalName: e.target.value })}
              />
            </F>
            <F label="Proprietor">
              <Input
                value={profile.proprietorName}
                onChange={(e) => setProfile({ ...profile, proprietorName: e.target.value })}
              />
            </F>
            <F label="Current session">
              <Input
                value={profile.currentSession}
                onChange={(e) => setProfile({ ...profile, currentSession: e.target.value })}
              />
            </F>
            <F label="Current term">
              <Select
                value={profile.currentTerm}
                onValueChange={(v) => setProfile({ ...profile, currentTerm: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TERMS.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </F>
            <F label="Resumption date">
              <Input
                type="date"
                value={profile.resumptionDate?.slice(0, 10) ?? ""}
                onChange={(e) => setProfile({ ...profile, resumptionDate: e.target.value })}
              />
            </F>
            {canManage && (
              <div className="sm:col-span-2">
                <Button onClick={saveProfile}>
                  <Save className="mr-1.5 h-4 w-4" /> Save school profile
                </Button>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="academics" className="mt-4 space-y-4">
          <div className="surface-card grid gap-3 p-5 sm:grid-cols-3">
            <F label="CA maximum">
              <Input
                type="number"
                value={settings.caMaximum}
                onChange={(e) => setSettings({ ...settings, caMaximum: Number(e.target.value) })}
              />
            </F>
            <F label="Exam maximum">
              <Input
                type="number"
                value={settings.examMaximum}
                onChange={(e) => setSettings({ ...settings, examMaximum: Number(e.target.value) })}
              />
            </F>
            <F label="Pass mark">
              <Input
                type="number"
                value={settings.passMark}
                onChange={(e) => setSettings({ ...settings, passMark: Number(e.target.value) })}
              />
            </F>
            <F label="Position method">
              <Select
                value={settings.positionMethod}
                onValueChange={(v) => setSettings({ ...settings, positionMethod: v as Settings["positionMethod"] })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="COMPETITION">Competition (1, 1, 3)</SelectItem>
                  <SelectItem value="DENSE">Dense (1, 1, 2)</SelectItem>
                </SelectContent>
              </Select>
            </F>
            <div className="flex items-center justify-between gap-3 rounded-lg border p-3 sm:col-span-2">
              <div>
                <p className="text-sm font-medium">Block results on outstanding fees</p>
                <p className="text-xs text-muted-foreground">
                  RACE locks report cards for students owing school fees.
                </p>
              </div>
              <Switch
                checked={settings.blockResultOnDebt}
                onCheckedChange={(v) => setSettings({ ...settings, blockResultOnDebt: v })}
              />
            </div>
          </div>

          <div className="surface-card overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Grade</TableHead>
                  <TableHead>Min</TableHead>
                  <TableHead>Max</TableHead>
                  <TableHead>Remark</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {settings.grading.map((g, i) => (
                  <TableRow key={`${g.grade}-${i}`}>
                    <TableCell>
                      <Input
                        className="h-8 w-16"
                        value={g.grade}
                        onChange={(e) => updateBand(i, { grade: e.target.value })}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        className="h-8 w-20"
                        type="number"
                        value={g.min}
                        onChange={(e) => updateBand(i, { min: Number(e.target.value) })}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        className="h-8 w-20"
                        type="number"
                        value={g.max}
                        onChange={(e) => updateBand(i, { max: Number(e.target.value) })}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        className="h-8"
                        value={g.remark}
                        onChange={(e) => updateBand(i, { remark: e.target.value })}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {canManage && (
            <Button onClick={() => saveSettings()}>
              <Save className="mr-1.5 h-4 w-4" /> Save academic settings
            </Button>
          )}
        </TabsContent>

        <TabsContent value="modules" className="mt-4">
          <div className="surface-card grid gap-3 p-5 sm:grid-cols-2">
            {(Object.keys(MODULE_LABELS) as ModuleKey[]).map((key) => (
              <div key={key} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                <p className="text-sm font-medium">{MODULE_LABELS[key]}</p>
                <Switch
                  checked={settings.modules[key]}
                  disabled={!canManage}
                  onCheckedChange={async (v) => {
                    const next = { ...settings, modules: { ...settings.modules, [key]: v } };
                    setSettings(next);
                    await saveSettings(next);
                  }}
                />
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}
