import { SETUP_SHEET_FIELDS, KART_DIAGRAM_HOTSPOTS } from "@/lib/setup-sheet";

const FIELD_BY_KEY = new Map(SETUP_SHEET_FIELDS.map((f) => [f.key, f]));

// Fixed anchor point on the kart illustration each hotspot's connector line
// points to, hand-placed to roughly match where that spec lives on a kart.
const ANCHORS: Record<string, { x: number; y: number }> = {
  camber: { x: 300, y: 95 },
  toe: { x: 300, y: 150 },
  caster: { x: 330, y: 60 },
  front_ride_height: { x: 370, y: 120 },
  axle: { x: 600, y: 330 },
  rear_bar: { x: 600, y: 385 },
  third_bearing: { x: 570, y: 350 },
  rear_ride_height: { x: 530, y: 410 },
};

const ROW_Y = [70, 170, 270, 370];
const BOX_H = 64;

function KartIllustration() {
  const stroke = "var(--kart-diagram-stroke, #71717a)";
  const strokeSoft = "var(--kart-diagram-stroke-soft, #52525b)";

  return (
    <g fill="none">
      {/* floor tray, drawn first so the frame/seat sit on top of it */}
      <rect x={393} y={185} width={114} height={210} rx={14} stroke={strokeSoft} strokeWidth={1} opacity={0.45} />

      {/* bare tube spaceframe */}
      <g stroke={stroke} strokeWidth={2.5} strokeLinecap="round">
        {/* main side rails, front hoop to rear hoop */}
        <path d="M 330 70 C 290 75, 278 95, 278 112 L 278 347 C 278 364, 290 384, 330 390" />
        <path d="M 570 70 C 610 75, 622 95, 622 112 L 622 347 C 622 364, 610 384, 570 390" />
        {/* front + rear hoops */}
        <path d="M 330 70 C 370 50, 430 45, 450 45 C 470 45, 530 50, 570 70" />
        <path d="M 330 390 C 370 408, 430 413, 450 413 C 470 413, 530 408, 570 390" />
        {/* cross-bracing */}
        <line x1={340} y1={95} x2={560} y2={365} strokeWidth={1.5} opacity={0.6} />
        <line x1={560} y1={95} x2={340} y2={365} strokeWidth={1.5} opacity={0.6} />
        {/* stub-axle arms out to each wheel hub */}
        <line x1={305} y1={112} x2={278} y2={112} />
        <line x1={595} y1={112} x2={622} y2={112} />
        <line x1={305} y1={347} x2={278} y2={347} />
        <line x1={595} y1={347} x2={622} y2={347} />
      </g>

      {/* nose cone */}
      <path
        d="M 420 8 C 425 -2, 475 -2, 480 8 L 478 24 C 465 30, 435 30, 422 24 Z"
        stroke={stroke}
        strokeWidth={2}
      />
      {/* front bumper + stays */}
      <rect x={258} y={30} width={384} height={13} rx={6.5} stroke={stroke} strokeWidth={2} />
      <line x1={310} y1={43} x2={330} y2={68} stroke={strokeSoft} strokeWidth={1.5} />
      <line x1={590} y1={43} x2={570} y2={68} stroke={strokeSoft} strokeWidth={1.5} />
      {/* rear bumper + stays + number plate */}
      <rect x={258} y={417} width={384} height={13} rx={6.5} stroke={stroke} strokeWidth={2} />
      <line x1={310} y1={417} x2={330} y2={392} stroke={strokeSoft} strokeWidth={1.5} />
      <line x1={590} y1={417} x2={570} y2={392} stroke={strokeSoft} strokeWidth={1.5} />
      <rect x={420} y={398} width={60} height={14} rx={3} stroke={strokeSoft} strokeWidth={1.5} opacity={0.7} />

      {/* radiator, front-mounted */}
      <rect x={420} y={58} width={60} height={26} rx={4} stroke={strokeSoft} strokeWidth={1.5} />
      {[428, 438, 448, 458, 468].map((x) => (
        <line key={x} x1={x} y1={58} x2={x} y2={84} stroke={strokeSoft} strokeWidth={1} opacity={0.6} />
      ))}

      {/* steering column + wheel with spokes */}
      <line x1={444} y1={148} x2={444} y2={200} stroke={stroke} strokeWidth={2} />
      <line x1={456} y1={148} x2={456} y2={200} stroke={stroke} strokeWidth={2} />
      <rect x={437} y={168} width={26} height={13} rx={3} stroke={stroke} strokeWidth={1.5} />
      <circle cx={450} cy={116} r={30} stroke={stroke} strokeWidth={2.5} />
      <circle cx={450} cy={116} r={5} stroke={stroke} strokeWidth={1.5} />
      <line x1={450} y1={90} x2={450} y2={111} stroke={stroke} strokeWidth={1.5} />
      <line x1={429} y1={130} x2={445} y2={120} stroke={stroke} strokeWidth={1.5} />
      <line x1={471} y1={130} x2={455} y2={120} stroke={stroke} strokeWidth={1.5} />

      {/* contoured bucket seat */}
      <path
        d="M 392 222 C 368 226, 358 258, 364 292 C 369 330, 382 362, 408 386
           C 426 401, 474 401, 492 386 C 518 362, 531 330, 536 292
           C 542 258, 532 226, 508 222 C 486 216, 414 216, 392 222 Z"
        stroke={stroke}
        strokeWidth={2.5}
      />
      <path d="M 400 250 C 392 275, 392 315, 404 345" stroke={strokeSoft} strokeWidth={1} opacity={0.6} />
      <path d="M 500 250 C 508 275, 508 315, 496 345" stroke={strokeSoft} strokeWidth={1} opacity={0.6} />

      {/* engine, sprockets, chain, exhaust — offset to one side like a real install */}
      <rect x={470} y={330} width={58} height={44} rx={6} stroke={strokeSoft} strokeWidth={1.5} />
      <circle cx={499} cy={374} r={9} stroke={strokeSoft} strokeWidth={1.5} />
      <circle cx={585} cy={347} r={17} stroke={strokeSoft} strokeWidth={1.5} />
      <line x1={499} y1={365} x2={585} y2={352} stroke={strokeSoft} strokeWidth={1} opacity={0.6} />
      <line x1={499} y1={383} x2={585} y2={362} stroke={strokeSoft} strokeWidth={1} opacity={0.6} />
      <path
        d="M 470 345 C 430 345, 415 365, 415 410"
        stroke={strokeSoft}
        strokeWidth={2}
        opacity={0.75}
      />

      {/* side pods, streamlined */}
      <path d="M 300 178 L 340 185 L 340 268 L 300 275 C 292 250, 292 200, 300 178 Z" stroke={stroke} strokeWidth={2} />
      <path d="M 600 178 L 560 185 L 560 268 L 600 275 C 608 250, 608 200, 600 178 Z" stroke={stroke} strokeWidth={2} />

      {/* wheels: tire + rim + brake disc */}
      {[
        { x: 250, y: 52 },
        { x: 595, y: 52 },
        { x: 250, y: 288 },
        { x: 595, y: 288 },
      ].map(({ x, y }) => {
        const innerSide = x < 400 ? "right" : "left";
        return (
          <g key={`${x}-${y}`}>
            <rect x={x} y={y} width={55} height={118} rx={10} stroke={stroke} strokeWidth={2.5} />
            <rect
              x={innerSide === "right" ? x + 24 : x + 6}
              y={y + 10}
              width={16}
              height={98}
              rx={6}
              stroke={strokeSoft}
              strokeWidth={1.5}
              opacity={0.8}
            />
            <circle
              cx={innerSide === "right" ? x + 42 : x + 13}
              cy={y + 59}
              r={12}
              stroke={strokeSoft}
              strokeWidth={1.5}
              opacity={0.85}
            />
            <circle cx={innerSide === "right" ? x + 42 : x + 13} cy={y + 59} r={3} fill={strokeSoft} opacity={0.85} />
          </g>
        );
      })}
    </g>
  );
}

