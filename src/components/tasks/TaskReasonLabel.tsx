export function TaskReasonLabel({ reason }: { reason: string }) {
  return (
    <p className="mt-1 flex items-start gap-1.5 text-xs text-slate-500">
      <span aria-hidden>💡</span>
      <span>
        <span className="font-medium text-slate-600">Why this matters: </span>
        {reason}
      </span>
    </p>
  );
}
