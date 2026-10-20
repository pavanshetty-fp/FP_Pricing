import * as React from "react";
import {
  Eye,
  Users,
  MousePointer2,
  ShoppingCart,
  MoreHorizontal,
  ArrowUp,
  ArrowDown,
  Store,
  Truck,
  Warehouse,
  Star,
  Package,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

/*
  Dashboard — analytics card templates recreated in FP DS 2026 style from a
  light-mode reference (28262:23317), plus the full Recharts chart-card set
  (449:6176): area, bar, radial gauge, donut, line, and radar. Charts use
  Recharts themed with our CSS-var tokens.
*/

/** Categorical series palette — mirrors --color-chart-1..5 (theme-independent). */
const CHART = ["#fa6400", "#3b82f6", "#22c55e", "#eab308", "#8b5cf6"];

interface ThemeColors {
  brand: string;
  grid: string;
  muted: string;
  cursor: string;
  track: string;
}
const DEFAULT_COLORS: ThemeColors = {
  brand: "#fa6400",
  grid: "#363c45",
  muted: "#9ca3af",
  cursor: "#575757",
  track: "#2a2f37",
};
const ColorsCtx = React.createContext<ThemeColors>(DEFAULT_COLORS);
const useColors = () => React.useContext(ColorsCtx);

/**
 * Resolve theme-dependent chart chrome to hex. Recharts writes colors as SVG
 * presentation attributes where `var(--token)` is inert, so we read computed
 * values off an in-tree element and re-read when the theme class flips.
 */
function useThemeColors(ref: React.RefObject<HTMLElement | null>) {
  const [c, setC] = React.useState(DEFAULT_COLORS);
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const read = () => {
      const cs = getComputedStyle(el);
      const v = (n: string, f: string) => cs.getPropertyValue(n).trim() || f;
      setC({
        brand: v("--brand", DEFAULT_COLORS.brand),
        grid: v("--fp-outline-1", DEFAULT_COLORS.grid),
        muted: v("--muted-foreground", DEFAULT_COLORS.muted),
        cursor: v("--fp-outline-2", DEFAULT_COLORS.cursor),
        track: v("--fp-card-1", DEFAULT_COLORS.track),
      });
    };
    read();
    const obs = new MutationObserver(read);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, [ref]);
  return c;
}

/** Shared card surface — Surface-1a on a hairline, rounded-lg. */
function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("rounded-lg border border-fp-outline-1 bg-fp-surface-1a", className)}>
      {children}
    </div>
  );
}

/** Card header — title + a "more" affordance. */
function CardHead({ title }: { title: string }) {
  return (
    <div className="flex items-start justify-between">
      <h3 className="text-sm font-medium text-foreground">{title}</h3>
      <MoreHorizontal className="size-4 text-muted-foreground" />
    </div>
  );
}

/** Green (up) / red (down) delta pill. */
function Delta({ value, up }: { value: string; up: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-xs font-medium",
        up ? "bg-fp-trend-up-bg text-fp-trend-up" : "bg-destructive/15 text-destructive"
      )}
    >
      {up ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />}
      {value}
    </span>
  );
}

/** Generic dark tooltip for the chart cards. */
function ChartTip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number | string; name?: string; color?: string; fill?: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-fp-outline-1 bg-fp-card-1 px-3 py-2 text-xs shadow-md">
      {label && <p className="mb-1 font-medium text-foreground">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} className="flex items-center gap-1.5 text-muted-foreground">
          <span
            className="size-2 rounded-xs"
            style={{ background: p.color || p.fill || "var(--brand)" }}
          />
          <span className="font-semibold text-foreground">
            {typeof p.value === "number" ? p.value.toLocaleString() : p.value}
          </span>
          {p.name}
        </p>
      ))}
    </div>
  );
}

/* ─── KPI stat cards ─────────────────────────────────────────────────────── */

interface Stat {
  title: string;
  icon: React.ReactNode;
  value: string;
  delta: string;
  up: boolean;
  prev: string;
}
const STATS: Stat[] = [
  { title: "Page Views", icon: <Eye />, value: "16,431", delta: "15.5%", up: true, prev: "14,653" },
  { title: "Visitors", icon: <Users />, value: "6,225", delta: "8.4%", up: true, prev: "5,732" },
  { title: "Click", icon: <MousePointer2 />, value: "2,832", delta: "10.5%", up: false, prev: "3,294" },
  { title: "Orders", icon: <ShoppingCart />, value: "1,224", delta: "4.4%", up: true, prev: "1,186" },
];

