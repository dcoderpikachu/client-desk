type P = { size?: number };

function Svg({ size = 20, children, sw = 1.75 }: { size?: number; children: React.ReactNode; sw?: number }) {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={sw}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}

export const IconGrid = ({ size }: P) => (
  <Svg size={size}>
    <rect x="3.5" y="3.5" width="7" height="7" rx="2.5" />
    <rect x="13.5" y="3.5" width="7" height="7" rx="2.5" />
    <rect x="3.5" y="13.5" width="7" height="7" rx="2.5" />
    <rect x="13.5" y="13.5" width="7" height="7" rx="2.5" />
  </Svg>
);

export const IconUsers = ({ size }: P) => (
  <Svg size={size}>
    <circle cx="9" cy="8" r="3.5" />
    <path d="M2.5 19.5c.8-3.2 3.4-5 6.5-5s5.7 1.8 6.5 5" />
    <path d="M16 4.5a3.5 3.5 0 0 1 0 7" />
    <path d="M18 14.5c1.9.6 3.1 2.3 3.5 5" />
  </Svg>
);

export const IconReceipt = ({ size }: P) => (
  <Svg size={size}>
    <path d="M6 3.5h12v17l-3-2-3 2-3-2-3 2z" />
    <path d="M9 8.5h6" />
    <path d="M9 12.5h6" />
  </Svg>
);

export const IconPhone = ({ size = 18 }: P) => (
  <Svg size={size}>
    <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" />
  </Svg>
);

export const IconPlus = ({ size = 18 }: P) => (
  <Svg size={size} sw={2}>
    <path d="M12 5v14" />
    <path d="M5 12h14" />
  </Svg>
);

export const IconSearch = ({ size = 18 }: P) => (
  <Svg size={size}>
    <circle cx="11" cy="11" r="7" />
    <path d="M20 20l-3.5-3.5" />
  </Svg>
);

export const IconChevronLeft = ({ size = 16 }: P) => (
  <Svg size={size} sw={2}>
    <path d="M15 5l-7 7 7 7" />
  </Svg>
);

export const IconChevronRight = ({ size = 16 }: P) => (
  <Svg size={size} sw={2}>
    <path d="M9 5l7 7-7 7" />
  </Svg>
);

export const IconUpload = ({ size = 18 }: P) => (
  <Svg size={size} sw={2}>
    <path d="M12 16V4" />
    <path d="M7 9l5-5 5 5" />
    <path d="M5 20h14" />
  </Svg>
);

export const IconCheck = ({ size = 16 }: P) => (
  <Svg size={size} sw={2.5}>
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </Svg>
);

export const IconX = ({ size = 18 }: P) => (
  <Svg size={size} sw={2}>
    <path d="M6 6l12 12" />
    <path d="M18 6L6 18" />
  </Svg>
);

export const IconExternal = ({ size = 16 }: P) => (
  <Svg size={size} sw={2}>
    <path d="M14 4h6v6" />
    <path d="M20 4l-9 9" />
    <path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
  </Svg>
);

export const IconWallet = ({ size = 18 }: P) => (
  <Svg size={size}>
    <path d="M4 7.5h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" />
    <path d="M4 7.5V6a2 2 0 0 1 2-2h10" />
    <circle cx="16" cy="13.5" r="1.2" />
  </Svg>
);

export const IconStar = ({ size = 18 }: P) => (
  <Svg size={size}>
    <path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z" />
  </Svg>
);

export const IconNote = ({ size = 18 }: P) => (
  <Svg size={size}>
    <path d="M6 3.5h9l3.5 3.5v13.5H6z" />
    <path d="M9 11h6" />
    <path d="M9 15h6" />
  </Svg>
);

export const IconFile = ({ size = 18 }: P) => (
  <Svg size={size}>
    <path d="M6 3.5h12v17H6z" />
    <path d="M9 8h6" />
    <path d="M9 12h6" />
    <path d="M9 16h3" />
  </Svg>
);

export const IconTask = ({ size = 14 }: P) => (
  <Svg size={size} sw={2.25}>
    <rect x="4" y="4" width="16" height="16" rx="3" />
    <path d="M8.5 12.5l2.5 2.5 4.5-5" />
  </Svg>
);

export const IconWarn = ({ size = 14 }: P) => (
  <Svg size={size} sw={2}>
    <path d="M12 4 2.8 19.5h18.4z" />
    <path d="M12 10v4" />
    <path d="M12 17h.01" />
  </Svg>
);

export const IconSettings = ({ size }: P) => (
  <Svg size={size}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
  </Svg>
);

export const IconPulse = ({ size = 18 }: P) => (
  <Svg size={size}>
    <path d="M3 12h4l2.5-6 4 12 2.5-6H21" />
  </Svg>
);
