/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable react-hooks/set-state-in-effect */
import {
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Loader2, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { Button, Modal } from "@/components/ui";
import { tmsService, type AnyRecord } from "@/services/tms.service";

type FormValues = Record<string, string>;
type SubmitMode = "DRAFT" | "CREATE_AND_QUOTE";

const quoteFields = new Set([
  "distanceKm",
  "estimatedDurationMin",
  "itemRequireHelper",
  "tollAmount",
  "weightSurcharge",
  "volumeSurcharge",
  "otherCharges",
  "discountAmount",
  "manualAdjustmentAmount",
  "adjustmentReason",
]);

const initialValues: FormValues = {
  serviceType: "INMEDIATE",
  itemQuantity: "1",
  itemFragile: "false",
  itemRequireHelper: "false",
};

export function OrderForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (values: FormValues) => Promise<void> | void;
  onCancel: () => void;
}) {
  const queryClient = useQueryClient();
  const [values, setValues] = useState<FormValues>(initialValues);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerOpen, setCustomerOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<AnyRecord | null>(
    null,
  );
  const [quickCustomerOpen, setQuickCustomerOpen] = useState(false);
  const [submittingMode, setSubmittingMode] = useState<SubmitMode | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [quotePreview, setQuotePreview] = useState<AnyRecord | null>(null);
  const deferredCustomerSearch = useDeferredValue(customerSearch.trim());

  const customersQuery = useQuery({
    queryKey: ["lookup", "customers", deferredCustomerSearch],
    queryFn: () =>
      tmsService.customers({
        search: deferredCustomerSearch,
        status: "ACTIVE",
        pageSize: 20,
      }),
  });
  const categoriesQuery = useQuery({
    queryKey: ["lookup", "vehicle-categories"],
    queryFn: () => tmsService.vehicleCategories(),
  });
  const provincesQuery = useQuery({
    queryKey: ["catalogs", "provinces"],
    queryFn: () => tmsService.provinces(),
    staleTime: 10 * 60_000,
  });
  const originMunicipalitiesQuery = useQuery({
    queryKey: ["catalogs", "municipalities", values.originProvinceId],
    queryFn: () => tmsService.municipalities(values.originProvinceId),
    enabled: Boolean(values.originProvinceId),
    staleTime: 10 * 60_000,
  });
  const destinationMunicipalitiesQuery = useQuery({
    queryKey: ["catalogs", "municipalities", values.destinationProvinceId],
    queryFn: () => tmsService.municipalities(values.destinationProvinceId),
    enabled: Boolean(values.destinationProvinceId),
    staleTime: 10 * 60_000,
  });

  const customers = customersQuery.data ?? [];
  const categories = categoriesQuery.data ?? [];
  const provinces = provincesQuery.data ?? [];
  const selectedCategory = useMemo(
    () =>
      categories.find(
        (category) => String(category.id) === values.vehicleCategoryId,
      ),
    [categories, values.vehicleCategoryId],
  );

  useEffect(() => {
    if (!values.originProvinceId) {
      setValues((current) => ({ ...current, originCity: "" }));
    }
  }, [values.originProvinceId]);

  useEffect(() => {
    if (!values.destinationProvinceId) {
      setValues((current) => ({ ...current, destinationCity: "" }));
    }
  }, [values.destinationProvinceId]);

  const setField = (name: string, value: string) => {
    setValues((current) => ({ ...current, [name]: value }));
    if (quoteFields.has(name)) {
      setQuotePreview(null);
    }
    setErrors((current) => {
      const next = { ...current };
      delete next[name];
      return next;
    });
  };

  const selectCustomer = (customer: AnyRecord) => {
    setSelectedCustomer(customer);
    setCustomerSearch(customerLabel(customer));
    setField("customerId", String(customer.id ?? ""));
    setCustomerOpen(false);
  };

  const selectProvince = (
    scope: "origin" | "destination",
    provinceId: string,
  ) => {
    const province = provinces.find((item) => String(item.id) === provinceId);
    setValues((current) => ({
      ...current,
      [`${scope}ProvinceId`]: provinceId,
      [`${scope}Province`]: province ? String(province.name ?? "") : "",
      [`${scope}City`]: "",
    }));
  };

  const selectMunicipality = (
    scope: "origin" | "destination",
    municipalityId: string,
    municipalities: AnyRecord[],
  ) => {
    const municipality = municipalities.find(
      (item) => String(item.id) === municipalityId,
    );
    setValues((current) => ({
      ...current,
      [`${scope}CityId`]: municipalityId,
      [`${scope}City`]: municipality ? String(municipality.name ?? "") : "",
    }));
  };

  const createQuickCustomer = async (customerValues: FormValues) => {
    const customer = await tmsService.createTmsCustomer(customerValues);
    await queryClient.invalidateQueries({ queryKey: ["lookup", "customers"] });
    selectCustomer(customer);
    setQuickCustomerOpen(false);
    toast.success("Cliente creado y seleccionado");
  };

  const focusFirstError = (nextErrors: Record<string, string>) => {
    const first = Object.keys(nextErrors)[0];
    if (first) {
      document.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
    }
  };

  const previewQuote = async () => {
    const nextErrors = validate(values, selectedCategory, {
      requireManualQuote: true,
    });
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      focusFirstError(nextErrors);
      return;
    }

    setIsPreviewing(true);
    try {
      const quote = await tmsService.previewManualQuote(values);
      setQuotePreview(quote);
      toast.success("Cotización provisional calculada");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "No se pudo calcular la cotización",
      );
    } finally {
      setIsPreviewing(false);
    }
  };

  const submitWithMode = async (submitMode: SubmitMode) => {
    const nextErrors = validate(values, selectedCategory, {
      requireManualQuote: submitMode === "CREATE_AND_QUOTE",
    });
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      focusFirstError(nextErrors);
      return;
    }

    setSubmittingMode(submitMode);
    try {
      await onSubmit({ ...values, submitMode });
    } finally {
      setSubmittingMode(null);
    }
  };

  return (
    <>
      <form className="order-form" onSubmit={(event) => event.preventDefault()}>
        <section className="form-section span-2">
          <header className="section-title">
            <div>
              <strong>Cliente y servicio</strong>
              <span>
                Busca un cliente activo o créalo rápido sin salir del
                formulario.
              </span>
            </div>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setQuickCustomerOpen(true)}
            >
              <Plus size={14} /> Cliente rápido
            </Button>
          </header>
          <div className="form-grid">
            <label className="span-2 combobox-field">
              <span>Cliente</span>
              <div className="combobox-input">
                <Search size={15} />
                <input
                  name="customerId"
                  value={customerSearch}
                  onFocus={() => setCustomerOpen(true)}
                  onChange={(event) => {
                    setCustomerSearch(event.target.value);
                    setField("customerId", "");
                    setSelectedCustomer(null);
                    setCustomerOpen(true);
                  }}
                  placeholder="Nombre, correo, teléfono o documento"
                  autoComplete="off"
                />
              </div>
              {customerOpen && !values.customerId && (
                <div className="combobox-results">
                  {customersQuery.isFetching && (
                    <span>
                      <Loader2 size={13} /> Buscando clientes...
                    </span>
                  )}
                  {customersQuery.isError && (
                    <span className="combobox-error">
                      No se pudo consultar clientes. Revisa la API o la sesión.
                    </span>
                  )}
                  {!customersQuery.isFetching &&
                    !customersQuery.isError &&
                    !deferredCustomerSearch &&
                    customers.length > 0 && (
                      <span>Clientes activos recientes</span>
                    )}
                  {!customersQuery.isFetching &&
                    !customersQuery.isError &&
                    customers.map((customer) => (
                      <button
                        type="button"
                        key={String(customer.id)}
                        onClick={() => selectCustomer(customer)}
                      >
                        <strong>{customerLabel(customer)}</strong>
                        <small>{customerMeta(customer)}</small>
                      </button>
                    ))}
                  {!customersQuery.isFetching &&
                    !customersQuery.isError &&
                    !customers.length && (
                    <span>Sin resultados activos.</span>
                  )}
                </div>
              )}
              {errors.customerId && (
                <small className="field-error">{errors.customerId}</small>
              )}
            </label>
            {selectedCustomer && (
              <div className="selected-card span-2">
                <Check size={15} />
                <span>
                  <strong>{customerLabel(selectedCustomer)}</strong>
                  <small>{customerMeta(selectedCustomer)}</small>
                </span>
              </div>
            )}
            <label>
              <span>Tipo de servicio</span>
              <select
                name="serviceType"
                value={values.serviceType ?? "INMEDIATE"}
                onChange={(event) =>
                  setField("serviceType", event.target.value)
                }
              >
                <option value="INMEDIATE">Inmediato</option>
                <option value="SCHEDULED">Programado</option>
              </select>
            </label>
            <label>
              <span>
                Fecha programada{" "}
                {values.serviceType === "SCHEDULED" ? "" : "(opcional)"}
              </span>
              <input
                name="scheduleAt"
                type="datetime-local"
                value={values.scheduleAt ?? ""}
                onChange={(event) => setField("scheduleAt", event.target.value)}
              />
              {errors.scheduleAt && (
                <small className="field-error">{errors.scheduleAt}</small>
              )}
            </label>
            <label className="span-2">
              <span>Categoría de vehículo</span>
              <select
                name="vehicleCategoryId"
                value={values.vehicleCategoryId ?? ""}
                onChange={(event) =>
                  setField("vehicleCategoryId", event.target.value)
                }
              >
                <option value="">Seleccionar categoría</option>
                    {categories.map((category) => (
                      <option key={String(category.id)} value={String(category.id)}>
                        {categoryOptionLabel(category)}
                      </option>
                    ))}
              </select>
              {errors.vehicleCategoryId && (
                <small className="field-error">
                  {errors.vehicleCategoryId}
                </small>
              )}
            </label>
            {selectedCategory && (
              <div className="selected-card span-2">
                <span>
                  <strong>
                    {String(selectedCategory.name ?? "Categoría seleccionada")}
                  </strong>
                  <small>
                    Peso máx. {String(selectedCategory.maxWeightKg ?? "--")} kg
                    · Volumen máx.{" "}
                    {String(selectedCategory.maxVolumenM3 ?? "--")} m³
                  </small>
                </span>
              </div>
            )}
          </div>
        </section>

        <LocationSection
          title="Origen"
          scope="origin"
          values={values}
          errors={errors}
          provinces={provinces}
          municipalities={originMunicipalitiesQuery.data ?? []}
          loadingMunicipalities={originMunicipalitiesQuery.isFetching}
          onField={setField}
          onProvince={selectProvince}
          onMunicipality={(id) =>
            selectMunicipality(
              "origin",
              id,
              originMunicipalitiesQuery.data ?? [],
            )
          }
        />
        <LocationSection
          title="Destino"
          scope="destination"
          values={values}
          errors={errors}
          provinces={provinces}
          municipalities={destinationMunicipalitiesQuery.data ?? []}
          loadingMunicipalities={destinationMunicipalitiesQuery.isFetching}
          onField={setField}
          onProvince={selectProvince}
          onMunicipality={(id) =>
            selectMunicipality(
              "destination",
              id,
              destinationMunicipalitiesQuery.data ?? [],
            )
          }
        />

        <section className="form-section span-2">
          <header className="section-title">
            <div>
              <strong>Carga</strong>
              <span>
                Estos datos validan capacidad y preparan la cotización.
              </span>
            </div>
          </header>
          <div className="form-grid">
            <label className="span-2">
              <span>Descripción de carga</span>
              <input
                name="itemDescription"
                value={values.itemDescription ?? ""}
                onChange={(event) =>
                  setField("itemDescription", event.target.value)
                }
                placeholder="Caja, documentos, muebles, equipos..."
              />
              {errors.itemDescription && (
                <small className="field-error">{errors.itemDescription}</small>
              )}
            </label>
            <label>
              <span>Cantidad</span>
              <input
                name="itemQuantity"
                type="number"
                min="1"
                value={values.itemQuantity ?? "1"}
                onChange={(event) =>
                  setField("itemQuantity", event.target.value)
                }
              />
              {errors.itemQuantity && (
                <small className="field-error">{errors.itemQuantity}</small>
              )}
            </label>
            <label>
              <span>Peso total kg</span>
              <input
                name="itemWeightKg"
                type="number"
                min="0"
                step="0.01"
                value={values.itemWeightKg ?? ""}
                onChange={(event) =>
                  setField("itemWeightKg", event.target.value)
                }
              />
              {errors.itemWeightKg && (
                <small className="field-error">{errors.itemWeightKg}</small>
              )}
            </label>
            <label>
              <span>Volumen m³ (opcional)</span>
              <input
                name="itemVolumeM3"
                type="number"
                min="0"
                step="0.01"
                value={values.itemVolumeM3 ?? ""}
                onChange={(event) =>
                  setField("itemVolumeM3", event.target.value)
                }
              />
              {errors.itemVolumeM3 && (
                <small className="field-error">{errors.itemVolumeM3}</small>
              )}
            </label>
            <label>
              <span>Valor declarado (opcional)</span>
              <input
                name="itemDeclaredValue"
                type="number"
                min="0"
                step="0.01"
                value={values.itemDeclaredValue ?? ""}
                onChange={(event) =>
                  setField("itemDeclaredValue", event.target.value)
                }
              />
              {errors.itemDeclaredValue && (
                <small className="field-error">
                  {errors.itemDeclaredValue}
                </small>
              )}
            </label>
            <SwitchField
              label="Frágil"
              checked={values.itemFragile === "true"}
              onChange={(checked) => setField("itemFragile", String(checked))}
            />
            <SwitchField
              label="Requiere ayudante"
              checked={values.itemRequireHelper === "true"}
              onChange={(checked) =>
                setField("itemRequireHelper", String(checked))
              }
            />
            <label className="span-2">
              <span>Notas e instrucciones (opcional)</span>
              <textarea
                name="notes"
                rows={3}
                value={values.notes ?? ""}
                onChange={(event) => setField("notes", event.target.value)}
                placeholder="Instrucciones de acceso, horario, cuidado especial..."
              />
            </label>
          </div>
        </section>

        <section className="form-section span-2">
          <header className="section-title">
            <div>
              <strong>Cotización</strong>
              <span>
                Calcula una tarifa manual provisional. Google Maps podrá
                reemplazar distancia y duración más adelante.
              </span>
            </div>
          </header>
          <div className="form-grid">
            <label>
              <span>Distancia manual km</span>
              <input
                name="distanceKm"
                type="number"
                min="0.1"
                step="0.01"
                value={values.distanceKm ?? ""}
                onChange={(event) => setField("distanceKm", event.target.value)}
                placeholder="Ej. 12.5"
              />
              {errors.distanceKm && (
                <small className="field-error">{errors.distanceKm}</small>
              )}
            </label>
            <label>
              <span>Duración estimada min</span>
              <input
                name="estimatedDurationMin"
                type="number"
                min="0"
                step="1"
                value={values.estimatedDurationMin ?? ""}
                onChange={(event) =>
                  setField("estimatedDurationMin", event.target.value)
                }
                placeholder="Ej. 35"
              />
              {errors.estimatedDurationMin && (
                <small className="field-error">
                  {errors.estimatedDurationMin}
                </small>
              )}
            </label>
            <label>
              <span>Peajes</span>
              <input
                name="tollAmount"
                type="number"
                min="0"
                step="0.01"
                value={values.tollAmount ?? ""}
                onChange={(event) => setField("tollAmount", event.target.value)}
              />
              {errors.tollAmount && (
                <small className="field-error">{errors.tollAmount}</small>
              )}
            </label>
            <label>
              <span>Recargo por peso</span>
              <input
                name="weightSurcharge"
                type="number"
                min="0"
                step="0.01"
                value={values.weightSurcharge ?? ""}
                onChange={(event) =>
                  setField("weightSurcharge", event.target.value)
                }
              />
              {errors.weightSurcharge && (
                <small className="field-error">{errors.weightSurcharge}</small>
              )}
            </label>
            <label>
              <span>Recargo por volumen</span>
              <input
                name="volumeSurcharge"
                type="number"
                min="0"
                step="0.01"
                value={values.volumeSurcharge ?? ""}
                onChange={(event) =>
                  setField("volumeSurcharge", event.target.value)
                }
              />
              {errors.volumeSurcharge && (
                <small className="field-error">{errors.volumeSurcharge}</small>
              )}
            </label>
            <label>
              <span>Otros cargos</span>
              <input
                name="otherCharges"
                type="number"
                min="0"
                step="0.01"
                value={values.otherCharges ?? ""}
                onChange={(event) =>
                  setField("otherCharges", event.target.value)
                }
              />
              {errors.otherCharges && (
                <small className="field-error">{errors.otherCharges}</small>
              )}
            </label>
            <label>
              <span>Descuento</span>
              <input
                name="discountAmount"
                type="number"
                min="0"
                step="0.01"
                value={values.discountAmount ?? ""}
                onChange={(event) =>
                  setField("discountAmount", event.target.value)
                }
              />
              {errors.discountAmount && (
                <small className="field-error">{errors.discountAmount}</small>
              )}
            </label>
            <label>
              <span>Ajuste manual admin</span>
              <input
                name="manualAdjustmentAmount"
                type="number"
                min="0"
                step="0.01"
                value={values.manualAdjustmentAmount ?? ""}
                onChange={(event) =>
                  setField("manualAdjustmentAmount", event.target.value)
                }
              />
              {errors.manualAdjustmentAmount && (
                <small className="field-error">
                  {errors.manualAdjustmentAmount}
                </small>
              )}
            </label>
            <label className="span-2">
              <span>Motivo del ajuste</span>
              <input
                name="adjustmentReason"
                value={values.adjustmentReason ?? ""}
                onChange={(event) =>
                  setField("adjustmentReason", event.target.value)
                }
                placeholder="Requerido por política interna si aplica ajuste"
              />
            </label>
          </div>
          {quotePreview && (
            <div className="quote-preview">
              <strong>{formatMoney(getQuoteNumber(quotePreview, "totalAmount"))}</strong>
              <span>
                Base {formatMoney(getQuoteNumber(quotePreview, "baseAmount"))} ·
                Extras {formatMoney(getQuoteNumber(quotePreview, "extrasAmount"))} ·
                ITBIS {formatMoney(getQuoteNumber(quotePreview, "taxAmount"))}
              </span>
              <small>
                {String(quotePreview.quoteSource ?? "MANUAL")} ·{" "}
                {String(quotePreview.quoteStatus ?? "PROVISIONAL")}
              </small>
            </div>
          )}
        </section>

        <div className="form-summary span-2">
          <span>
            <Check size={16} /> Guarda borrador sin cotización o calcula una
            tarifa provisional antes de crear.
          </span>
          <strong>
            El backend calcula el total; el portal solo envía parámetros.
          </strong>
        </div>
        <footer className="modal-actions">
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancelar
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={Boolean(submittingMode) || isPreviewing}
            onClick={() => submitWithMode("DRAFT")}
          >
            {submittingMode === "DRAFT" ? "Guardando..." : "Guardar borrador"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={Boolean(submittingMode) || isPreviewing}
            onClick={previewQuote}
          >
            {isPreviewing ? "Calculando..." : "Calcular cotización"}
          </Button>
          <Button
            type="button"
            disabled={Boolean(submittingMode) || isPreviewing}
            onClick={() => submitWithMode("CREATE_AND_QUOTE")}
          >
            {submittingMode === "CREATE_AND_QUOTE"
              ? "Creando..."
              : "Crear orden y cotizar"}
          </Button>
        </footer>
      </form>
      <Modal
        open={quickCustomerOpen}
        onClose={() => setQuickCustomerOpen(false)}
        title="Cliente rápido"
        description="Crea un usuario cliente activo y selecciónalo para esta orden."
        wide
      >
        <QuickCustomerForm
          onCancel={() => setQuickCustomerOpen(false)}
          onSubmit={createQuickCustomer}
        />
      </Modal>
    </>
  );
}

