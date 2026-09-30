import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui";
import type { DataRow } from "@/types/domain";

const PHONE_PATTERN = /^\+?[0-9]{10,15}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type CustomerType = "INDIVIDUAL" | "BUSINESS";

/** Contrasena temporal legible: 10 caracteres, con letras y numeros. */
function generatePassword() {
  const letters = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ";
  const digits = "23456789";
  const pick = (set: string) => set[crypto.getRandomValues(new Uint32Array(1))[0] % set.length];
  const chars = Array.from({ length: 7 }, () => pick(letters)).concat(Array.from({ length: 3 }, () => pick(digits)));
  return chars.sort(() => crypto.getRandomValues(new Uint32Array(1))[0] - 2 ** 31).join("");
}

/**
 * Alta y edicion de clientes desde el TMS con los mismos datos que pide el
 * registro del portal de clientes: tipo Personal/Empresa, documento segun el
 * tipo, razon social solo para empresas y una contrasena temporal de acceso.
 */
export function CustomerForm({
  initial,
  onSubmit,
  onCancel,
}: {
  initial?: DataRow;
  onSubmit: (values: Record<string, string>) => Promise<void> | void;
  onCancel: () => void;
}) {
  const editing = Boolean(initial);
  const [values, setValues] = useState({
    fullName: String(initial?.fullName ?? ""),
    phone: String(initial?.phone ?? ""),
    customerType: (String(initial?.customerType ?? "INDIVIDUAL") as CustomerType),
    documentType: String(initial?.documentType ?? "ID"),
    documentNumber: String(initial?.documentNumber ?? ""),
    companyName: String(initial?.companyName ?? ""),
    billingEmail: String(initial?.billingEmail ?? ""),
    email: String(initial?.email ?? ""),
    password: editing ? "" : generatePassword(),
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const set = (key: keyof typeof values, value: string) => setValues((current) => ({ ...current, [key]: value }));

  const setType = (customerType: CustomerType) =>
    setValues((current) => ({
      ...current,
      customerType,
      documentType: customerType === "BUSINESS" ? "RNC" : current.documentType === "RNC" ? "ID" : current.documentType,
      companyName: customerType === "INDIVIDUAL" ? "" : current.companyName,
    }));

  const validate = () => {
    const next: Record<string, string> = {};
    if (values.fullName.trim().length < 2) next.fullName = "Escribe el nombre completo.";
    if (!PHONE_PATTERN.test(values.phone.replace(/[\s-]/g, ""))) next.phone = "Entre 10 y 15 dígitos, ej. +18095551234.";
    if (values.documentNumber.trim().length < 3) next.documentNumber = "Indica el documento.";
    if (values.customerType === "BUSINESS" && values.documentType !== "RNC") next.documentType = "Una empresa se identifica con RNC.";
    if (values.customerType === "BUSINESS" && values.companyName.trim().length < 3) next.companyName = "La empresa requiere razón social.";
    if (!EMAIL_PATTERN.test(values.email.trim())) next.email = "Correo de acceso no válido.";
    if (values.billingEmail.trim() && !EMAIL_PATTERN.test(values.billingEmail.trim())) next.billingEmail = "Correo de facturación no válido.";
    if (!editing && !(values.password.length >= 8 && /[A-Za-z]/.test(values.password) && /\d/.test(values.password))) {
      next.password = "Mínimo 8 caracteres con letras y números.";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      await onSubmit({
        ...values,
        phone: values.phone.replace(/[\s-]/g, ""),
        billingEmail: values.billingEmail.trim() || values.email.trim(),
      });
    } finally {
      setSaving(false);
    }
  };

  const field = (key: keyof typeof values, labelText: string, input: React.ReactNode, className = "") => (
    <label className={className}>
      <span>{labelText}</span>
      {input}
      {errors[key] ? <small className="field-error">{errors[key]}</small> : null}
    </label>
  );

  return (
    <form className="customer-form" onSubmit={(event) => void submit(event)}>
      <div className="customer-type-grid" role="radiogroup" aria-label="Tipo de cliente">
        <button type="button" className={values.customerType === "INDIVIDUAL" ? "is-active" : ""} aria-pressed={values.customerType === "INDIVIDUAL"} onClick={() => setType("INDIVIDUAL")}>
          <strong>Personal</strong>
          <span>Viajes puntuales, pago con tarjeta o cheque.</span>
        </button>
        <button type="button" className={values.customerType === "BUSINESS" ? "is-active" : ""} aria-pressed={values.customerType === "BUSINESS"} onClick={() => setType("BUSINESS")}>
          <strong>Empresa</strong>
          <span>Facturación con RNC y crédito corporativo.</span>
        </button>
      </div>

      <div className="form-grid">
        {field("fullName", values.customerType === "BUSINESS" ? "Nombre del contacto" : "Nombre completo", <input autoComplete="name" value={values.fullName} onChange={(event) => set("fullName", event.target.value)} />, "span-2")}
        {field("phone", "Teléfono", <input inputMode="tel" placeholder="+18095551234" value={values.phone} onChange={(event) => set("phone", event.target.value)} />)}
        {values.customerType === "BUSINESS"
          ? field("companyName", "Razón social", <input value={values.companyName} onChange={(event) => set("companyName", event.target.value)} />)
          : <span />}
        {field(
          "documentType",
          "Tipo de documento",
          <select value={values.documentType} onChange={(event) => set("documentType", event.target.value)}>
            {values.customerType === "BUSINESS" ? <option value="RNC">RNC</option> : null}
            <option value="ID">Cédula</option>
            <option value="PASSPORT">Pasaporte</option>
            {values.customerType !== "BUSINESS" ? <option value="RNC">RNC</option> : null}
          </select>,
        )}
        {field("documentNumber", values.documentType === "RNC" ? "RNC" : values.documentType === "PASSPORT" ? "Pasaporte" : "Cédula", <input value={values.documentNumber} onChange={(event) => set("documentNumber", event.target.value)} />)}
        {field("email", "Correo de acceso", <input autoComplete="email" type="email" value={values.email} onChange={(event) => set("email", event.target.value)} />)}
        {field("billingEmail", "Correo de facturación (opcional)", <input type="email" placeholder="Si se deja vacío, se usa el de acceso" value={values.billingEmail} onChange={(event) => set("billingEmail", event.target.value)} />)}
        {!editing
          ? field(
              "password",
              "Contraseña temporal",
              <div className="password-row">
                <input value={values.password} onChange={(event) => set("password", event.target.value)} />
                <Button type="button" variant="secondary" onClick={() => set("password", generatePassword())}>
                  Generar
                </Button>
              </div>,
              "span-2",
            )
          : null}
      </div>

      <div className="form-summary">
        <span>{editing ? "Los cambios quedan registrados en auditoría." : "Entrega la contraseña al cliente: podrá cambiarla en su perfil."}</span>
      </div>
      <footer className="modal-actions">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? "Guardando..." : editing ? "Guardar cambios" : "Crear cliente"}
        </Button>
      </footer>
    </form>
  );
}
