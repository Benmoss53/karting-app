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
  return (
    <g>
      {/* frame tube rails + cross-bracing, drawn first so everything else sits on top */}
      <g stroke="var(--kart-diagram-stroke, #52525b)" strokeWidth={2} fill="none" opacity={0.7}>
        <line x1={278} y1={112} x2={622} y2={112} />
        <line x1={278} y1={347} x2={622} y2={347} />
        <line x1={340} y1={90} x2={560} y2={370} />
        <line x1={560} y1={90} x2={340} y2={370} />
        {/* stub-axle arms from rail to each wheel hub */}
        <line x1={305} y1={112} x2={278} y2={112} />
        <line x1={595} y1={112} x2={622} y2={112} />
        <line x1={305} y1={347} x2={278} y2={347} />
        <line x1={595} y1={347} x2={622} y2={347} />
      </g>

      {/* front bumper */}
      <rect
        x={255}
        y={18}
        width={390}
        height={20}
        rx={10}
        stroke="var(--kart-diagram-stroke, #52525b)"
        strokeWidth={2}
        fill="none"
      />
      {/* rear bumper */}
      <rect
        x={255}
        y={422}
        width={390}
        height={20}
        rx={10}
        stroke="var(--kart-diagram-stroke, #52525b)"
        strokeWidth={2}
        fill="none"
      />

      {/* body pod */}
      <rect
        x={340}
        y={40}
        width={220}
        height={380}
        rx={50}
        stroke="var(--kart-diagram-stroke, #52525b)"
        strokeWidth={2}
        fill="none"
      />
      {/* radiator */}
      <rect
        x={420}
        y={55}
        width={60}
        height={28}
        rx={4}
        stroke="var(--kart-diagram-stroke, #52525b)"
        strokeWidth={1.5}
        fill="none"
      />
      <line x1={428} y1={55} x2={428} y2={83} stroke="var(--kart-diagram-stroke, #52525b)" strokeWidth={1} opacity={0.6} />
      <line x1={438} y1={55} x2={438} y2={83} stroke="var(--kart-diagram-stroke, #52525b)" strokeWidth={1} opacity={0.6} />
      <line x1={448} y1={55} x2={448} y2={83} stroke="var(--kart-diagram-stroke, #52525b)" strokeWidth={1} opacity={0.6} />
      <line x1={458} y1={55} x2={458} y2={83} stroke="var(--kart-diagram-stroke, #52525b)" strokeWidth={1} opacity={0.6} />
      <line x1={468} y1={55} x2={468} y2={83} stroke="var(--kart-diagram-stroke, #52525b)" strokeWidth={1} opacity={0.6} />

      {/* steering column + wheel */}
      <line x1={444} y1={152} x2={444} y2={205} stroke="var(--kart-diagram-stroke, #52525b)" strokeWidth={2} />
      <line x1={456} y1={152} x2={456} y2={205} stroke="var(--kart-diagram-stroke, #52525b)" strokeWidth={2} />
      <rect x={438} y={173} width={24} height={12} rx={3} stroke="var(--kart-diagram-stroke, #52525b)" strokeWidth={1.5} fill="none" />
      <circle cx={450} cy={120} r={32} stroke="var(--kart-diagram-stroke, #52525b)" strokeWidth={2} fill="none" />
      <circle cx={450} cy={120} r={6} stroke="var(--kart-diagram-stroke, #52525b)" strokeWidth={1.5} fill="none" />

      {/* seat + headrest */}
      <ellipse cx={450} cy={300} rx={65} ry={85} stroke="var(--kart-diagram-stroke, #52525b)" strokeWidth={2} fill="none" />
      <rect x={410} y={225} width={80} height={18} rx={8} stroke="var(--kart-diagram-stroke, #52525b)" strokeWidth={1.5} fill="none" />

      {/* engine block + sprockets + chain */}
      <rect x={410} y={340} width={60} height={45} rx={6} stroke="var(--kart-diagram-stroke, #52525b)" strokeWidth={1.5} fill="none" />
      <circle cx={440} cy={385} r={9} stroke="var(--kart-diagram-stroke, #52525b)" strokeWidth={1.5} fill="none" />
      <circle cx={440} cy={347} r={16} stroke="var(--kart-diagram-stroke, #52525b)" strokeWidth={1.5} fill="none" />
      <line x1={440} y1={331} x2={440} y2={356} stroke="var(--kart-diagram-stroke, #52525b)" strokeWidth={1} opacity={0.6} />
      {/* exhaust pipe sweeping to the side */}
      <path
        d="M 470 355 C 520 355, 540 380, 540 410"
        stroke="var(--kart-diagram-stroke, #52525b)"
        strokeWidth={2}
        fill="none"
        opacity={0.7}
      />

      {/* side pods */}
      <rect x={305} y={175} width={35} height={95} rx={10} stroke="var(--kart-diagram-stroke, #52525b)" strokeWidth={2} fill="none" />
      <rect x={560} y={175} width={35} height={95} rx={10} stroke="var(--kart-diagram-stroke, #52525b)" strokeWidth={2} fill="none" />

      {/* wheels, each with a brake disc */}
      {[
        { x: 250, y: 55 },
        { x: 595, y: 55 },
        { x: 250, y: 290 },
        { x: 595, y: 290 },
      ].map(({ x, y }) => (
        <g key={`${x}-${y}`}>
          <rect x={x} y={y} width={55} height={115} rx={12} stroke="var(--kart-diagram-stroke, #52525b)" strokeWidth={2} fill="none" />
          <circle
            cx={x < 400 ? x + 40 : x + 15}
            cy={y + 57}
            r={13}
            stroke="var(--kart-diagram-stroke, #52525b)"
            strokeWidth={1.5}
            fill="none"
            opacity={0.7}
          />
        </g>
      ))}
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