function LocationSection({
  title,
  scope,
  values,
  errors,
  provinces,
  municipalities,
  loadingMunicipalities,
  onField,
  onProvince,
  onMunicipality,
}: {
  title: string;
  scope: "origin" | "destination";
  values: FormValues;
  errors: Record<string, string>;
  provinces: AnyRecord[];
  municipalities: AnyRecord[];
  loadingMunicipalities: boolean;
  onField: (name: string, value: string) => void;
  onProvince: (scope: "origin" | "destination", provinceId: string) => void;
  onMunicipality: (municipalityId: string) => void;
}) {
  const prefix = scope;
  return (
    <section className="form-section">
      <header className="section-title">
        <div>
          <strong>{title}</strong>
          <span>Provincia y municipio son dependientes.</span>
        </div>
      </header>
      <div className="form-grid form-grid--single">
        <label>
          <span>Provincia</span>
          <select
            name={`${prefix}Province`}
            value={values[`${prefix}ProvinceId`] ?? ""}
            onChange={(event) => onProvince(scope, event.target.value)}
          >
            <option value="">Seleccionar provincia</option>
            {provinces.map((province) => (
              <option key={String(province.id)} value={String(province.id)}>
                {String(province.name ?? "")}
              </option>
            ))}
          </select>
          {errors[`${prefix}Province`] && (
            <small className="field-error">{errors[`${prefix}Province`]}</small>
          )}
        </label>
        <label>
          <span>Municipio</span>
          <select
            name={`${prefix}City`}
            value={values[`${prefix}CityId`] ?? ""}
            disabled={!values[`${prefix}ProvinceId`] || loadingMunicipalities}
            onChange={(event) => onMunicipality(event.target.value)}
          >
            <option value="">
              {loadingMunicipalities ? "Cargando..." : "Seleccionar municipio"}
            </option>
            {municipalities.map((municipality) => (
              <option
                key={String(municipality.id)}
                value={String(municipality.id)}
              >
                {String(municipality.name ?? "")}
              </option>
            ))}
          </select>
          {errors[`${prefix}City`] && (
            <small className="field-error">{errors[`${prefix}City`]}</small>
          )}
        </label>
        <label>
          <span>Dirección</span>
          <input
            name={`${prefix}Address`}
            value={values[`${prefix}Address`] ?? ""}
            onChange={(event) =>
              onField(`${prefix}Address`, event.target.value)
            }
            placeholder="Calle, número, sector"
          />
          {errors[`${prefix}Address`] && (
            <small className="field-error">{errors[`${prefix}Address`]}</small>
          )}
        </label>
        <label>
          <span>Referencia (opcional)</span>
          <input
            name={`${prefix}Instructions`}
            value={values[`${prefix}Instructions`] ?? ""}
            onChange={(event) =>
              onField(`${prefix}Instructions`, event.target.value)
            }
            placeholder="Punto de referencia"
          />
        </label>
        <label>
          <span>Contacto</span>
          <input
            name={`${prefix}ContactName`}
            value={values[`${prefix}ContactName`] ?? ""}
            onChange={(event) =>
              onField(`${prefix}ContactName`, event.target.value)
            }
            placeholder="Nombre"
          />
          {errors[`${prefix}ContactName`] && (
            <small className="field-error">
              {errors[`${prefix}ContactName`]}
            </small>
          )}
        </label>
        <label>
          <span>Teléfono</span>
          <input
            name={`${prefix}ContactPhone`}
            value={values[`${prefix}ContactPhone`] ?? ""}
            onChange={(event) =>
              onField(`${prefix}ContactPhone`, event.target.value)
            }
            placeholder="+18095551234"
          />
          {errors[`${prefix}ContactPhone`] && (
            <small className="field-error">
              {errors[`${prefix}ContactPhone`]}
            </small>
          )}
        </label>
        <label>
          <span>Latitud (opcional)</span>
          <input
            name={`${prefix}Latitude`}
            type="number"
            step="0.000001"
            value={values[`${prefix}Latitude`] ?? ""}
            onChange={(event) =>
              onField(`${prefix}Latitude`, event.target.value)
            }
          />
          {errors[`${prefix}Latitude`] && (
            <small className="field-error">{errors[`${prefix}Latitude`]}</small>
          )}
        </label>
        <label>
          <span>Longitud (opcional)</span>
          <input
            name={`${prefix}Longitude`}
            type="number"
            step="0.000001"
            value={values[`${prefix}Longitude`] ?? ""}
            onChange={(event) =>
              onField(`${prefix}Longitude`, event.target.value)
            }
          />
          {errors[`${prefix}Longitude`] && (
            <small className="field-error">
              {errors[`${prefix}Longitude`]}
            </small>
          )}
        </label>
      </div>
    </section>
  );
}

