import { Megaphone } from "lucide-react";
import { motion } from "framer-motion";
import type { Announcement } from "@/lib/mock-data";

const tagStyles: Record<Announcement["tag"], string> = {
  release: "bg-accent/15 text-accent",
  event: "bg-primary/15 text-primary",
  update: "bg-success/15 text-success",
};

export function AnnouncementPanel({ items }: { items: Announcement[] }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <Megaphone className="h-5 w-5 text-accent" />
        <h2 className="font-display text-lg font-semibold">Announcements</h2>
      </div>
      <div className="space-y-3">
        {items.map((a, i) => (
          <motion.div
            key={a.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 * i }}
            className="rounded-lg border border-border p-3 transition-colors hover:bg-muted/50"
          >
            <div className="flex items-center justify-between gap-2">
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${tagStyles[a.tag]}`}
              >
                {a.tag}
              </span>
              <span className="text-xs text-muted-foreground">{a.date}</span>
            </div>
            <h4 className="mt-1.5 text-sm font-semibold text-foreground">{a.title}</h4>
            <p className="mt-0.5 text-xs text-muted-foreground">{a.body}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
