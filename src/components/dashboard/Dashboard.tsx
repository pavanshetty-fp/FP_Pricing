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
import * as React from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { cn } from "@/lib/utils";
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
  light-mode reference (28262:23317). Core card types only:
  KPI stat card, metric + area chart, segmented figures, and a table card.
  Charts use Recharts, themed with our CSS-var tokens.
*/

/** Shared card surface — Surface-1a on a hairline, rounded-lg. */
function Card({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border border-fp-outline-1 bg-fp-surface-1a",
        className
      )}
    >
      {children}
    </div>
  );
}

/** Green (up) / red (down) delta pill. */
function Delta({ value, up }: { value: string; up: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-xs font-medium",
        up
          ? "bg-status-success/15 text-status-success"
          : "bg-destructive/15 text-destructive"
      )}
    >
      {up ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />}
      {value}
    </span>
  );
}

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
        <span className="text-2xl font-semibold tabular-nums text-foreground">
          {stat.value}
        </span>
        <Delta value={stat.delta} up={stat.up} />
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        vs. {stat.prev} last period
      </p>
    </Card>
  );
}

const PROFIT = [
  { d: "1 Jan", v: 5200 },
  { d: "8 Jan", v: 6100 },
  { d: "15 Jan", v: 5563 },
  { d: "18 Jan", v: 12324 },
  { d: "22 Jan", v: 9800 },
  { d: "29 Jan", v: 13100 },
];

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-fp-outline-1 bg-fp-card-1 px-3 py-2 text-xs shadow-md">
      <p className="font-medium text-foreground">{label}</p>
      <p className="mt-0.5 text-muted-foreground">
        <span className="font-semibold text-foreground">
          ${payload[0].value.toLocaleString()}
        </span>{" "}
        this month
      </p>
    </div>
  );
}

/**
 * Resolve DS color tokens to hex. Recharts writes colors as SVG presentation
 * attributes, where `var(--token)` does NOT resolve — so we read the computed
 * values off an in-tree element (theme-aware) and re-read when the theme flips.
 */
function useTokenColors(ref: React.RefObject<HTMLElement | null>) {
  const [c, setC] = React.useState({
    brand: "#fa6400",
    grid: "#363c45",
    muted: "#9ca3af",
    cursor: "#575757",
  });
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const read = () => {
      const cs = getComputedStyle(el);
      const v = (n: string, f: string) => cs.getPropertyValue(n).trim() || f;
      setC({
        brand: v("--brand", "#fa6400"),
        grid: v("--fp-outline-1", "#363c45"),
        muted: v("--muted-foreground", "#9ca3af"),
        cursor: v("--fp-outline-2", "#575757"),
      });
    };
    read();
    const obs = new MutationObserver(read);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, [ref]);
  return c;
}

function ProfitCard() {
  const ref = React.useRef<HTMLDivElement>(null);
  const c = useTokenColors(ref);
  return (
    <Card className="flex flex-col p-5">
      <div ref={ref} className="flex items-start justify-between">
        <h3 className="text-sm font-medium text-foreground">Total Profit</h3>
        <MoreHorizontal className="size-4 text-muted-foreground" />
      </div>
      <div className="mt-2 flex items-center gap-2">
        <span className="text-3xl font-semibold tabular-nums text-foreground">
          $446.7K
        </span>
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
            <XAxis
              dataKey="d"
              tickLine={false}
              axisLine={false}
              tick={{ fill: c.muted, fontSize: 11 }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={40}
              domain={[0, 15000]}
              ticks={[0, 5000, 10000, 15000]}
              tickFormatter={(v: number) => `${v / 1000}K`}
              tick={{ fill: c.muted, fontSize: 11 }}
            />
            <Tooltip content={<ChartTooltip />} cursor={{ stroke: c.cursor }} />
            <Area
              type="monotone"
              dataKey="v"
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
      <div className="flex items-start justify-between">
        <h3 className="text-sm font-medium text-foreground">Customers</h3>
        <MoreHorizontal className="size-4 text-muted-foreground" />
      </div>
      {/* Stacked proportion bar */}
      <div className="mt-4 flex h-2 w-full overflow-hidden rounded-full">
        {SEGMENTS.map((s) => (
          <div
            key={s.label}
            className={cn("h-full", s.color)}
            style={{ width: `${(s.value / total) * 100}%` }}
          />
        ))}
      </div>
      {/* Figures */}
      <div className="mt-5 grid grid-cols-3 gap-3">
        {SEGMENTS.map((s) => (
          <div key={s.label} className="flex flex-col gap-1">
            <span
              className={cn(
                "inline-flex size-7 items-center justify-center rounded-md text-white [&_svg]:size-4",
                s.color
              )}
            >
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
      <div className="flex items-start justify-between">
        <h3 className="text-sm font-medium text-foreground">Best Selling Products</h3>
        <MoreHorizontal className="size-4 text-muted-foreground" />
      </div>
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
                <TableCell className="text-xs text-muted-foreground tabular-nums">
                  {p.id}
                </TableCell>
                <TableCell>
                  <span className="flex items-center gap-2.5">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-fp-card-1 text-muted-foreground">
                      <Package className="size-4" />
                    </span>
                    <span className="truncate text-sm text-foreground">{p.name}</span>
                  </span>
                </TableCell>
                <TableCell className="text-right text-sm tabular-nums text-muted-foreground">
                  {p.sold}
                </TableCell>
                <TableCell className="text-right text-sm font-medium tabular-nums text-status-success">
                  {p.revenue}
                </TableCell>
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
  return (
    <div className="h-full overflow-auto pb-6">
      <div className="flex flex-col gap-4">
        {/* KPI row */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STATS.map((s) => (
            <StatCard key={s.title} stat={s} />
          ))}
        </div>
        {/* Metric chart + segmented */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <ProfitCard />
          </div>
          <CustomersCard />
        </div>
        {/* Table */}
        <BestSellingCard />
      </div>
    </div>
  );
}
