$ErrorActionPreference = "Stop"

$repo = "JRJ24/transport-portal"
$platform = "App Portal TMS"

$issues = @(
  @{ rf = "RF-001"; title = "Registro de usuario"; scope = "Opcional" },
  @{ rf = "RF-002"; title = "Inicio de sesion"; scope = "Si" },
  @{ rf = "RF-003"; title = "Recuperacion de contrasena"; scope = "Si" },
  @{ rf = "RF-004"; title = "Cambio de contrasena"; scope = "Si" },
  @{ rf = "RF-005"; title = "Cierre de sesion"; scope = "Si" },
  @{ rf = "RF-006"; title = "Actualizacion de perfil"; scope = "Si" },
  @{ rf = "RF-007"; title = "Gestion de direcciones"; scope = "Consulta" },
  @{ rf = "RF-008"; title = "Administracion de roles"; scope = "Si" },
  @{ rf = "RF-009"; title = "Registro de vehiculos"; scope = "Si" },
  @{ rf = "RF-010"; title = "Modificacion de vehiculos"; scope = "Si" },
  @{ rf = "RF-011"; title = "Inactivacion de vehiculos"; scope = "Si" },
  @{ rf = "RF-012"; title = "Consulta de vehiculos"; scope = "Si" },
  @{ rf = "RF-013"; title = "Registro de conductores"; scope = "Si" },
  @{ rf = "RF-014"; title = "Cambio de estado conductor"; scope = "Si" },
  @{ rf = "RF-015"; title = "Consulta historial conductor"; scope = "Si" },
  @{ rf = "RF-016"; title = "Crear solicitud"; scope = "Si" },
  @{ rf = "RF-017"; title = "Cotizacion automatica"; scope = "Si" },
  @{ rf = "RF-018"; title = "Confirmacion del servicio"; scope = "Si" },
  @{ rf = "RF-019"; title = "Cancelacion"; scope = "Si" },
  @{ rf = "RF-020"; title = "Reprogramacion"; scope = "Si" },
  @{ rf = "RF-021"; title = "Reserva inmediata"; scope = "Si" },
  @{ rf = "RF-022"; title = "Reserva programada"; scope = "Si" },
  @{ rf = "RF-023"; title = "Recordatorios"; scope = "Si" },
  @{ rf = "RF-024-RF-035"; title = "Calculo de tarifa completo"; scope = "Configura/consulta" },
  @{ rf = "RF-036"; title = "Procesamiento del pago"; scope = "Consulta" },
  @{ rf = "RF-037"; title = "Confirmacion de pago"; scope = "Si" },
  @{ rf = "RF-038"; title = "Reembolso"; scope = "Si" },
  @{ rf = "RF-039"; title = "Historial de pagos"; scope = "Si" },
  @{ rf = "RF-040"; title = "Asignacion automatica"; scope = "Si" },
  @{ rf = "RF-041"; title = "Asignacion manual"; scope = "Si" },
  @{ rf = "RF-042"; title = "Reasignacion"; scope = "Si" },
  @{ rf = "RF-043"; title = "Compartir GPS"; scope = "Visualiza" },
  @{ rf = "RF-044"; title = "Actualizacion de posicion"; scope = "Visualiza" },
  @{ rf = "RF-045"; title = "Visualizacion en mapa"; scope = "Si" },
  @{ rf = "RF-046"; title = "Tiempo estimado"; scope = "Si" },
  @{ rf = "RF-047"; title = "Historial del recorrido"; scope = "Si" },
  @{ rf = "RF-048"; title = "Captura fotografica"; scope = "Si" },
  @{ rf = "RF-049"; title = "Captura de firma"; scope = "Si" },
  @{ rf = "RF-050"; title = "Registro de coordenadas"; scope = "Si" },
  @{ rf = "RF-051"; title = "Registro de fecha y hora"; scope = "Si" },
  @{ rf = "RF-052"; title = "Validacion de evidencias"; scope = "Si" },
  @{ rf = "RF-053"; title = "Registrar incidencia"; scope = "Si" },
  @{ rf = "RF-054"; title = "Adjuntar fotografias"; scope = "Si" },
  @{ rf = "RF-055"; title = "Clasificacion"; scope = "Si" },
  @{ rf = "RF-056"; title = "Seguimiento"; scope = "Si" },
  @{ rf = "RF-058"; title = "Correos electronicos"; scope = "Recibe" },
  @{ rf = "RF-059"; title = "Cambios de estado"; scope = "Si" },
  @{ rf = "RF-060"; title = "Alertas operativas"; scope = "Si" },
  @{ rf = "RF-061"; title = "Dashboard"; scope = "Si" },
  @{ rf = "RF-062"; title = "Gestion de usuarios"; scope = "Si" },
  @{ rf = "RF-063"; title = "Gestion de tarifas"; scope = "Si" },
  @{ rf = "RF-064"; title = "Gestion de parametros"; scope = "Si" },
  @{ rf = "RF-065"; title = "Gestion de catalogos"; scope = "Si" },
  @{ rf = "RF-066"; title = "Gestion de conductores"; scope = "Si" },
  @{ rf = "RF-067"; title = "Gestion de vehiculos"; scope = "Si" },
  @{ rf = "RF-068"; title = "Gestion de solicitudes"; scope = "Si" },
  @{ rf = "RF-069"; title = "Gestion de reservas"; scope = "Si" },
  @{ rf = "RF-070"; title = "Reportes"; scope = "Si" },
  @{ rf = "RF-071"; title = "Exportacion"; scope = "Si" },
  @{ rf = "RF-072"; title = "Registro de eventos"; scope = "Consulta" },
  @{ rf = "RF-073"; title = "Consulta de auditoria"; scope = "Si" }
)

foreach ($issue in $issues) {
  $body = @"
## Requerimiento

Implementar el requisito funcional indicado para $platform.

## Alcance

- Repositorio: $repo
- Plataforma: $platform
- RF: $($issue.rf)
- Funcionalidad: $($issue.title)
- Nivel requerido: $($issue.scope)

## Criterios de aceptacion

- La funcionalidad queda disponible segun el alcance definido para Portal TMS.
- Se integra con los endpoints de Backend/API existentes cuando aplique.
- Se validan estados de carga, error y exito en la interfaz.
- Se respetan permisos y roles del portal cuando aplique.
"@

  gh issue create --repo $repo --title "$($issue.rf) - $($issue.title)" --body $body
}
