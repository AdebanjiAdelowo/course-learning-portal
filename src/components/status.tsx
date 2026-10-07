import { Check, CircleDot, Lock, Radio } from "lucide-react";

import type { ModuleState, ProjectStatus } from "@/lib/domain/progress";
import type { SessionStatus } from "@/lib/domain/sessions";
import type { DueState } from "@/lib/format";

import { Badge, type Tone } from "./ui/badge";

const projectLabels: Record<ProjectStatus, { label: string; tone: Tone }> = {
  not_started: { label: "Not started", tone: "neutral" },
  in_progress: { label: "In progress", tone: "warn" },
  submitted: { label: "Submitted", tone: "accent" },
  reviewed: { label: "Reviewed", tone: "clay" },
};

export function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  const { label, tone } = projectLabels[status];
  return <Badge tone={tone}>{label}</Badge>;
}

export function ModuleStateBadge({ state }: { state: ModuleState }) {
  switch (state) {
    case "locked":
      return (
        <Badge>
          <Lock className="size-3" aria-hidden="true" />
          Locked
        </Badge>
      );
    case "completed":
      return (
        <Badge tone="accent">
          <Check className="size-3" aria-hidden="true" />
          Completed
        </Badge>
      );
    case "in_progress":
      return (
        <Badge tone="warn">
          <CircleDot className="size-3" aria-hidden="true" />
          In progress
        </Badge>
      );
    case "available":
      return <Badge>Not started</Badge>;
  }
}

export function SessionStatusBadge({ status }: { status: SessionStatus }) {
  switch (status) {
    case "live":
      return (
        <Badge tone="clay">
          <Radio className="size-3 animate-pulse" aria-hidden="true" />
          Live now
        </Badge>
      );
    case "upcoming":
      return <Badge tone="accent">Upcoming</Badge>;
    case "completed":
      return <Badge>Completed</Badge>;
  }
}

export function DueBadge({ state, text }: { state: DueState; text: string }) {
  if (state === "none") return null;
  const tone: Tone = state === "overdue" ? "danger" : state === "soon" ? "warn" : "neutral";
  return <Badge tone={tone}>{state === "overdue" ? `Overdue · ${text}` : `Due ${text}`}</Badge>;
}
