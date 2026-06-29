import { CoursePage } from "@/features/course/course-page";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/course/")({
  component: CoursePage,
});
