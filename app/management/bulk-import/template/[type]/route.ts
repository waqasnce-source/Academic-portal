import { NextResponse } from "next/server";
import { requireRole } from "@/lib/supabase/dal";
import { generateTemplate } from "@/lib/management/import/templates";
import type { ImportType } from "@/lib/management/import/types";

const VALID_TYPES: readonly ImportType[] = ["courses", "offerings", "students", "enrollments"];

export async function GET(_req: Request, ctx: RouteContext<"/management/bulk-import/template/[type]">) {
  await requireRole("management");

  const { type } = await ctx.params;
  if (!VALID_TYPES.includes(type as ImportType)) {
    return NextResponse.json({ error: "Unknown template type." }, { status: 404 });
  }

  const { filename, buffer } = await generateTemplate(type as ImportType);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
