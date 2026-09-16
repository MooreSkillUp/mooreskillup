import { forwardRef, useId, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, Props>(
  ({ label, hint, id, className, ...props }, ref) => {
    // A generated id when the caller gives neither `id` nor `name`. Without it
    // the label pointed at nothing: the field had no accessible name, so a
    // screen reader announced an unlabelled box, and clicking the label did
    // not focus the input.
    const generatedId = useId();
    const inputId = id || props.name || generatedId;
    return (
      <div className="space-y-1.5">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-foreground">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          dir={props.dir ?? "ltr"}
          className={cn(
            "h-11 w-full rounded-lg border border-input bg-card px-3.5 text-sm text-foreground shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30",
            // A read-only field used to be indistinguishable from an editable
            // one, so a teacher would click into Program, type, and find
            // nothing happened. It now looks like what it is.
            (props.readOnly || props.disabled) &&
              "cursor-default bg-muted/50 text-muted-foreground shadow-none focus-visible:ring-0",
            className,
          )}
          {...props}
        />
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
    );
  },
);
Input.displayName = "Input";
