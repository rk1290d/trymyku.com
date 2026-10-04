// The drawn plates that stand in for photos on SAMPLE work (pitch pages only). Drawn, never photographed, so no
// one can mistake a sample for his work. Generated from the approved design mock (src/view.py plate_svg).
const CREAM = '#E9E2CF';
const INK = '#15181B';
const PLATES: Record<PlateKind, { fit: string; art: string }> = {
  "disc": {
    "fit": "translate(120.0 108.5) scale(0.914) translate(-121.5 -103.5)",
    "art": "<circle cx=\"112\" cy=\"108\" r=\"68\"/><circle cx=\"112\" cy=\"108\" r=\"57\" stroke-opacity=\".42\"/><circle cx=\"112\" cy=\"108\" r=\"31\"/><circle cx=\"112\" cy=\"108\" r=\"11\"/><circle cx=\"112.0\" cy=\"88.0\" r=\"3.6\"/><circle cx=\"131.0\" cy=\"101.8\" r=\"3.6\"/><circle cx=\"123.8\" cy=\"124.2\" r=\"3.6\"/><circle cx=\"100.2\" cy=\"124.2\" r=\"3.6\"/><circle cx=\"93.0\" cy=\"101.8\" r=\"3.6\"/><circle cx=\"154.5\" cy=\"119.4\" r=\"2.2\" stroke-opacity=\".7\"/><circle cx=\"143.1\" cy=\"139.1\" r=\"2.2\" stroke-opacity=\".7\"/><circle cx=\"123.4\" cy=\"150.5\" r=\"2.2\" stroke-opacity=\".7\"/><circle cx=\"100.6\" cy=\"150.5\" r=\"2.2\" stroke-opacity=\".7\"/><circle cx=\"80.9\" cy=\"139.1\" r=\"2.2\" stroke-opacity=\".7\"/><circle cx=\"69.5\" cy=\"119.4\" r=\"2.2\" stroke-opacity=\".7\"/><circle cx=\"69.5\" cy=\"96.6\" r=\"2.2\" stroke-opacity=\".7\"/><circle cx=\"80.9\" cy=\"76.9\" r=\"2.2\" stroke-opacity=\".7\"/><circle cx=\"100.6\" cy=\"65.5\" r=\"2.2\" stroke-opacity=\".7\"/><circle cx=\"123.4\" cy=\"65.5\" r=\"2.2\" stroke-opacity=\".7\"/><circle cx=\"143.1\" cy=\"76.9\" r=\"2.2\" stroke-opacity=\".7\"/><circle cx=\"154.5\" cy=\"96.6\" r=\"2.2\" stroke-opacity=\".7\"/><path d=\"M146.0 108.0 L165.1 117.7\" stroke-opacity=\".3\"/><path d=\"M141.4 125.0 L153.2 142.9\" stroke-opacity=\".3\"/><path d=\"M129.0 137.4 L130.2 158.8\" stroke-opacity=\".3\"/><path d=\"M112.0 142.0 L102.3 161.1\" stroke-opacity=\".3\"/><path d=\"M95.0 137.4 L77.1 149.2\" stroke-opacity=\".3\"/><path d=\"M82.6 125.0 L61.2 126.2\" stroke-opacity=\".3\"/><path d=\"M78.0 108.0 L58.9 98.3\" stroke-opacity=\".3\"/><path d=\"M82.6 91.0 L70.8 73.1\" stroke-opacity=\".3\"/><path d=\"M95.0 78.6 L93.8 57.2\" stroke-opacity=\".3\"/><path d=\"M112.0 74.0 L121.7 54.9\" stroke-opacity=\".3\"/><path d=\"M129.0 78.6 L146.9 66.8\" stroke-opacity=\".3\"/><path d=\"M141.4 91.0 L162.8 89.8\" stroke-opacity=\".3\"/><g transform=\"translate(158 74) rotate(-38)\"><rect x=\"-19\" y=\"-40\" width=\"38\" height=\"80\" rx=\"13\" fill=\"#15181B\"/><path d=\"M-8 -26 V26\" stroke-opacity=\".55\"/><circle cx=\"9\" cy=\"-27\" r=\"4.5\"/><path d=\"M6 -6 h8 M6 4 h8\" stroke-opacity=\".55\"/><rect x=\"-19\" y=\"-40\" width=\"38\" height=\"80\" rx=\"13\" fill=\"none\"/></g><path d=\"M168 128 c10 10 14 22 12 36\" stroke-opacity=\".55\"/>"
  },
  "car-battery": {
    "fit": "translate(120.0 108.5) scale(0.805) translate(-121.0 -97.5)",
    "art": "<rect x=\"50\" y=\"84\" width=\"140\" height=\"96\" rx=\"11\"/><path d=\"M50 106 H190\" stroke-opacity=\".5\"/><rect x=\"72\" y=\"68\" width=\"24\" height=\"16\" rx=\"3\"/><rect x=\"144\" y=\"68\" width=\"24\" height=\"16\" rx=\"3\"/><path d=\"M79 128 h18 M88 119 v18\"/><path d=\"M143 128 h18\"/><rect x=\"70\" y=\"146\" width=\"100\" height=\"18\" rx=\"4\" stroke-opacity=\".42\"/><path d=\"M80 155 h40\" stroke-opacity=\".42\"/><path d=\"M84 68 C84 46 70 34 46 30\" stroke-width=\"5\"/><path d=\"M156 68 C156 44 172 34 196 32\" stroke-width=\"5\" stroke-opacity=\".7\"/><g transform=\"translate(46 30) rotate(-160)\"><path d=\"M0 -7 L22 -9 L26 -3 L0 0 Z M0 7 L22 9 L26 3 L0 0 Z\" fill=\"#15181B\"/></g><g transform=\"translate(196 32) rotate(-15)\"><path d=\"M0 -7 L22 -9 L26 -3 L0 0 Z M0 7 L22 9 L26 3 L0 0 Z\" fill=\"#15181B\" stroke-opacity=\".7\"/></g>"
  },
  "gauge": {
    "fit": "translate(120.0 108.5) scale(0.940) translate(-120.0 -119.0)",
    "art": "<rect x=\"26\" y=\"58\" width=\"188\" height=\"122\" rx=\"26\"/><path d=\"M40 70 Q120 50 200 70\" stroke-opacity=\".35\"/><circle cx=\"82\" cy=\"122\" r=\"40\"/><path d=\"M54.3 138.0 L50.0 140.5\"/><path d=\"M50.0 122.0 L45.0 122.0\"/><path d=\"M54.3 106.0 L50.0 103.5\"/><path d=\"M66.0 94.3 L63.5 90.0\"/><path d=\"M82.0 90.0 L82.0 85.0\"/><path d=\"M98.0 94.3 L100.5 90.0\"/><path d=\"M109.7 106.0 L114.0 103.5\"/><path d=\"M114.0 122.0 L119.0 122.0\"/><path d=\"M109.7 138.0 L114.0 140.5\"/><path d=\"M82 122 L55.7 112.4\" stroke-width=\"3.5\"/><circle cx=\"82\" cy=\"122\" r=\"4\" fill=\"#E9E2CF\"/><circle cx=\"160\" cy=\"122\" r=\"34\" stroke-opacity=\".35\"/><g transform=\"translate(139 101)\" fill=\"#E9E2CF\" stroke=\"none\"><rect x=\"10\" y=\"14\" width=\"26\" height=\"20\" rx=\"2\"/><rect x=\"15\" y=\"8\" width=\"13\" height=\"6\" rx=\"1\"/><rect x=\"19\" y=\"4\" width=\"5\" height=\"4\"/><rect x=\"3\" y=\"19\" width=\"7\" height=\"10\" rx=\"1\"/><rect x=\"36\" y=\"20\" width=\"6\" height=\"8\" rx=\"1\"/></g><path d=\"M122.4 108.3 L114.9 105.6\" stroke-opacity=\".7\"/><path d=\"M146.3 84.4 L143.6 76.9\" stroke-opacity=\".7\"/><path d=\"M173.7 84.4 L176.4 76.9\" stroke-opacity=\".7\"/><path d=\"M197.6 108.3 L205.1 105.6\" stroke-opacity=\".7\"/>"
  },
  "lightning": {
    "fit": "translate(120.0 108.5) scale(0.940) translate(-121.0 -111.0)",
    "art": "<circle cx=\"128\" cy=\"112\" r=\"56\"/><path d=\"M168.0 112.0 L178.0 112.0\" stroke-opacity=\".55\"/><path d=\"M165.0 127.3 L174.2 131.1\" stroke-opacity=\".55\"/><path d=\"M156.3 140.3 L163.4 147.4\" stroke-opacity=\".55\"/><path d=\"M143.3 149.0 L147.1 158.2\" stroke-opacity=\".55\"/><path d=\"M128.0 152.0 L128.0 162.0\" stroke-opacity=\".55\"/><path d=\"M112.7 149.0 L108.9 158.2\" stroke-opacity=\".55\"/><path d=\"M99.7 140.3 L92.6 147.4\" stroke-opacity=\".55\"/><path d=\"M91.0 127.3 L81.8 131.1\" stroke-opacity=\".55\"/><path d=\"M88.0 112.0 L78.0 112.0\" stroke-opacity=\".55\"/><path d=\"M91.0 96.7 L81.8 92.9\" stroke-opacity=\".55\"/><path d=\"M99.7 83.7 L92.6 76.6\" stroke-opacity=\".55\"/><path d=\"M112.7 75.0 L108.9 65.8\" stroke-opacity=\".55\"/><path d=\"M128.0 72.0 L128.0 62.0\" stroke-opacity=\".55\"/><path d=\"M143.3 75.0 L147.1 65.8\" stroke-opacity=\".55\"/><path d=\"M156.3 83.7 L163.4 76.6\" stroke-opacity=\".55\"/><path d=\"M165.0 96.7 L174.2 92.9\" stroke-opacity=\".55\"/><circle cx=\"128\" cy=\"112\" r=\"27\"/><circle cx=\"128\" cy=\"112\" r=\"21\" stroke-opacity=\".45\"/><circle cx=\"128\" cy=\"112\" r=\"8\"/><path d=\"M84 72 l-20 -14 a8 8 0 0 1 10 -12 l22 16\" fill=\"#15181B\"/><circle cx=\"70\" cy=\"54\" r=\"3.5\"/><path d=\"M168 150 l22 12 a8 8 0 0 1 -8 13 l-22 -12\" fill=\"#15181B\"/><circle cx=\"186\" cy=\"168\" r=\"3.5\"/><path d=\"M180 96 h16 M196 90 v12\"/><path d=\"M66 134 L48 160 H61 L56 180 L76 152 H63 Z\" fill=\"#E9E2CF\" stroke=\"none\"/>"
  }
};

