import { useEffect, useId, useState, type FocusEvent, type KeyboardEvent } from "react";
import { Loader2, LocateFixed, X } from "lucide-react";
import type { LatLngLiteral } from "@/config/maps.config";
import {
  newPlaceSessionToken,
  resolvePlace,
  searchPlaces,
  type PlaceHit,
} from "./place-search";

export interface PlacePick {
  placeId: string;
  formattedAddress: string;
  /** Nunca nulo: si `details` no trae punto no emitimos nada. */
  point: LatLngLiteral;
}

export interface AddressAutocompleteProps {
  /** Fila resaltada = parada que recibe el toque en el mapa. */
  active?: boolean;
  /** Sesgo de resultados: la otra parada o el centro por defecto. */
  bias?: LatLngLiteral | null;
  /**
   * Texto inicial. Cambiarlo NO actualiza el input: el padre remonta el
   * componente con `key`, que es como React resetea estado sin efectos.
   */
  defaultValue?: string;
  disabled?: boolean;
  label: string;
  locating?: boolean;
  /** Foco en el input: el padre marca esta parada como activa. */
  onActivate?: () => void;
  /** El usuario vacio el campo. */
  onClear?: () => void;
  onPick: (pick: PlacePick) => void;
  /** Boton de GPS dentro del campo. Si no se pasa, no se pinta. */
  onUseMyLocation?: () => void;
  placeholder?: string;
  /** Color del punto de la parada. */
  tone?: string;
}

type Status = "idle" | "loading" | "ready" | "empty" | "error" | "resolving";

/** Google exige 2; con 3 se recorta bastante el gasto sin perder utilidad. */
const MIN_TERM = 3;
const DEBOUNCE_MS = 300;

/**
 * Campo de direccion con sugerencias, como el de las apps de viajes.
 *
 * Las sugerencias las sirve el backend (`/maps/places/*`) con la clave de
 * servidor, asi que funciona aunque la clave de navegador no tenga
 * facturacion activa.
 */