function StatCard({ stat }: { stat: Stat }) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between">
        <span className="text-sm font-medium text-foreground">{stat.title}</span>
        <span className="text-muted-foreground [&_svg]:size-4">{stat.icon}</span>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <span className="text-2xl font-semibold tabular-nums text-foreground">{stat.value}</span>
        <Delta value={stat.delta} up={stat.up} />
      </div>
      <p className="mt-1 text-xs text-muted-foreground">vs. {stat.prev} last period</p>
    </Card>
  );
}

/* ─── Area chart (Total Profit) ──────────────────────────────────────────── */

const PROFIT = [
  { d: "1 Jan", v: 5200 },
  { d: "8 Jan", v: 6100 },
  { d: "15 Jan", v: 5563 },
  { d: "18 Jan", v: 12324 },
  { d: "22 Jan", v: 9800 },
  { d: "29 Jan", v: 13100 },
];

function ProfitCard() {
  const c = useColors();
  return (
    <Card className="flex flex-col p-5">
      <CardHead title="Total Profit" />
      <div className="mt-2 flex items-center gap-2">
        <span className="text-3xl font-semibold tabular-nums text-foreground">$446.7K</span>
        <Delta value="24.4%" up />
      </div>
      <p className="mt-1 text-xs text-muted-foreground">vs. last period</p>
      <div className="mt-4 h-[200px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={PROFIT} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
            <defs>
              <linearGradient id="profitFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={c.brand} stopOpacity={0.35} />
                <stop offset="100%" stopColor={c.brand} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke={c.grid} />
            <XAxis dataKey="d" tickLine={false} axisLine={false} tick={{ fill: c.muted, fontSize: 11 }} />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={40}
              domain={[0, 15000]}
              ticks={[0, 5000, 10000, 15000]}
              tickFormatter={(v: number) => `${v / 1000}K`}
              tick={{ fill: c.muted, fontSize: 11 }}
            />
            <Tooltip content={<ChartTip />} cursor={{ stroke: c.cursor }} />
            <Area
              type="monotone"
              dataKey="v"
              name="Profit"
              stroke={c.brand}
              strokeWidth={2}
              fill="url(#profitFill)"
              dot={false}
              activeDot={{ r: 4, fill: c.brand }}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

/* ─── Customers (segmented) ──────────────────────────────────────────────── */

interface Segment {
  icon: React.ReactNode;
  value: number;
  label: string;
  color: string;
}
const SEGMENTS: Segment[] = [
  { icon: <Store />, value: 2884, label: "Retailers", color: "bg-status-success" },
  { icon: <Truck />, value: 1432, label: "Distributors", color: "bg-verified" },
  { icon: <Warehouse />, value: 562, label: "Wholesalers", color: "bg-brand" },
];

function CustomersCard() {
  const total = SEGMENTS.reduce((s, x) => s + x.value, 0);
  return (
    <Card className="flex flex-col p-5">
      <CardHead title="Customers" />
      <div className="mt-4 flex h-2 w-full overflow-hidden rounded-full">
        {SEGMENTS.map((s) => (
          <div key={s.label} className={cn("h-full", s.color)} style={{ width: `${(s.value / total) * 100}%` }} />
        ))}
      </div>
      <div className="mt-5 grid grid-cols-3 gap-3">
        {SEGMENTS.map((s) => (
          <div key={s.label} className="flex flex-col gap-1">
            <span className={cn("inline-flex size-7 items-center justify-center rounded-md text-status-foreground [&_svg]:size-4", s.color)}>
              {s.icon}
            </span>
            <span className="mt-1 text-lg font-semibold tabular-nums text-foreground">
              {s.value.toLocaleString()}
            </span>
            <span className="text-xs text-muted-foreground">{s.label}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

/* ─── Bar chart (Most Day Active) ────────────────────────────────────────── */

const DAYS = [
  { d: "Sun", v: 5200, hi: false },
  { d: "Mon", v: 4100, hi: false },
  { d: "Tue", v: 8162, hi: true },
  { d: "Wed", v: 3800, hi: false },
  { d: "Thu", v: 4600, hi: false },
  { d: "Fri", v: 6100, hi: false },
  { d: "Sat", v: 5400, hi: false },
];

function BarCard() {
  const c = useColors();
  return (
    <Card className="flex flex-col p-5">
      <CardHead title="Most Day Active" />
      <div className="mt-4 h-[200px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={DAYS} margin={{ top: 8, right: 8, bottom: 0, left: -24 }}>
            <CartesianGrid vertical={false} stroke={c.grid} />
            <XAxis dataKey="d" tickLine={false} axisLine={false} tick={{ fill: c.muted, fontSize: 11 }} />
            <YAxis tickLine={false} axisLine={false} tick={{ fill: c.muted, fontSize: 11 }} width={48} hide />
            <Tooltip content={<ChartTip />} cursor={{ fill: c.grid, fillOpacity: 0.4 }} />
            <Bar dataKey="v" name="Active" radius={[6, 6, 0, 0]} isAnimationActive={false}>
              {DAYS.map((e, i) => (
                <Cell key={i} fill={e.hi ? c.brand : c.track} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

/* ─── Radial gauge (Repeat Customer Rate) ────────────────────────────────── */

function RadialCard() {
  const c = useColors();
  return (
    <Card className="flex flex-col p-5">
      <CardHead title="Repeat Customer Rate" />
      <div className="relative mt-2 h-[200px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart
            data={[{ value: 68, fill: c.brand }]}
            innerRadius={72}
            outerRadius={100}
            barSize={14}
            startAngle={90}
            endAngle={-270}
          >
            <PolarAngleAxis type="number" domain={[0, 100]} tick={false} axisLine={false} />
            <RadialBar dataKey="value" cornerRadius={10} background={{ fill: c.track }} isAnimationActive={false} />
          </RadialBarChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-semibold text-foreground">68%</span>
          <span className="text-xs text-muted-foreground">On track for 80% target</span>
        </div>
      </div>
      <div className="mt-2 flex justify-center">
        <Button variant="outline" size="sm">
          Show details
        </Button>
      </div>
    </Card>
  );
}

/* ─── Donut (Sales by Channel) ───────────────────────────────────────────── */

const CHANNELS = [
  { name: "Direct", value: 4200 },
  { name: "Referral", value: 3100 },
  { name: "Organic", value: 2400 },
  { name: "Social", value: 1500 },
];

function DonutCard() {
  return (
    <Card className="flex flex-col p-5">
      <CardHead title="Sales by Channel" />
      <div className="mt-2 h-[200px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={CHANNELS}
              dataKey="value"
              nameKey="name"
              innerRadius={56}
              outerRadius={88}
              paddingAngle={2}
              stroke="none"
              isAnimationActive={false}
            >
              {CHANNELS.map((_, i) => (
                <Cell key={i} fill={CHART[i % CHART.length]} />
              ))}
            </Pie>
            <Tooltip content={<ChartTip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2">
        {CHANNELS.map((ch, i) => (
          <div key={ch.name} className="flex items-center gap-2 text-xs">
            <span className="size-2 rounded-xs" style={{ background: CHART[i % CHART.length] }} />
            <span className="text-foreground">{ch.name}</span>
            <span className="ml-auto tabular-nums text-muted-foreground">
              {ch.value.toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}

/* ─── Line chart (Revenue) ───────────────────────────────────────────────── */

const REVENUE = [
  { m: "Jan", a: 4200, b: 2400 },
  { m: "Feb", a: 3800, b: 2800 },
  { m: "Mar", a: 5100, b: 3200 },
  { m: "Apr", a: 4700, b: 3000 },
  { m: "May", a: 6200, b: 4100 },
  { m: "Jun", a: 5800, b: 4600 },
];

function LineCard() {
  const c = useColors();
  return (
    <Card className="flex flex-col p-5">
      <CardHead title="Revenue" />
      <div className="mt-4 h-[220px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={REVENUE} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
            <CartesianGrid vertical={false} stroke={c.grid} />
            <XAxis dataKey="m" tickLine={false} axisLine={false} tick={{ fill: c.muted, fontSize: 11 }} />
            <YAxis tickLine={false} axisLine={false} width={40} tick={{ fill: c.muted, fontSize: 11 }} />
            <Tooltip content={<ChartTip />} cursor={{ stroke: c.cursor }} />
            <Line type="monotone" dataKey="a" name="This year" stroke={CHART[0]} strokeWidth={2} dot={false} isAnimationActive={false} />
            <Line type="monotone" dataKey="b" name="Last year" stroke={CHART[1]} strokeWidth={2} dot={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

/* ─── Radar chart (Performance) ──────────────────────────────────────────── */

const RADAR = [
  { metric: "Speed", v: 120 },
  { metric: "Reliability", v: 98 },
  { metric: "Comfort", v: 86 },
  { metric: "Safety", v: 110 },
  { metric: "Efficiency", v: 99 },
  { metric: "Cost", v: 85 },
];

function RadarCard() {
  const c = useColors();
  return (
    <Card className="flex flex-col p-5">
      <CardHead title="Performance" />
      <div className="mt-4 h-[220px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={RADAR} outerRadius={88}>
            <PolarGrid stroke={c.grid} />
            <PolarAngleAxis dataKey="metric" tick={{ fill: c.muted, fontSize: 11 }} />
            <Tooltip content={<ChartTip />} />
            <Radar
              dataKey="v"
              name="Score"
              stroke={c.brand}
              fill={c.brand}
              fillOpacity={0.3}
              isAnimationActive={false}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

/* ─── Table (Best Selling Products) ──────────────────────────────────────── */

interface Product {
  id: string;
  name: string;
  sold: string;
  revenue: string;
  rating: string;
}
const PRODUCTS: Product[] = [
  { id: "#83009", name: "Hybrid Active Noise Cancelling", sold: "2,310 sold", revenue: "$124,839", rating: "4.5" },
  { id: "#83001", name: "Casio G-Shock Mesh Resin", sold: "1,230 sold", revenue: "$92,662", rating: "4.8" },
  { id: "#83004", name: "SAMSUNG Galaxy S25 Ultra", sold: "812 sold", revenue: "$74,048", rating: "4.7" },
  { id: "#83002", name: "Xbox Wireless Gaming Controller", sold: "645 sold", revenue: "$62,800", rating: "4.5" },
];

function BestSellingCard() {
  return (
    <Card className="p-5">
      <CardHead title="Best Selling Products" />
      <div className="mt-4">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-20">ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead className="text-right">Sold</TableHead>
              <TableHead className="text-right">Revenue</TableHead>
              <TableHead className="text-right">Rating</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {PRODUCTS.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="text-xs tabular-nums text-muted-foreground">{p.id}</TableCell>
                <TableCell>
                  <span className="flex items-center gap-2.5">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-fp-card-1 text-muted-foreground">
                      <Package className="size-4" />
                    </span>
                    <span className="truncate text-sm text-foreground">{p.name}</span>
                  </span>
                </TableCell>
                <TableCell className="text-right text-sm tabular-nums text-muted-foreground">{p.sold}</TableCell>
                <TableCell className="text-right text-sm font-medium tabular-nums text-status-success">{p.revenue}</TableCell>
                <TableCell className="text-right">
                  <span className="inline-flex items-center justify-end gap-1 text-sm tabular-nums text-foreground">
                    <Star className="size-3.5 fill-status-processing text-status-processing" />
                    {p.rating}
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}

export function Dashboard() {
  const ref = React.useRef<HTMLDivElement>(null);
  const colors = useThemeColors(ref);
  return (
    <ColorsCtx.Provider value={colors}>
      <div ref={ref} className="h-full overflow-auto pb-6">
        <div className="flex flex-col gap-4">
          {/* KPI row */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {STATS.map((s) => (
              <StatCard key={s.title} stat={s} />
            ))}
          </div>
          {/* Area + segmented */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <ProfitCard />
            </div>
            <CustomersCard />
          </div>
          {/* Bar + radial + donut */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <BarCard />
            <RadialCard />
            <DonutCard />
          </div>
          {/* Line + radar */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <LineCard />
            <RadarCard />
          </div>
          {/* Table */}
          <BestSellingCard />
        </div>
      </div>
    </ColorsCtx.Provider>
  );
}
