const base = import.meta.env.BASE_URL.replace(/\/$/, '');

/** Decorative art only: all Bobis and answer statuses remain live DOM elements. */
export function TeaBackdrop() {
  return <span className="mt-backdrop" aria-hidden="true">
    <img src={`${base}/story/watercolor-shared-tea.webp`} alt="" draggable={false}/>
  </span>;
}

export function TeaSurface() {
  return <span className="mt-foam" aria-hidden="true">
    <svg viewBox="0 0 800 28" preserveAspectRatio="none">
      <path d="M0 13C63 7 94 20 156 14S245 8 304 13S406 19 466 12S561 9 622 14S744 18 800 11V24C730 19 682 25 611 22S512 18 447 23S342 23 280 20S169 25 104 22S37 18 0 23Z" fill="#ede0c9" opacity=".55"/>
      <path d="M1 13C63 7 94 20 156 14S245 8 304 13S406 19 466 12S561 9 622 14S744 18 799 11" fill="none" stroke="#b89a76" strokeWidth="1" opacity=".45"/>
    </svg>
  </span>;
}
