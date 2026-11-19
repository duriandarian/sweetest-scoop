/** the call to action as a cafe order slip: notched paper, perforated stub, a stamped mango sago cup */
export function OrderTicket({ onClick, testId, tabIndex, big = false }: { onClick: () => void; testId: string; tabIndex?: number; big?: boolean }) {
  return <button type="button" className={`order-ticket ${big ? 'is-big' : ''}`} onClick={onClick} tabIndex={tabIndex} data-testid={testId} aria-label="Order up! Start playing">
    <span className="ot-stub" aria-hidden="true">
      <svg viewBox="0 0 24 30" width="20" height="25"><path d="M4 8h16l-2 19a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2z" fill="#fde3a0" stroke="#7a4a1c" strokeWidth="1.4"/><path d="M4.4 12h15.2" stroke="#7a4a1c" strokeWidth="1.1"/><path d="M5 8c1-4 5-5 7-3 2-3 7-1 7 3" fill="#f2a93b" stroke="#7a4a1c" strokeWidth="1.2"/><circle cx="9.5" cy="20" r="1.3" fill="#f6c3b2"/><circle cx="13" cy="23" r="1.3" fill="#fff"/><circle cx="15" cy="18.5" r="1.1" fill="#f6c3b2"/></svg>
    </span>
    <span className="ot-body">
      <small aria-hidden="true">Table for two · No. 01</small>
      <b>Order up!</b>
    </span>
    <span className="ot-stamp" aria-hidden="true">Sweetest</span>
  </button>;
}
