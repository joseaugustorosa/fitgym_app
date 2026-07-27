type IconProps = { className?: string; filled?: boolean }

export function HomeIcon({ className, filled }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={filled ? 0 : 1.8}>
      {filled ? (
        <path d="M12 3L3 10.5V20a1 1 0 001 1h5v-6h6v6h5a1 1 0 001-1v-9.5L12 3z" />
      ) : (
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 10.5L12 3l9 7.5M5 10v10h5v-6h4v6h5V10" />
      )}
    </svg>
  )
}

export function DumbbellIcon({ className, filled }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={filled ? 0 : 1.8}>
      {filled ? (
        <path d="M6.5 6A2.5 2.5 0 004 8.5v7A2.5 2.5 0 006.5 18h11A2.5 2.5 0 0020 15.5v-7A2.5 2.5 0 0017.5 6h-11zM2 10h2v4H2v-4zm18 0h2v4h-2v-4zM4 8.5V6h1v2.5H4zm15 0V6h1v2.5h-1zM4 15.5V18h1v-2.5H4zm15 0V18h1v-2.5h-1z" />
      ) : (
        <>
          <path strokeLinecap="round" d="M6.5 6h11A2.5 2.5 0 0120 8.5v7a2.5 2.5 0 01-2.5 2.5h-11A2.5 2.5 0 014 15.5v-7A2.5 2.5 0 016.5 6z" />
          <path strokeLinecap="round" d="M2 10h2v4H2M20 10h2v4h-2M4 8.5V6h1M19 8.5V6h1M4 15.5V18h1M19 15.5V18h1" />
        </>
      )}
    </svg>
  )
}

export function SaladIcon({ className, filled }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={filled ? 0 : 1.8}>
      {filled ? (
        <path d="M12 2C8 2 5 5 5 9c0 2 .8 3.8 2 5.2V20a1 1 0 001 1h8a1 1 0 001-1v-5.8c1.2-1.4 2-3.2 2-5.2 0-4-3-7-7-7zm-2 14v-2.5l2-1.5 2 1.5V16h-4z" />
      ) : (
        <>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 2c-4 0-7 3-7 7 0 2 .8 3.8 2 5.2V20a1 1 0 001 1h8a1 1 0 001-1v-5.8c1.2-1.4 2-3.2 2-5.2 0-4-3-7-7-7z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M10 16v-2.5l2-1.5 2 1.5V16" />
        </>
      )}
    </svg>
  )
}

export function UsersIcon({ className, filled }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={filled ? 0 : 1.8}>
      {filled ? (
        <path d="M9 11a3 3 0 100-6 3 3 0 000 6zm6 0a3 3 0 100-6 3 3 0 000 6zM3 20a5 5 0 0110 0H3zm8 0a5 5 0 0110 0H11z" />
      ) : (
        <>
          <circle cx="9" cy="8" r="3" />
          <circle cx="17" cy="8" r="3" />
          <path strokeLinecap="round" d="M3 20a5 5 0 0110 0M11 20a5 5 0 0110 0" />
        </>
      )}
    </svg>
  )
}

export function ChevronRightIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  )
}

export function PlayIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5v14l11-7L8 5z" />
    </svg>
  )
}

export function FlameIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 23c4.97 0 9-3.58 9-8 0-2.5-1.2-4.7-3-6.2C16.5 10.5 15 8 15 5.5 15 4.67 15.33 4 16 3.5 14.5 2 12.5 2 10.5 2 6.5 6 2 10 2c0 3.5 1.5 6 3 8.5C14.8 12 16 14.2 16 16.5c0 2.5-1.8 4.5-4 4.5z" />
    </svg>
  )
}

export function HeartIcon({ className, filled }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={filled ? 0 : 1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
    </svg>
  )
}

export function MessageIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" />
    </svg>
  )
}

export function CloseIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}
