/** Inline stroke icons — 24×24 grid, currentColor, no icon dependency. */

const Svg = ({ children, size = 20, fill = 'none', ...rest }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill={fill}
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
    {...rest}
  >
    {children}
  </svg>
)

export const IconSearch = (p) => (
  <Svg {...p}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></Svg>
)

export const IconBag = (p) => (
  <Svg {...p}><path d="M6 7h12l1 13H5L6 7Z" /><path d="M9 7V5.5a3 3 0 0 1 6 0V7" /></Svg>
)

export const IconUser = (p) => (
  <Svg {...p}><circle cx="12" cy="8" r="3.5" /><path d="M5 20c.9-3.6 3.6-5.5 7-5.5s6.1 1.9 7 5.5" /></Svg>
)

export const IconHeart = ({ filled, ...p }) => (
  <Svg {...p} fill={filled ? 'currentColor' : 'none'}>
    <path d="M12 20s-7-4.4-7-9.2A4 4 0 0 1 12 8a4 4 0 0 1 7 2.8C19 15.6 12 20 12 20Z" />
  </Svg>
)

export const IconArrow = (p) => (
  <Svg {...p}><path d="M4 12h15" /><path d="m13 6 6 6-6 6" /></Svg>
)

export const IconArrowUpRight = (p) => (
  <Svg {...p}><path d="M7 17 17 7" /><path d="M8 7h9v9" /></Svg>
)

export const IconChevron = ({ dir = 'down', ...p }) => {
  const rotate = { down: 0, up: 180, left: 90, right: 270 }[dir]
  return (
    <Svg {...p} style={{ transform: `rotate(${rotate}deg)`, ...(p.style ?? {}) }}>
      <path d="m6 9 6 6 6-6" />
    </Svg>
  )
}

export const IconPlus = (p) => <Svg {...p}><path d="M12 5v14" /><path d="M5 12h14" /></Svg>
export const IconMinus = (p) => <Svg {...p}><path d="M5 12h14" /></Svg>
export const IconClose = (p) => <Svg {...p}><path d="M6 6l12 12" /><path d="M18 6 6 18" /></Svg>
export const IconMenu = (p) => (
  <Svg {...p}><path d="M4 7h16" /><path d="M4 12h16" /><path d="M4 17h16" /></Svg>
)

export const IconCheck = (p) => <Svg {...p}><path d="m5 12.5 4.5 4.5L19 7" /></Svg>

export const IconTrash = (p) => (
  <Svg {...p}>
    <path d="M4 7h16" /><path d="M10 11v6" /><path d="M14 11v6" />
    <path d="M6 7l1 13h10l1-13" /><path d="M9 7V4.5h6V7" />
  </Svg>
)

export const IconEdit = (p) => (
  <Svg {...p}><path d="M4 20h4L20 8l-4-4L4 16v4Z" /><path d="m14 6 4 4" /></Svg>
)

export const IconTruck = (p) => (
  <Svg {...p}>
    <path d="M2 7h11v9H2z" /><path d="M13 10h4.5l3.5 3.5V16H13z" />
    <circle cx="6.5" cy="18" r="1.8" /><circle cx="17.5" cy="18" r="1.8" />
  </Svg>
)

export const IconShield = (p) => (
  <Svg {...p}><path d="M12 3.5 19 6v5.5c0 4.3-2.9 7.6-7 9-4.1-1.4-7-4.7-7-9V6l7-2.5Z" /><path d="m9 12 2 2 4-4" /></Svg>
)

export const IconLeaf = (p) => (
  <Svg {...p}><path d="M5 19C4 12 8 5 19 5c0 11-7 15-14 14Z" /><path d="M9 15c2-3 4.5-5 8-6.5" /></Svg>
)

export const IconRabbit = (p) => (
  <Svg {...p}>
    <path d="M8 11c0-3 1.8-5 4-5s4 2 4 5" /><path d="M9 6.5C8.4 4 7.3 2.8 6 3c-1.2.2-1.4 2 0 4.2" />
    <path d="M15 6.5C15.6 4 16.7 2.8 18 3c1.2.2 1.4 2 0 4.2" />
    <path d="M6 15c0 3.3 2.7 6 6 6s6-2.7 6-6c0-2-1-3.4-2.5-4" />
  </Svg>
)

export const IconGlobe = (p) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8.5" /><path d="M3.5 12h17" />
    <path d="M12 3.5c2.3 2.4 3.4 5.3 3.4 8.5S14.3 18.1 12 20.5c-2.3-2.4-3.4-5.3-3.4-8.5S9.7 5.9 12 3.5Z" />
  </Svg>
)

export const IconSparkle = (p) => (
  <Svg {...p}>
    <path d="M12 3.5 13.8 9 19.5 10.8 13.8 12.6 12 18.2 10.2 12.6 4.5 10.8 10.2 9 12 3.5Z" />
    <path d="M18.5 16.5 19.3 18.7 21.5 19.5 19.3 20.3 18.5 22.5 17.7 20.3 15.5 19.5 17.7 18.7 18.5 16.5Z" />
  </Svg>
)

export const IconStore = (p) => (
  <Svg {...p}>
    <path d="M4 10h16v10H4z" /><path d="M3 10 5 4h14l2 6" /><path d="M10 20v-5h4v5" />
  </Svg>
)

export const IconChart = (p) => (
  <Svg {...p}><path d="M4 20V4" /><path d="M4 20h16" /><path d="M8 16v-4" /><path d="M13 16V8" /><path d="M18 16v-6" /></Svg>
)

export const IconBox = (p) => (
  <Svg {...p}>
    <path d="M12 3 20 7v10l-8 4-8-4V7l8-4Z" /><path d="M4 7l8 4 8-4" /><path d="M12 11v10" />
  </Svg>
)

export const IconStar = ({ fill = 'none', ...p }) => (
  <Svg {...p} fill={fill} strokeWidth="1.3">
    <path d="m12 4 2.4 4.9 5.4.8-3.9 3.8.9 5.4-4.8-2.5-4.8 2.5.9-5.4L4.2 9.7l5.4-.8L12 4Z" />
  </Svg>
)

export const IconDrop = (p) => (
  <Svg {...p}><path d="M12 3.5c3 4 5 6.6 5 9.2a5 5 0 0 1-10 0c0-2.6 2-5.2 5-9.2Z" /></Svg>
)

export const IconFlask = (p) => (
  <Svg {...p}>
    <path d="M10 3v6L5 18a2 2 0 0 0 1.8 3h10.4A2 2 0 0 0 19 18l-5-9V3" />
    <path d="M9 3h6" /><path d="M7.5 14h9" />
  </Svg>
)
