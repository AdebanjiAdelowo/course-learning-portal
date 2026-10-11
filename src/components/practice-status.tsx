import { CircleDashed, FilePenLine, Send, ShieldCheck } from "lucide-react";

import { difficultyLabels, practiceStatusLabels, type PracticeStatus, type ProblemDifficulty } from "@/lib/domain/practice";

import { Badge, type Tone } from "./ui/badge";

const statusTone: Record<PracticeStatus, Tone> = {
  not_attempted: "neutral",
  draft: "warn",
  submitted: "accent",
  verified: "accent",
};

const statusIcon = {
  not_attempted: CircleDashed,
  draft: FilePenLine,
  submitted: Send,
  verified: ShieldCheck,
} as const;

/**
 * "Submitted for self-review" is the furthest a problem can get today. "Automatically
 * verified" appears only when a trusted grading service has recorded a passing verdict.
 */
export function PracticeStatusBadge({ status }: { status: PracticeStatus }) {
  const Icon = statusIcon[status];
  return (
    <Badge tone={statusTone[status]}>
      <Icon className="size-3" aria-hidden="true" />
      {practiceStatusLabels[status]}
    </Badge>
  );
}

const difficultyTone: Record<ProblemDifficulty, Tone> = { warm_up: "neutral", core: "accent", challenge: "clay" };

export function DifficultyBadge({ difficulty }: { difficulty: ProblemDifficulty }) {
  return <Badge tone={difficultyTone[difficulty]}>{difficultyLabels[difficulty]}</Badge>;
}