export function AddressAutocomplete({
  active = false,
  bias = null,
  defaultValue = "",
  disabled = false,
  label,
  locating = false,
  onActivate,
  onClear,
  onPick,
  onUseMyLocation,
  placeholder,
  tone,
}: AddressAutocompleteProps) {
  const fieldId = useId();
  const [query, setQuery] = useState(defaultValue);
  /** Texto que acabamos de insertar al seleccionar: no debe re-buscarse. */
  const [pickedTerm, setPickedTerm] = useState(defaultValue.trim());
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [hits, setHits] = useState<PlaceHit[]>([]);
  const [status, setStatus] = useState<Status>("idle");
  const [mock, setMock] = useState(false);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(-1);

  // Derivados primitivos: si el efecto dependiera de `bias`, su identidad lo
  // redispararia en cada render del padre.
  const term = query.trim();
  const biasLat = bias?.lat ?? null;
  const biasLng = bias?.lng ?? null;

  useEffect(() => {
    if (disabled || !open || !sessionToken) {
      return undefined;
    }

    if (term.length < MIN_TERM || term === pickedTerm) {
      return undefined;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => {
      setStatus("loading");
      searchPlaces({
        bias: biasLat !== null && biasLng !== null ? { lat: biasLat, lng: biasLng } : null,
        sessionToken,
        signal: controller.signal,
        term,
      })
        .then((result) => {
          // Corta la respuesta de una consulta que ya quedo obsoleta.
          if (controller.signal.aborted) {
            return;
          }

          setMock(result.mock);
          setHits(result.mock ? [] : result.hits);
          setHighlight(-1);
          setStatus(result.mock || result.hits.length > 0 ? "ready" : "empty");
        })
        .catch(() => {
          if (controller.signal.aborted) {
            return;
          }

          setHits([]);
          setStatus("error");
        });
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [biasLat, biasLng, disabled, open, pickedTerm, sessionToken, term]);

  const reset = () => {
    setQuery("");
    setPickedTerm("");
    setHits([]);
    setStatus("idle");
    setMock(false);
    setHighlight(-1);
    setSessionToken(null);
    onClear?.();
  };

  const handleChange = (next: string) => {
    setQuery(next);
    setOpen(true);
    // El token arranca con la primera pulsacion y dura hasta `details`.
    setSessionToken((current) => current ?? newPlaceSessionToken());

    if (next.trim() === "") {
      setHits([]);
      setStatus("idle");
      onClear?.();
    }
  };

  const pick = async (hit: PlaceHit) => {
    setQuery(hit.text);
    setPickedTerm(hit.text.trim());
    setOpen(false);
    setHighlight(-1);
    setStatus("resolving");

    const token = sessionToken;
    setSessionToken(null);

    try {
      const resolved = await resolvePlace({ placeId: hit.placeId, sessionToken: token });

      if (resolved.mock || !resolved.point) {
        setStatus("error");
        return;
      }

      setStatus("idle");
      onPick({
        placeId: resolved.placeId,
        formattedAddress: resolved.formattedAddress || hit.text,
        point: resolved.point,
      });
    } catch {
      setStatus("error");
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      setHighlight((current) => Math.min(current + 1, hits.length - 1));
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlight((current) => Math.max(current - 1, -1));
      return;
    }

    if (event.key === "Enter") {
      // Incondicional: el planificador vive dentro del <form> de la orden y
      // sin esto seleccionar con teclado la enviaria.
      event.preventDefault();
      if (open && highlight >= 0 && hits[highlight]) {
        void pick(hits[highlight]);
      }
      return;
    }

    if (event.key === "Escape") {
      if (open) {
        setOpen(false);
      } else {
        reset();
      }
    }
  };

  /** Cierra al salir del campo, pero no al pulsar una de sus opciones. */
  const handleBlur = (event: FocusEvent<HTMLDivElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget)) {
      setOpen(false);
    }
  };

  const busy = status === "loading" || status === "resolving";

  return (
    <div className={active ? "address-field is-active" : "address-field"} onBlur={handleBlur}>
      <span className="address-field__label">{label}</span>
      <div className="address-field__control">
        <i className="address-field__dot" style={{ background: tone }} />
        <input
          aria-activedescendant={highlight >= 0 ? `${fieldId}-opt-${highlight}` : undefined}
          aria-autocomplete="list"
          aria-controls={`${fieldId}-list`}
          aria-expanded={open}
          autoComplete="off"
          className="address-field__input"
          disabled={disabled}
          enterKeyHint="search"
          onChange={(event) => handleChange(event.target.value)}
          onFocus={() => {
            setOpen(true);
            onActivate?.();
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          role="combobox"
          spellCheck={false}
          value={query}
        />
        {busy ? <Loader2 className="address-field__spin" size={14} /> : null}
        {query && !busy ? (
          <button className="address-field__action" onClick={reset} tabIndex={-1} type="button">
            <X size={14} />
          </button>
        ) : null}
        {onUseMyLocation ? (
          <button
            className="address-field__action"
            disabled={locating}
            onClick={onUseMyLocation}
            title="Usar mi ubicacion"
            type="button"
          >
            <LocateFixed size={14} />
          </button>
        ) : null}
      </div>

      {open ? (
        <ul className="address-field__list" id={`${fieldId}-list`} role="listbox">
          {mock ? (
            <li className="address-field__status is-warning">
              Sugerencias simuladas: la API no tiene Places real. Marca el punto en el mapa.
            </li>
          ) : null}
          {status === "loading" ? (
            <li className="address-field__status">Buscando direcciones...</li>
          ) : null}
          {status === "empty" ? (
            <li className="address-field__status">
              Sin resultados. Toca el mapa para marcar la parada.
            </li>
          ) : null}
          {status === "error" ? (
            <li className="address-field__status is-error">
              No se pudo resolver la direccion. Toca el mapa para marcar la parada.
            </li>
          ) : null}
          {hits.map((hit, index) => (
            <li
              aria-selected={index === highlight}
              className={
                index === highlight
                  ? "address-field__option is-active"
                  : "address-field__option"
              }
              id={`${fieldId}-opt-${index}`}
              key={`${hit.placeId}-${index}`}
              onClick={() => void pick(hit)}
              onMouseEnter={() => setHighlight(index)}
              // Evita que el blur cierre la lista antes de que llegue el click.
              onMouseDown={(event) => event.preventDefault()}
              role="option"
            >
              <strong>{hit.mainText}</strong>
              {hit.secondaryText ? <small>{hit.secondaryText}</small> : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
