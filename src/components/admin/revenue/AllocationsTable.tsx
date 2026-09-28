"use client";

import { ArrowDownToLine, ArrowUpFromLine, Landmark } from "lucide-react";

import { naira, type Allocation } from "./types";

/**
 * Where the operations pool went.
 *
 * Every step is shown — the percentage, what it worked out to, the cap, the
 * bills, and what the department actually gets — because "why did Design get
 * ₦150,000?" is a question asked months later, when the percentages have moved.
 */
export function AllocationsTable({ allocations }: { allocations: Allocation[] }) {
  if (allocations.length === 0) {
    return (
      <p className="rounded-lg border px-4 py-8 text-center text-sm text-muted-foreground">
        No active departments yet. Add them in Company structure and the pool will divide across
        them.
      </p>
    );
  }

  const total = allocations.reduce((sum, row) => sum + Number(row.actual), 0);

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full min-w-[820px] text-sm">
        <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
          <tr>
            <th className="px-4 py-3">Department</th>
            <th className="px-4 py-3 text-right">Share</th>
            <th className="px-4 py-3 text-right">Works out to</th>
            <th className="px-4 py-3 text-right">Cap</th>
            <th className="px-4 py-3 text-right">Its bills</th>
            <th className="px-4 py-3 text-right">Gets</th>
            <th className="px-4 py-3">Why</th>
          </tr>
        </thead>
        <tbody>
          {allocations.map((row) => {
            const draw = Number(row.reserveDraw);
            const excess = Number(row.excessReturned);
            return (
              <tr key={row.departmentId} className="border-t">
                <td className="px-4 py-3">
                  <span className="font-medium">{row.department}</span>
                  {row.isCostFloor && (
                    <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                      <Landmark className="h-3 w-3" />
                      bills first
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">{row.percentUsed}%</td>
                <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                  {naira(row.calculated)}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                  {row.capApplied ? naira(row.capApplied) : "—"}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                  {Number(row.costTotal) > 0 ? naira(row.costTotal) : "—"}
                </td>
                <td className="px-4 py-3 text-right font-medium tabular-nums">
                  {naira(row.actual)}
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">
                  {draw > 0 && (
                    <span className="inline-flex items-center gap-1 text-warning">
                      <ArrowDownToLine className="h-3 w-3" />
                      {naira(row.reserveDraw)} drawn from the reserve to cover its bills
                    </span>
                  )}
                  {excess > 0 && (
                    <span className="inline-flex items-center gap-1">
                      <ArrowUpFromLine className="h-3 w-3" />
                      {naira(row.excessReturned)} held back by the cap, returned to the reserve
                    </span>
                  )}
                  {draw === 0 && excess === 0 && "—"}
                </td>
              </tr>
            );
          })}
          <tr className="border-t bg-muted/40 font-medium">
            <td className="px-4 py-3" colSpan={5}>
              Total to departments
            </td>
            <td className="px-4 py-3 text-right tabular-nums">{naira(String(total))}</td>
            <td />
          </tr>
        </tbody>
      </table>
    </div>
  );
}