function SwitchField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="switch-row">
      <span>{label}</span>
      <button
        type="button"
        className={checked ? "switch is-on" : "switch"}
        onClick={() => onChange(!checked)}
        aria-pressed={checked}
      >
        <i />
      </button>
    </label>
  );
}

function QuickCustomerForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (values: FormValues) => Promise<void>;
  onCancel: () => void;
}) {
  const [values, setValues] = useState<FormValues>({
    customerType: "INDIVIDUAL",
    documentType: "ID",
  });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const setField = (name: string, value: string) =>
    setValues((current) => ({ ...current, [name]: value }));
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors = validateQuickCustomer(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    setSaving(true);
    try {
      await onSubmit(values);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "No se pudo crear el cliente",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit}>
      <div className="form-grid">
        <label>
          <span>Nombre completo</span>
          <input
            name="fullName"
            value={values.fullName ?? ""}
            onChange={(event) => setField("fullName", event.target.value)}
          />
          {errors.fullName && (
            <small className="field-error">{errors.fullName}</small>
          )}
        </label>
        <label>
          <span>Teléfono</span>
          <input
            name="phone"
            value={values.phone ?? ""}
            onChange={(event) => setField("phone", event.target.value)}
          />
          {errors.phone && (
            <small className="field-error">{errors.phone}</small>
          )}
        </label>
        <label>
          <span>Correo</span>
          <input
            name="email"
            type="email"
            value={values.email ?? ""}
            onChange={(event) => setField("email", event.target.value)}
          />
          {errors.email && (
            <small className="field-error">{errors.email}</small>
          )}
        </label>
        <label>
          <span>Tipo cliente</span>
          <select
            name="customerType"
            value={values.customerType}
            onChange={(event) => setField("customerType", event.target.value)}
          >
            <option value="INDIVIDUAL">Individual</option>
            <option value="BUSINESS">Empresa</option>
          </select>
        </label>
        <label>
          <span>Tipo documento</span>
          <select
            name="documentType"
            value={values.documentType}
            onChange={(event) => setField("documentType", event.target.value)}
          >
            <option value="ID">Cédula</option>
            <option value="RNC">RNC</option>
            <option value="PASSPORT">Pasaporte</option>
          </select>
        </label>
        <label>
          <span>Documento</span>
          <input
            name="documentNumber"
            value={values.documentNumber ?? ""}
            onChange={(event) => setField("documentNumber", event.target.value)}
          />
          {errors.documentNumber && (
            <small className="field-error">{errors.documentNumber}</small>
          )}
        </label>
        <label>
          <span>Empresa (si aplica)</span>
          <input
            name="companyName"
            value={values.companyName ?? ""}
            onChange={(event) => setField("companyName", event.target.value)}
          />
          {errors.companyName && (
            <small className="field-error">{errors.companyName}</small>
          )}
        </label>
        <label>
          <span>Correo facturación</span>
          <input
            name="billingEmail"
            type="email"
            value={values.billingEmail ?? ""}
            onChange={(event) => setField("billingEmail", event.target.value)}
          />
        </label>
      </div>
      <footer className="modal-actions">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? "Creando..." : "Crear cliente"}
        </Button>
      </footer>
    </form>
  );
}

