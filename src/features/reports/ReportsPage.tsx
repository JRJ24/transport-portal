import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, Info } from "lucide-react";
import { toast } from "sonner";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button, PageHeader } from "@/components/ui";
import { label } from "@/lib/labels";
import { formatMoney } from "@/lib/money";
import { tmsService, type ReportFormat } from "@/services/tms.service";

type RangeId = "today" | "7" | "30" | "month" | "custom";

const RANGES: { id: RangeId; label: string }[] = [
  { id: "today", label: "Hoy" },
  { id: "7", label: "7 días" },
  { id: "30", label: "30 días" },
  { id: "month", label: "Este mes" },
  { id: "custom", label: "Personalizado" },
];

function rangeFor(id: RangeId, customFrom: string, customTo: string) {
  const now = new Date();
  const start = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
  if (id === "today") return { from: start(now), to: now };
  if (id === "month") return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: now };
  if (id === "custom" && customFrom && customTo) {
    return { from: new Date(`${customFrom}T00:00:00`), to: new Date(`${customTo}T23:59:59`) };
  }
  const days = id === "7" ? 7 : 30;
  return { from: start(new Date(now.getTime() - (days - 1) * 86_400_000)), to: now };
}

const pct = (value: number | null | undefined) => (value == null ? "—" : `${(value * 100).toFixed(1)} %`);
const shortDate = (value: string) => new Date(`${value}T12:00:00`).toLocaleDateString("es-DO", { day: "2-digit", month: "short" });

