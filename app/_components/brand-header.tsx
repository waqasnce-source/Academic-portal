import Image from "next/image";
import logo from "@/public/nceg-logo.jpg";

export const INSTITUTION_NAME = "National Centre of Excellence in Geology, University of Peshawar";

/**
 * Shared logo + institution name, used on the login page and in every
 * role layout's sidebar (management/faculty/student) so it appears on
 * every page and sub-page without duplicating markup per route. `on-dark`
 * is for placement against the brand-navy sidebar background (always
 * light text, independent of light/dark theme, since that background
 * doesn't invert); `light` (default) is for placement on an ordinary
 * card/page background.
 */
export function BrandHeader({ size = "md", variant = "light" }: { size?: "sm" | "md"; variant?: "light" | "on-dark" }) {
  const dimension = size === "sm" ? 32 : 40;

  return (
    <div className="flex items-center gap-2.5">
      <Image
        src={logo}
        alt={`${INSTITUTION_NAME} logo`}
        width={dimension}
        height={dimension}
        className="shrink-0 rounded-sm ring-1 ring-white/20"
        priority
      />
      <p
        className={`leading-tight font-semibold ${size === "sm" ? "text-xs" : "text-sm"} ${
          variant === "on-dark" ? "text-white" : "text-slate-900 dark:text-slate-50"
        }`}
      >
        National Centre of Excellence in Geology
        <span className={`block font-normal ${variant === "on-dark" ? "text-brand-200" : "text-slate-500 dark:text-slate-400"}`}>
          University of Peshawar
        </span>
      </p>
    </div>
  );
}
