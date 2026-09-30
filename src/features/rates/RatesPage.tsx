import { useDeferredValue, useMemo, useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button, Modal, PageHeader, SearchFilters, StatCard, StatusBadge } from "@/components/ui";
import { queryKeys } from "@/lib/query-keys";
import { formatMoney } from "@/lib/money";
import { mapRateCardRow, mapRateRuleRow, tmsService, type AnyRecord } from "@/services/tms.service";
import type { DataRow } from "@/types/domain";

const activeFilter = [
  {
    label: "Estado",
    name: "isActive",
    options: [
      { label: "Activas", value: "true" },
      { label: "Inactivas", value: "false" },
    ],
  },
];

const RULE_FIELDS = [
  { name: "baseFare", label: "Tarifa base", row: "base" },
  { name: "pricePerKm", label: "Por km", row: "km" },
  { name: "pricePerMinute", label: "Por minuto", row: "minuto" },
  { name: "minimumFare", label: "Mínima", row: "minima" },
  { name: "helperFee", label: "Ayudante", row: "ayudante" },
  { name: "nightFee", label: "Nocturno", row: "nocturno" },
  { name: "waitingPricePerMinute", label: "Espera / min", row: "espera" },
  { name: "cancellationFee", label: "Cancelación", row: "cancelacion" },
] as const;

type CardEditor = { mode: "create" } | { mode: "edit"; card: DataRow } | null;
type RuleEditor = { mode: "create" } | { mode: "edit"; rule: DataRow } | null;

function errorText(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : "";
  if (/already has a rule/i.test(message)) return "Esta tarifa ya tiene una regla para esa categoría; edítala.";
  return message || fallback;
}

/**
 * Tarifas: varias tarjetas pueden estar activas; la de mayor prioridad es la
 * que cotiza cada categoria. Cada tarjeta tiene una regla por categoria.
 */
