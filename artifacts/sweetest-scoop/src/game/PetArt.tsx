/** Tiny, stepped sprites drawn on a 16-by-16 grid, beside Bobi's feet. */
export function PetArt({ pet }: { pet: 'schnauzer' | 'turtle' }) {
  if (pet === 'schnauzer') return <g transform="translate(70 64) scale(2)" shapeRendering="crispEdges" data-pet={pet}>
    <path fill="#332d39" d="M3 1h3v2h4V1h3v1h1v7h-1v2h1v1h1v3H1v-3h1v-1h1V9H2V2h1Z"/>
    <path fill="#77737e" d="M3 2h2v2h6V2h2v6h-1v3H4V8H3ZM3 12h10v2H3Z"/>
    <path fill="#a7a1aa" d="M5 4h6v2h1v3H4V6h1ZM5 11h6v3H5Z"/>
    <path fill="#fbefde" d="M4 5h3v1H4Zm5 0h3v1H9ZM4 8h2V7h4v1h2v1h1v2h-2v1H5v-1H3V9h1Zm0 5h2v1H4Zm6 0h2v1h-2Z"/>
    <path fill="#302935" d="M5 6h1v1H5Zm5 0h1v1h-1ZM7 8h2v1H7Zm1 1h1v1H8Z"/>
    <path fill="#d7797d" d="M7 12h3v1H7Z"/>
    <path fill="#ffce6c" d="M8 13h1v1H8Z"/>
  </g>;
  return <g transform="translate(70 65) scale(2)" shapeRendering="crispEdges" data-pet={pet}>
    <path fill="#344535" d="M4 4h5v1h2v2h1V6h3v1h1v5h-2v2h-3v-1H7v1H3v-2H0v-2h2V7h1V5h1Z"/>
    <path fill="#87ac66" d="M1 10h2v1H1Zm3 1h2v2H4Zm7 0h2v2h-2ZM12 7h3v4h-4V9h1Z"/>
    <path fill="#7f693d" d="M4 6h1V5h4v1h1v2h1v3H3V8h1Z"/>
    <path fill="#bad082" d="M5 6h3v1h1v2H4V8h1Z"/>
    <path fill="#94a65e" d="M8 7h1v1h1v2H8V9H7V8h1ZM4 9h3v1H4Z"/>
    <path fill="#e8d28b" d="M3 10h8v1H3Z"/>
    <path fill="#313c31" d="M14 8h1v1h-1Z"/>
    <path fill="#e8a981" d="M13 9h1v1h-1Z"/>
  </g>;
}