function HotspotBox({
  side,
  y,
  label,
  value,
  anchor,
}: {
  side: "front" | "rear";
  y: number;
  label: string;
  value: string | null;
  anchor: { x: number; y: number };
}) {
  const boxX = side === "front" ? 10 : 690;
  const boxW = 200;
  const lineStartX = side === "front" ? boxX + boxW : boxX;

  return (
    <g>
      <line
        x1={lineStartX}
        y1={y + BOX_H / 2}
        x2={anchor.x}
        y2={anchor.y}
        stroke="var(--kart-diagram-line, #ef4444)"
        strokeWidth={1.5}
        opacity={0.6}
      />
      <circle cx={anchor.x} cy={anchor.y} r={3.5} fill="var(--kart-diagram-line, #ef4444)" />
      <rect
        x={boxX}
        y={y}
        width={boxW}
        height={BOX_H}
        rx={12}
        fill="var(--kart-diagram-box, #18181b)"
        stroke="var(--kart-diagram-box-border, #3f3f46)"
      />
      <text
        x={boxX + 16}
        y={y + 24}
        fontSize={11}
        letterSpacing={0.5}
        fill="var(--kart-diagram-label, #a1a1aa)"
        style={{ textTransform: "uppercase" }}
      >
        {label}
      </text>
      <text
        x={boxX + 16}
        y={y + 46}
        fontSize={18}
        fontWeight={600}
        fontFamily="var(--font-mono, ui-monospace)"
        fill="var(--kart-diagram-value, #ffffff)"
      >
        {value ?? "—"}
      </text>
    </g>
  );
}

export default function KartDiagram({ values }: { values: Record<string, unknown> | null }) {
  const front = KART_DIAGRAM_HOTSPOTS.filter((h) => h.side === "front");
  const rear = KART_DIAGRAM_HOTSPOTS.filter((h) => h.side === "rear");

  return (
    <svg viewBox="0 0 900 460" className="h-auto w-full">
      {front.map((h, i) => {
        const field = FIELD_BY_KEY.get(h.key)!;
        return (
          <HotspotBox
            key={h.key}
            side="front"
            y={ROW_Y[i]}
            label={field.label}
            value={(values?.[h.key] as string) ?? null}
            anchor={ANCHORS[h.key]}
          />
        );
      })}
      {rear.map((h, i) => {
        const field = FIELD_BY_KEY.get(h.key)!;
        return (
          <HotspotBox
            key={h.key}
            side="rear"
            y={ROW_Y[i]}
            label={field.label}
            value={(values?.[h.key] as string) ?? null}
            anchor={ANCHORS[h.key]}
          />
        );
      })}
      <KartIllustration />
    </svg>
  );
}
