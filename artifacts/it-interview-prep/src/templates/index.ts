import type { ComponentType } from "react";
import type { ResumeData, ResumeTemplate } from "@/lib/resume";
import MinimalistBlackWhite from "./MinimalistBlackWhite";
import GrayTimeline from "./GrayTimeline";
import AtsPure from "./AtsPure";
import InfographicBars from "./InfographicBars";
import ProfessionalSplit from "./ProfessionalSplit";
import GreenModern from "./GreenModern";
import PurpleSidebar from "./PurpleSidebar";
import OrangeDarkPanel from "./OrangeDarkPanel";
import SlateContemporary from "./SlateContemporary";
import OffWhiteCorporate from "./OffWhiteCorporate";
import ExecutiveHugeTitle from "./ExecutiveHugeTitle";
import BlueLShape from "./BlueLShape";
export const DISTINCT_TEMPLATES: Partial<Record<ResumeTemplate, ComponentType<{ data: ResumeData }>>> = {
  "minimalist-black-white": MinimalistBlackWhite, "gray-white-timeline": GrayTimeline, "white-black-simple-ats": AtsPure,
  "infographic-single-column": InfographicBars, "professional-single-column": ProfessionalSplit, "green-lined-modern": GreenModern,
  "purple-professional": PurpleSidebar, "orange-amber-creative": OrangeDarkPanel, "sidebar-contemporary": SlateContemporary,
  "corporate-off-white": OffWhiteCorporate, "minimalistic-executive": ExecutiveHugeTitle, "blue-modern-formal": BlueLShape,
};