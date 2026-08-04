import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireAdmin } from "./admin.server";

/** Orders processed per network round-trip during a bulk RTS run. */
export const RTS_CHUNK_SIZE = 5;

const idsSchema = z.object({ orderIds: z.array(z.string().uuid()).min(1).max(500) });

export type RtsItemResult = {
  orderId: string;
  orderNumber: string;
  ok: boolean;
  consignmentId: string | null;
  message: string;
};

/** Creates the bulk job row and returns the chunked order id batches. */
export const adminStartRtsJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => idsSchema.parse(input))
  .handler(async ({ data, context }) => {
    const db = await requireAdmin(context.supabase, context.userId);
    const ids = [...new Set(data.orderIds)];

    const { data: job, error } = await db
      .from("courier_bulk_jobs")
      .insert({
        provider: "mixed",
        created_by: context.userId,
        status: "running",
        total: ids.length,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    await db
      .from("courier_bulk_job_items")
      .insert(ids.map((orderId) => ({ job_id: job.id, order_id: orderId })));

    const chunks: string[][] = [];
    for (let i = 0; i < ids.length; i += RTS_CHUNK_SIZE) chunks.push(ids.slice(i, i + RTS_CHUNK_SIZE));

    return { jobId: job.id as string, total: ids.length, chunks };
  });

/** Processes one chunk. The client calls this repeatedly so nothing times out. */
export const adminProcessRtsChunk = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        jobId: z.string().uuid(),
        orderIds: z.array(z.string().uuid()).min(1).max(RTS_CHUNK_SIZE),
      })
      .parse(input),
  )
  .handler(async ({ data, context }): Promise<{ results: RtsItemResult[] }> => {
    const db = await requireAdmin(context.supabase, context.userId);
    const { actorName } = await import("./admin.server");
    const { dispatchOrder } = await import("./dispatch.server");
    const who = await actorName(db, context.userId);

    const results: RtsItemResult[] = [];
    for (const orderId of data.orderIds) {
      const res = await dispatchOrder(db, orderId, who);
      results.push({
        orderId,
        orderNumber: res.orderNumber,
        ok: res.ok,
        consignmentId: res.consignmentId,
        message: res.message,
      });
      await db
        .from("courier_bulk_job_items")
        .update({
          status: res.ok ? "success" : "failed",
          message: res.message,
          consignment_id: res.consignmentId,
        })
        .eq("job_id", data.jobId)
        .eq("order_id", orderId);
    }

    const { data: counts } = await db
      .from("courier_bulk_job_items")
      .select("status")
      .eq("job_id", data.jobId);
    const rows = counts ?? [];
    const done = rows.filter((r) => r.status !== "queued").length;
    const succeeded = rows.filter((r) => r.status === "success").length;
    const failed = rows.filter((r) => r.status === "failed").length;

    await db
      .from("courier_bulk_jobs")
      .update({
        processed: done,
        succeeded,
        failed,
        status: done >= rows.length ? "completed" : "running",
      })
      .eq("id", data.jobId);

    return { results };
  });

/** Single-order dispatch from the order workspace. */
export const adminSendOrderToCourier = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ orderId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }): Promise<RtsItemResult> => {
    const db = await requireAdmin(context.supabase, context.userId);
    const { actorName } = await import("./admin.server");
    const { dispatchOrder } = await import("./dispatch.server");
    const res = await dispatchOrder(db, data.orderId, await actorName(db, context.userId));
    return {
      orderId: res.orderId,
      orderNumber: res.orderNumber,
      ok: res.ok,
      consignmentId: res.consignmentId,
      message: res.message,
    };
  });