function validate(
  values: FormValues,
  selectedCategory: AnyRecord | undefined,
  options: { requireManualQuote?: boolean } = {},
) {
  const errors: Record<string, string> = {};
  for (const field of [
    "customerId",
    "vehicleCategoryId",
    "originProvince",
    "originCity",
    "originAddress",
    "originContactName",
    "originContactPhone",
    "destinationProvince",
    "destinationCity",
    "destinationAddress",
    "destinationContactName",
    "destinationContactPhone",
    "itemDescription",
    "itemQuantity",
    "itemWeightKg",
  ]) {
    if (!values[field]?.trim()) errors[field] = "Este campo es requerido";
  }
  if (values.serviceType === "SCHEDULED" && !values.scheduleAt)
    errors.scheduleAt = "La fecha es requerida para órdenes programadas";
  validateOptionalNumber(values, errors, "originLatitude", -90, 90);
  validateOptionalNumber(values, errors, "destinationLatitude", -90, 90);
  validateOptionalNumber(values, errors, "originLongitude", -180, 180);
  validateOptionalNumber(values, errors, "destinationLongitude", -180, 180);
  validateNonNegative(values, errors, "itemWeightKg");
  validateNonNegative(values, errors, "itemVolumeM3");
  validateNonNegative(values, errors, "itemDeclaredValue");
  validateNonNegative(values, errors, "estimatedDurationMin");
  validateNonNegative(values, errors, "tollAmount");
  validateNonNegative(values, errors, "weightSurcharge");
  validateNonNegative(values, errors, "volumeSurcharge");
  validateNonNegative(values, errors, "otherCharges");
  validateNonNegative(values, errors, "discountAmount");
  validateNonNegative(values, errors, "manualAdjustmentAmount");
  if (options.requireManualQuote) {
    validatePositive(values, errors, "distanceKm");
  } else {
    validateNonNegative(values, errors, "distanceKm");
  }
  const quantity = Number(values.itemQuantity);
  if (!Number.isFinite(quantity) || quantity <= 0)
    errors.itemQuantity = "La cantidad debe ser mayor que cero";
  if (selectedCategory) {
    const totalWeight =
      Number(values.itemWeightKg) * Math.max(quantity || 1, 1);
    const totalVolume =
      Number(values.itemVolumeM3 || 0) * Math.max(quantity || 1, 1);
    const maxWeight = Number(selectedCategory.maxWeightKg);
    const maxVolume = Number(selectedCategory.maxVolumenM3);
    if (Number.isFinite(maxWeight) && totalWeight > maxWeight)
      errors.itemWeightKg = `Supera la capacidad (${maxWeight} kg)`;
    if (Number.isFinite(maxVolume) && totalVolume > maxVolume)
      errors.itemVolumeM3 = `Supera la capacidad (${maxVolume} m³)`;
  }
  return errors;
}