/** Reporte gerencial: cifras con definicion, series reales y exportes que descargan lo que se ve. */
export function ReportsPage() {
  const [rangeId, setRangeId] = useState<RangeId>("30");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [exporting, setExporting] = useState<ReportFormat | null>(null);
  const range = useMemo(() => rangeFor(rangeId, customFrom, customTo), [rangeId, customFrom, customTo]);
  const query = useMemo(() => ({ from: range.from.toISOString(), to: range.to.toISOString() }), [range]);
  const summaryQuery = useQuery({ queryKey: ["reports", "summary", query], queryFn: () => tmsService.reportsSummary(query) });
  const data = summaryQuery.data;

  const download = async (format: ReportFormat) => {
    setExporting(format);
    try {
      const blob = await tmsService.exportReport("summary", format, query);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `reporte-ruta-rd-${query.from.slice(0, 10)}-a-${query.to.slice(0, 10)}.${format}`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo exportar el reporte");
    } finally {
      setExporting(null);
    }
  };

  const kpis = data
    ? [
        { label: "Ingresos", value: formatMoney(data.revenue.total), help: "Suma de pagos confirmados o autorizados (cheque, crédito). No incluye pagos fallidos ni pendientes." },
        { label: "Órdenes", value: String(data.orders.total), help: "Órdenes creadas en el periodo, en cualquier estado." },
        { label: "Entregadas", value: String(data.orders.delivered), help: "Órdenes creadas en el periodo que ya se entregaron." },
        { label: "Ticket promedio", value: data.revenue.averageTicket == null ? "—" : formatMoney(data.revenue.averageTicket), help: "Ingresos divididos entre la cantidad de pagos confirmados." },
        { label: "Entregas a tiempo", value: pct(data.onTime.rate), help: `Entregada antes de recogida + duración estimada + 15 min. Medibles: ${data.onTime.measured} entregas con horas registradas.` },
        { label: "Cancelación", value: pct(data.orders.cancellationRate), help: "Órdenes canceladas entre órdenes creadas." },
      ]
    : [];

  return (
    <div>
      <PageHeader title="Reportes" subtitle="Operación e ingresos del periodo, con la definición de cada cifra." />

      <div className="report-toolbar">
        <div className="segmented" role="tablist">
          {RANGES.map((item) => (
            <button key={item.id} type="button" className={rangeId === item.id ? "active" : ""} aria-pressed={rangeId === item.id} onClick={() => setRangeId(item.id)}>
              {item.label}
            </button>
          ))}
        </div>
        {rangeId === "custom" ? (
          <div className="report-custom-range">
            <input type="date" value={customFrom} onChange={(event) => setCustomFrom(event.target.value)} aria-label="Desde" />
            <span>a</span>
            <input type="date" value={customTo} onChange={(event) => setCustomTo(event.target.value)} aria-label="Hasta" />
          </div>
        ) : null}
        <div className="report-exports">
          {(["xlsx", "pdf", "csv"] as ReportFormat[]).map((format) => (
            <Button key={format} type="button" variant="secondary" disabled={!data || exporting !== null} onClick={() => void download(format)}>
              <Download size={14} /> {exporting === format ? "Generando..." : format === "xlsx" ? "Excel" : format.toUpperCase()}
            </Button>
          ))}
        </div>
      </div>

      {summaryQuery.isError ? <div className="inline-alert">No se pudo cargar el reporte.</div> : null}
      {summaryQuery.isLoading ? <div className="inline-alert inline-alert--info">Calculando el reporte...</div> : null}

      {data ? (
        <>
          <section className="kpi-grid">
            {kpis.map((kpi) => (
              <article className="kpi-card" key={kpi.label}>
                <header>
                  <span>{kpi.label}</span>
                  <span className="kpi-help" tabIndex={0} aria-label={kpi.help} title={kpi.help}>
                    <Info size={13} />
                  </span>
                </header>
                <strong>{kpi.value}</strong>
              </article>
            ))}
          </section>

          <section className="report-grid">
            <article className="panel report-chart">
              <h2>Órdenes por día</h2>
              <p>Creadas y entregadas, hora de República Dominicana</p>
              <div className="chart-box">
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={data.daily}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e6ebf2" />
                    <XAxis dataKey="date" tickFormatter={shortDate} fontSize={10} />
                    <YAxis allowDecimals={false} fontSize={10} width={32} />
                    <Tooltip labelFormatter={(value) => shortDate(String(value))} formatter={(value, name) => [value, name === "orders" ? "Creadas" : "Entregadas"]} />
                    <Bar dataKey="orders" name="orders" fill="#93c5fd" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="delivered" name="delivered" fill="#2563eb" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </article>

            <article className="panel report-chart">
              <h2>Ingresos por día</h2>
              <p>Pagos confirmados o autorizados</p>
              <div className="chart-box">
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={data.daily}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e6ebf2" />
                    <XAxis dataKey="date" tickFormatter={shortDate} fontSize={10} />
                    <YAxis fontSize={10} width={64} tickFormatter={(value: number) => `RD$${Math.round(value / 1000)}k`} />
                    <Tooltip labelFormatter={(value) => shortDate(String(value))} formatter={(value) => [formatMoney(Number(value)), "Ingresos"]} />
                    <Line type="monotone" dataKey="revenue" stroke="#16a34a" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </article>

            <article className="panel">
              <h2>Órdenes por estado</h2>
              <table className="report-table">
                <thead>
                  <tr><th>Estado</th><th>Órdenes</th><th>%</th></tr>
                </thead>
                <tbody>
                  {data.orders.byStatus.map((row) => (
                    <tr key={row.status}>
                      <td>{label("orderStatus", row.status)}</td>
                      <td>{row.count}</td>
                      <td>{data.orders.total ? `${((row.count / data.orders.total) * 100).toFixed(1)} %` : "—"}</td>
                    </tr>
                  ))}
                  {!data.orders.byStatus.length ? <tr><td colSpan={3}>Sin órdenes en el periodo</td></tr> : null}
                </tbody>
              </table>
            </article>

            <article className="panel">
              <h2>Ingresos por método</h2>
              <table className="report-table">
                <thead>
                  <tr><th>Método</th><th>Pagos</th><th>Monto</th></tr>
                </thead>
                <tbody>
                  {data.revenue.byMethod.map((row) => (
                    <tr key={row.method}>
                      <td>{label("paymentMethod", row.method)}</td>
                      <td>{row.count}</td>
                      <td>{formatMoney(row.amount)}</td>
                    </tr>
                  ))}
                  {!data.revenue.byMethod.length ? <tr><td colSpan={3}>Sin pagos confirmados</td></tr> : null}
                  {data.revenue.refunded > 0 ? (
                    <tr className="is-muted"><td>Reembolsos</td><td /><td>−{formatMoney(data.revenue.refunded)}</td></tr>
                  ) : null}
                </tbody>
              </table>
            </article>

            <article className="panel">
              <h2>Conductores con más viajes</h2>
              <table className="report-table">
                <thead>
                  <tr><th>Conductor</th><th>Viajes completados</th></tr>
                </thead>
                <tbody>
                  {data.topDrivers.map((row) => (
                    <tr key={row.driverId}><td>{row.name}</td><td>{row.trips}</td></tr>
                  ))}
                  {!data.topDrivers.length ? <tr><td colSpan={2}>Sin viajes completados</td></tr> : null}
                </tbody>
              </table>
            </article>

            <article className="panel">
              <h2>Despacho automático</h2>
              <dl className="report-facts">
                <div><dt>Ofertas enviadas</dt><dd>{data.offers.made}</dd></div>
                <div><dt>Aceptadas</dt><dd>{data.offers.accepted}</dd></div>
                <div><dt>Rechazadas</dt><dd>{data.offers.rejected}</dd></div>
                <div><dt>Vencidas</dt><dd>{data.offers.expired}</dd></div>
                <div><dt>Tasa de aceptación</dt><dd>{pct(data.offers.acceptanceRate)}</dd></div>
              </dl>
            </article>
          </section>
        </>
      ) : null}
    </div>
  );
}
