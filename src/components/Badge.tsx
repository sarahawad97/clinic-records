export function Badge({ status, label }: { status: string; label: string }) {
  return (
    <span className="badge" data-status={status}>
      <span className="mark" aria-hidden="true" />
      {label}
    </span>
  )
}