export function RatesPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [cardEditor, setCardEditor] = useState<CardEditor>(null);
  const [ruleEditor, setRuleEditor] = useState<RuleEditor>(null);
  const [deletingRule, setDeletingRule] = useState<DataRow | null>(null);
  const query = useMemo(() => ({ search: deferredSearch, ...filters }), [deferredSearch, filters]);

  const cardsQuery = useQuery({ queryKey: queryKeys.rates(query), queryFn: () => tmsService.rateCards(query) });
  const categoriesQuery = useQuery({
    queryKey: ["lookup", "vehicle-categories", "rates"],
    queryFn: () => tmsService.vehicleCategories(),
    staleTime: 10 * 60_000,
  });
  const cards = useMemo(() => cardsQuery.data ?? [], [cardsQuery.data]);
  const categories = categoriesQuery.data ?? [];
  const rows = cards.map(mapRateCardRow).sort((a, b) => Number(b.prioridad) - Number(a.prioridad));
  const selectedRow = rows.find((row) => row.id === selectedId) ?? rows[0];
  const selectedCard = cards.find((card) => String(card.id) === selectedRow?.id);
  const selectedRules = recordArray(selectedCard?.rateRules).map((rule) => mapRateRuleRow(rule, categories));
  const activeCards = rows.filter((row) => row.estadoInterno === "ACTIVE");
  const defaultCard = activeCards[0];
  const totalRules = cards.reduce((sum, card) => sum + recordArray(card.rateRules).length, 0);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["rates"] });

  const deleteRule = async () => {
    if (!deletingRule || !selectedRow) return;
    try {
      await tmsService.deleteRateRule(selectedRow.id, deletingRule.id);
      await refresh();
      toast.success("Regla eliminada");
      setDeletingRule(null);
    } catch (error) {
      toast.error(errorText(error, "No se pudo eliminar la regla"));
    }
  };

  const toggleActive = async (row: DataRow) => {
    try {
      if (row.estadoInterno === "ACTIVE") await tmsService.deactivateRateCard(row.id);
      else await tmsService.updateRateCard(row.id, { isActive: "true" });
      await refresh();
      toast.success(row.estadoInterno === "ACTIVE" ? "Tarifa desactivada" : "Tarifa activada");
    } catch (error) {
      toast.error(errorText(error, "No se pudo cambiar el estado"));
    }
  };

  const makeDefault = async (row: DataRow) => {
    const top = Math.max(0, ...rows.map((candidate) => Number(candidate.prioridad)));
    try {
      await tmsService.updateRateCard(row.id, { priority: String(top + 1), isActive: "true" });
      await refresh();
      toast.success(`"${row.nombre}" es ahora la tarifa predeterminada`);
    } catch (error) {
      toast.error(errorText(error, "No se pudo marcar como predeterminada"));
    }
  };

  return (
    <div>
      <PageHeader
        title="Tarifas"
        subtitle="Precios por categoría de vehículo. La tarifa activa con mayor prioridad es la que cotiza."
        action="Crear tarifa"
        onAction={() => setCardEditor({ mode: "create" })}
      />
      {(cardsQuery.isError || categoriesQuery.isError) && <div className="inline-alert">No se pudieron cargar tarifas o categorías.</div>}
      {(cardsQuery.isLoading || categoriesQuery.isLoading) && <div className="inline-alert inline-alert--info">Cargando tarifas...</div>}

      <section className="stats-grid">
        <StatCard stat={{ label: "Tarifas", value: String(rows.length), helper: `${activeCards.length} activas`, tone: "blue" }} />
        <StatCard stat={{ label: "Predeterminada", value: String(defaultCard?.nombre ?? "—"), helper: "Mayor prioridad activa", tone: "green" }} />
        <StatCard stat={{ label: "Reglas", value: String(totalRules), helper: "Una por categoría y tarifa", tone: "orange" }} />
        <StatCard stat={{ label: "Categorías", value: String(categories.length), helper: "Vehículos cotizables", tone: "slate" }} />
      </section>

      <SearchFilters
        search={search}
        onSearch={setSearch}
        filters={activeFilter}
        values={filters}
        onFilterChange={(name, value) => setFilters((current) => ({ ...current, [name]: value }))}
      />

      <section className="rate-layout rate-layout--split">
        <article className="panel">
          <div className="panel-heading">
            <div>
              <h2>Tarifas</h2>
              <p>Selecciona una para ver y editar sus reglas</p>
            </div>
          </div>
          <div className="rate-table">
            <div className="rate-row rate-row--cards rate-head">
              <span>Tarifa</span>
              <span>Vigencia</span>
              <span>Prioridad</span>
              <span>Reglas</span>
              <span>Estado</span>
            </div>
            {rows.map((row) => (
              <button
                className={`rate-row rate-row--cards ${row.id === selectedRow?.id ? "is-selected" : ""}`}
                key={row.id}
                type="button"
                aria-pressed={row.id === selectedRow?.id}
                onClick={() => setSelectedId(row.id)}
              >
                <strong>
                  {row.nombre}
                  {row.id === defaultCard?.id ? <em className="rate-default">Predeterminada</em> : null}
                </strong>
                <span>{row.vigencia}</span>
                <span>{row.prioridad}</span>
                <span>{row.reglas}</span>
                <StatusBadge>{row.estado}</StatusBadge>
              </button>
            ))}
            {!rows.length && !cardsQuery.isLoading ? <p className="rate-empty">No hay tarifas. Crea la primera.</p> : null}
          </div>
        </article>

        {selectedRow ? (
          <article className="panel rate-detail">
            <div className="panel-heading">
              <div>
                <h2>{selectedRow.nombre}</h2>
                <p>{selectedRow.descripcion}</p>
              </div>
              <div className="rate-detail__actions">
                <Button variant="secondary" onClick={() => setCardEditor({ mode: "edit", card: selectedRow })}>
                  Editar
                </Button>
                {selectedRow.id !== defaultCard?.id ? (
                  <Button variant="secondary" onClick={() => void makeDefault(selectedRow)}>
                    Hacer predeterminada
                  </Button>
                ) : null}
                <Button variant={selectedRow.estadoInterno === "ACTIVE" ? "danger" : "secondary"} onClick={() => void toggleActive(selectedRow)}>
                  {selectedRow.estadoInterno === "ACTIVE" ? "Desactivar" : "Activar"}
                </Button>
              </div>
            </div>

            <div className="rule-table-wrap">
              <table className="rule-table">
                <thead>
                  <tr>
                    <th>Categoría</th>
                    {RULE_FIELDS.map((field) => (
                      <th key={field.name}>{field.label}</th>
                    ))}
                    <th aria-label="Acciones" />
                  </tr>
                </thead>
                <tbody>
                  {selectedRules.map((rule) => (
                    <tr key={rule.id}>
                      <td>
                        <strong>{rule.vehiculo}</strong>
                      </td>
                      {RULE_FIELDS.map((field) => (
                        <td key={field.name}>{formatMoney(rule[field.row] as number)}</td>
                      ))}
                      <td className="rule-actions">
                        <button type="button" onClick={() => setRuleEditor({ mode: "edit", rule })}>
                          Editar
                        </button>
                        <button type="button" className="is-danger" onClick={() => setDeletingRule(rule)}>
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!selectedRules.length ? <p className="rate-empty">Esta tarifa no tiene reglas: no cotiza ninguna categoría.</p> : null}
            </div>
            {selectedRules.length < categories.length ? (
              <Button onClick={() => setRuleEditor({ mode: "create" })}>+ Agregar regla</Button>
            ) : null}

            <RuleSimulator categories={categories} />
          </article>
        ) : null}
      </section>

      {cardEditor ? (
        <CardEditorModal
          key={cardEditor.mode === "edit" ? cardEditor.card.id : "new"}
          editor={cardEditor}
          onClose={() => setCardEditor(null)}
          onSaved={async (id) => {
            await refresh();
            if (id) setSelectedId(id);
            setCardEditor(null);
          }}
        />
      ) : null}

      {ruleEditor && selectedRow ? (
        <RuleEditorModal
          key={ruleEditor.mode === "edit" ? ruleEditor.rule.id : "new"}
          cardId={selectedRow.id}
          editor={ruleEditor}
          categories={categories.filter(
            (category) => !selectedRules.some((rule) => rule.vehicleCategoryId === String(category.id)),
          )}
          onClose={() => setRuleEditor(null)}
          onSaved={async () => {
            await refresh();
            setRuleEditor(null);
          }}
        />
      ) : null}

      <Modal open={Boolean(deletingRule)} onClose={() => setDeletingRule(null)} title="Eliminar regla" description="La categoría dejará de cotizarse con esta tarifa.">
        <div className="confirm-copy">
          ¿Eliminar la regla de <strong>{deletingRule?.vehiculo}</strong>? Si otra tarifa activa tiene regla para esa categoría, se usará esa.
        </div>
        <footer className="modal-actions">
          <Button variant="secondary" onClick={() => setDeletingRule(null)}>
            Conservar
          </Button>
          <Button variant="danger" onClick={() => void deleteRule()}>
            Eliminar
          </Button>
        </footer>
      </Modal>
    </div>
  );
}

function CardEditorModal({
  editor,
  onClose,
  onSaved,
}: {
  editor: NonNullable<CardEditor>;
  onClose: () => void;
  onSaved: (id?: string) => Promise<void>;
}) {
  const card = editor.mode === "edit" ? editor.card : undefined;
  const [values, setValues] = useState({
    name: String(card?.nombre ?? ""),
    description: String(card?.descripcion ?? ""),
    validFrom: String(card?.validFrom ?? new Date().toISOString()).slice(0, 10),
    validTo: String(card?.validTo ?? "").slice(0, 10),
    priority: String(card?.prioridad ?? 0),
    isActive: card ? String(card.estadoInterno === "ACTIVE") : "true",
  });
  const [saving, setSaving] = useState(false);
  const set = (key: keyof typeof values, value: string) => setValues((current) => ({ ...current, [key]: value }));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (values.name.trim().length < 2 || values.description.trim().length < 2) {
      toast.error("Indica nombre y descripción");
      return;
    }
    if (values.validTo && values.validTo < values.validFrom) {
      toast.error("La fecha final no puede ser antes de la inicial");
      return;
    }
    setSaving(true);
    try {
      const saved = card ? await tmsService.updateRateCard(card.id, values) : await tmsService.createRateCard(values);
      toast.success(card ? "Tarifa actualizada" : "Tarifa creada");
      await onSaved(String((saved as AnyRecord)?.id ?? card?.id ?? ""));
    } catch (error) {
      toast.error(errorText(error, "No se pudo guardar la tarifa"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open onClose={onClose} title={card ? `Editar ${card.nombre}` : "Crear tarifa"} description="Vigencia y prioridad deciden qué tarifa cotiza cuando hay varias activas." wide>
      <form onSubmit={(event) => void submit(event)}>
        <div className="form-grid">
          <label className="span-2">
            <span>Nombre</span>
            <input value={values.name} onChange={(event) => set("name", event.target.value)} />
          </label>
          <label className="span-2">
            <span>Descripción</span>
            <textarea rows={2} value={values.description} onChange={(event) => set("description", event.target.value)} />
          </label>
          <label>
            <span>Válida desde</span>
            <input type="date" value={values.validFrom} onChange={(event) => set("validFrom", event.target.value)} />
          </label>
          <label>
            <span>Válida hasta (opcional)</span>
            <input type="date" value={values.validTo} onChange={(event) => set("validTo", event.target.value)} />
          </label>
          <label>
            <span>Prioridad</span>
            <input type="number" min="0" max="1000" value={values.priority} onChange={(event) => set("priority", event.target.value)} />
          </label>
          <label>
            <span>Estado</span>
            <select value={values.isActive} onChange={(event) => set("isActive", event.target.value)}>
              <option value="true">Activa</option>
              <option value="false">Inactiva</option>
            </select>
          </label>
        </div>
        <div className="form-summary">
          <span>Con varias tarifas activas, cada categoría se cotiza con la de mayor prioridad que tenga regla para ella.</span>
        </div>
        <footer className="modal-actions">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Guardando..." : card ? "Guardar cambios" : "Crear tarifa"}
          </Button>
        </footer>
      </form>
    </Modal>
  );
}

function RuleEditorModal({
  cardId,
  editor,
  categories,
  onClose,
  onSaved,
}: {
  cardId: string;
  editor: NonNullable<RuleEditor>;
  categories: AnyRecord[];
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const rule = editor.mode === "edit" ? editor.rule : undefined;
  const [categoryId, setCategoryId] = useState(String(categories[0]?.id ?? ""));
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(RULE_FIELDS.map((field) => [field.name, rule ? String(rule[field.row] ?? 0) : "0"])),
  );
  const [saving, setSaving] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (RULE_FIELDS.some((field) => !(Number(values[field.name]) >= 0))) {
      toast.error("Todos los montos deben ser números de 0 o más");
      return;
    }
    if (!rule && !categoryId) {
      toast.error("Elige la categoría");
      return;
    }
    setSaving(true);
    try {
      if (rule) await tmsService.updateRateRule(cardId, rule.id, values);
      else await tmsService.createRateRule(cardId, { ...values, vehicleCategoryId: categoryId });
      toast.success(rule ? "Regla actualizada" : "Regla agregada");
      await onSaved();
    } catch (error) {
      toast.error(errorText(error, "No se pudo guardar la regla"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open onClose={onClose} title={rule ? `Regla · ${rule.vehiculo}` : "Agregar regla"} description="Montos en RD$. La tarifa mínima se aplica antes de cargos e impuestos." wide>
      <form onSubmit={(event) => void submit(event)}>
        <div className="form-grid">
          {!rule ? (
            <label className="span-2">
              <span>Categoría de vehículo</span>
              <select value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
                {categories.map((category) => (
                  <option key={String(category.id)} value={String(category.id)}>
                    {String(category.name)} · {String(category.code)}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          {RULE_FIELDS.map((field) => (
            <label key={field.name}>
              <span>{field.label}</span>
              <input
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                value={values[field.name]}
                onChange={(event) => setValues((current) => ({ ...current, [field.name]: event.target.value }))}
              />
            </label>
          ))}
        </div>
        <footer className="modal-actions">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Guardando..." : rule ? "Guardar regla" : "Agregar regla"}
          </Button>
        </footer>
      </form>
    </Modal>
  );
}

/** Lo que cotiza el sistema ahora mismo (tarifa de mayor prioridad por categoria). */
function RuleSimulator({ categories }: { categories: AnyRecord[] }) {
  const [distanceKm, setDistanceKm] = useState("15");
  const [minutes, setMinutes] = useState("35");
  const simulation = useQuery({
    queryKey: ["rates", "simulate", distanceKm, minutes],
    queryFn: () => tmsService.quoteOptions({ distanceKm: Number(distanceKm) || 0, estimatedDurationMin: Number(minutes) || 0 }),
    enabled: Number(distanceKm) > 0 && Number(minutes) > 0,
  });

  return (
    <div className="rate-simulator">
      <h3>Simulador de cotización</h3>
      <p>Precio final (con impuestos) que verá el cliente, según las tarifas activas.</p>
      <div className="rate-simulator__inputs">
        <label>
          <span>Distancia (km)</span>
          <input type="number" min="0" step="0.1" value={distanceKm} onChange={(event) => setDistanceKm(event.target.value)} />
        </label>
        <label>
          <span>Duración (min)</span>
          <input type="number" min="0" value={minutes} onChange={(event) => setMinutes(event.target.value)} />
        </label>
      </div>
      <div className="rate-simulator__results">
        {(simulation.data ?? []).map((option) => (
          <div key={option.vehicleCategoryId}>
            <span>{option.name}</span>
            <strong>{option.totalAmount == null ? "Sin tarifa" : formatMoney(option.totalAmount)}</strong>
          </div>
        ))}
        {simulation.isLoading ? <span>Calculando…</span> : null}
        {!categories.length ? <span>No hay categorías de vehículo.</span> : null}
      </div>
    </div>
  );
}

function recordArray(value: unknown): AnyRecord[] {
  return Array.isArray(value) ? value.filter((item): item is AnyRecord => Boolean(item && typeof item === "object")) : [];
}