export type PlateKind = 'disc' | 'car-battery' | 'gauge' | 'lightning';

/** Which plate suits a sample job, from its service words. */
export function plateKind(service: string | null | undefined): PlateKind {
  const s = (service ?? '').toLowerCase();
  if (/brake|rotor|pad/.test(s)) return 'disc';
  if (/batter/.test(s)) return 'car-battery';
  if (/diagnos|engine|emission|evap|check|light|tune|sensor/.test(s)) return 'gauge';
  return 'lightning';
}

export function Plate({ kind, board }: { kind: PlateKind; board: string }) {
  const p = PLATES[kind];
  return (
    <svg className="plate" viewBox="0 0 240 240" aria-hidden="true" focusable="false">
      <rect width="240" height="240" fill={INK} />
      <path d="M14 16 H226 M14 21 H226" stroke={CREAM} strokeOpacity=".16" strokeWidth="1.2" />
      <g transform={p.fit}>
        <g
          fill="none"
          stroke={CREAM}
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          dangerouslySetInnerHTML={{ __html: p.art }}
        />
      </g>
      <path d="M14 196 H226 M14 201 H226" stroke={CREAM} strokeOpacity=".16" strokeWidth="1.2" />
      <text
        x="120"
        y="226"
        textAnchor="middle"
        fill={CREAM}
        fontFamily="var(--sign)"
        fontWeight="800"
        fontSize="19"
        letterSpacing="2.6"
      >
        {board.toUpperCase()}
      </text>
    </svg>
  );
}
