"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Info } from "lucide-react";

import { naira, shortDateTime, type RevenueSplit } from "./types";

/**
 * What each teacher earned, and the sales behind it.
 *
 * Expandable rather than summarised, because the first question anyone asks
 * about a payment is "from what?" — and answering it by pointing at three
 * sales ends the conversation, where a total invites another question.
 */
export function TeachersPanel({ split }: { split: RevenueSplit }) {
  const [open, setOpen] = useState<string | null>(null);

  return (
    <section className="space-y-4">
      {split.teachers.length === 0 ? (
        <p className="rounded-lg border px-4 py-8 text-center text-sm text-muted-foreground">
          No teacher earned anything this month.
        </p>
      ) : (
        <div className="space-y-2">
          {split.teachers.map((teacher) => {
            const isOpen = open === teacher.teacherId;
            return (
              <article key={teacher.teacherId ?? teacher.name} className="rounded-lg border bg-card">
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : teacher.teacherId)}
                  className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
                >
                  <span className="flex items-center gap-2 font-medium">
                    {isOpen ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                    {teacher.name}
                    <span className="text-xs font-normal text-muted-foreground">
                      {teacher.sales.length} {teacher.sales.length === 1 ? "sale" : "sales"}
                    </span>
                  </span>
                  <span className="tabular-nums font-medium">{naira(teacher.total)}</span>
                </button>

                {isOpen && (
                  <div className="overflow-x-auto border-t">
                    <table className="w-full min-w-[620px] text-sm">
                      <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                        <tr>
                          <th className="px-4 py-2">Course</th>
                          <th className="px-4 py-2">Paid</th>
                          <th className="px-4 py-2 text-right">Student paid</th>
                          <th className="px-4 py-2 text-right">Fee</th>
                          <th className="px-4 py-2 text-right">Rate</th>
                          <th className="px-4 py-2 text-right">Earned</th>
                        </tr>
                      </thead>
                      <tbody>
                        {teacher.sales.map((s, index) => (
                          <tr key={index} className="border-t">
                            <td className="px-4 py-2">{s.course}</td>
                            <td className="px-4 py-2 text-muted-foreground">
                              {shortDateTime(s.paidAt)}
                            </td>
                            <td className="px-4 py-2 text-right tabular-nums">{naira(s.amount)}</td>
                            <td className="px-4 py-2 text-right tabular-nums text-muted-foreground">
                              − {naira(s.fee)}
                            </td>
                            <td className="px-4 py-2 text-right tabular-nums">{s.sharePercent}%</td>
                            <td className="px-4 py-2 text-right tabular-nums font-medium">
                              {naira(s.earned)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      {split.unearned.length > 0 && (
        <div className="rounded-lg border bg-muted/30 p-4">
          <h3 className="flex items-center gap-2 text-sm font-medium">
            <Info className="h-4 w-4 text-muted-foreground" />
            Sales that earned nobody anything
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            The money is still yours — it is only the teacher share that does not apply.
          </p>
          <ul className="mt-3 space-y-1 text-sm">
            {split.unearned.map((sale, index) => (
              <li key={index} className="flex flex-wrap justify-between gap-2">
                <span>
                  {sale.course}
                  <span className="ml-2 text-xs text-muted-foreground">
                    {shortDateTime(sale.paidAt)}
                  </span>
                </span>
                <span className="text-xs text-muted-foreground">
                  {naira(sale.amount)} · {sale.reason}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
