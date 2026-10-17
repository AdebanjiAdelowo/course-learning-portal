import { describe, expect, it } from "vitest";
import { course } from "../../seed/course";
import { recursionModule } from "../../seed/recursion-module";
import { arraysModule } from "../../seed/arrays-module";
import { linkedListsModule } from "../../seed/linked-lists-module";

const released = [recursionModule, arraysModule, linkedListsModule];
const modules = course.phases.flatMap(phase => phase.modules);

describe("Phase 3 publication", () => {
  it("publishes the three reviewed modules in their established positions", () => {
    expect(course.phases).toHaveLength(8);
    expect(modules).toHaveLength(34);
    expect(released.map(mod => modules.indexOf(mod) + 1)).toEqual([4, 5, 6]);
    expect(released.map(mod => mod.slug)).toEqual(["recursion-and-induction", "arrays-and-amortised-analysis", "linked-lists"]);
    for (const mod of released) {
      expect(mod.published).toBe(true);
      expect(mod.lessons).toHaveLength(6);
      expect(mod.quiz!.questions).toHaveLength(10);
      expect(mod.project!.rubric.reduce((sum, item) => sum + item.points, 0)).toBe(100);
    }
  });
  it("leaves exactly six published and 28 planned, promoting only the three exact slugs", () => {
    const published = modules.filter(mod => mod.published !== false).map(mod => mod.slug);
    expect(published).toEqual([
      "python-essentials", "python-collections-and-testing", "correctness-and-cost",
      "recursion-and-induction", "arrays-and-amortised-analysis", "linked-lists",
    ]);
    expect(modules.filter(mod => mod.published === false)).toHaveLength(28);
    // Every planned module is the remainder in course order, with nothing published after position 6.
    expect(modules.slice(6).every(mod => mod.published === false)).toBe(true);
  });
});
