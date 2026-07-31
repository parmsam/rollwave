interface Props {
  message: string
}

/** Visually-hidden live region announcing phase changes to screen readers. */
export function AriaLiveRegion({ message }: Props) {
  return (
    <div role="status" aria-live="assertive" className="visually-hidden">
      {message}
    </div>
  )
}