function validatePositive(
  values: FormValues,
  errors: Record<string, string>,
  field: string,
) {
  const parsed = Number(values[field]);
  if (!values[field] || !Number.isFinite(parsed) || parsed <= 0)
    errors[field] = "Debe ser mayor que cero";
}

function validateQuickCustomer(values: FormValues) {
  const errors: Record<string, string> = {};
  for (const field of [
    "fullName",
    "email",
    "phone",
    "customerType",
    "documentType",
    "documentNumber",
  ]) {
    if (!values[field]?.trim()) errors[field] = "Este campo es requerido";
  }
  if (values.email && !/^\S+@\S+\.\S+$/.test(values.email))
    errors.email = "Correo inválido";
  if (values.customerType === "BUSINESS" && !values.companyName?.trim())
    errors.companyName = "La empresa requiere razón social";
  return errors;
}

function validateOptionalNumber(
  values: FormValues,
  errors: Record<string, string>,
  field: string,
  min: number,
  max: number,
) {
  if (!values[field]) return;
  const parsed = Number(values[field]);
  if (!Number.isFinite(parsed) || parsed < min || parsed > max)
    errors[field] = `Debe estar entre ${min} y ${max}`;
}

function validateNonNegative(
  values: FormValues,
  errors: Record<string, string>,
  field: string,
) {
  if (!values[field]) return;
  const parsed = Number(values[field]);
  if (!Number.isFinite(parsed) || parsed < 0)
    errors[field] = "Debe ser cero o mayor";
}

function customerLabel(customer: AnyRecord) {
  const user = asRecord(customer.user);
  return String(
    customer.companyName ??
      user?.fullName ??
      customer.documentNumber ??
      "Cliente sin nombre",
  );
}

function customerMeta(customer: AnyRecord) {
  const user = asRecord(customer.user);
  return [user?.email, user?.phone, customer.documentNumber]
    .filter(Boolean)
    .join(" · ");
}

function categoryOptionLabel(category: AnyRecord) {
  return [
    String(category.name ?? "Categoría"),
    String(category.code ?? ""),
    category.maxWeightKg ? `${String(category.maxWeightKg)} kg` : "",
    category.maxVolumenM3 ? `${String(category.maxVolumenM3)} m³` : "",
  ]
    .filter(Boolean)
    .join(" · ");
}

function getQuoteNumber(quote: AnyRecord, key: string) {
  const value = quote[key];
  const parsed =
    typeof value === "number" || typeof value === "string"
      ? Number(value)
      : Number.NaN;

  return Number.isFinite(parsed) ? parsed : 0;
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("es-DO", {
    style: "currency",
    currency: "DOP",
  }).format(value);
}

function asRecord(value: unknown): AnyRecord | undefined {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as AnyRecord)
    : undefined;
}
