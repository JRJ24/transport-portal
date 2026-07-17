# Backlog de issues - App Portal TMS

Estas issues corresponden solo al repositorio `JRJ24/transport-portal`.

No incluye Backend/API porque ya esta colocado. No incluye App Mobile Cliente ni App Mobile Conductor.

## Issues a crear

| RF | Titulo | Alcance Portal TMS |
| --- | --- | --- |
| RF-001 | Registro de usuario | Opcional |
| RF-002 | Inicio de sesion | Si |
| RF-003 | Recuperacion de contrasena | Si |
| RF-004 | Cambio de contrasena | Si |
| RF-005 | Cierre de sesion | Si |
| RF-006 | Actualizacion de perfil | Si |
| RF-007 | Gestion de direcciones | Consulta |
| RF-008 | Administracion de roles | Si |
| RF-009 | Registro de vehiculos | Si |
| RF-010 | Modificacion de vehiculos | Si |
| RF-011 | Inactivacion de vehiculos | Si |
| RF-012 | Consulta de vehiculos | Si |
| RF-013 | Registro de conductores | Si |
| RF-014 | Cambio de estado conductor | Si |
| RF-015 | Consulta historial conductor | Si |
| RF-016 | Crear solicitud | Si |
| RF-017 | Cotizacion automatica | Si |
| RF-018 | Confirmacion del servicio | Si |
| RF-019 | Cancelacion | Si |
| RF-020 | Reprogramacion | Si |
| RF-021 | Reserva inmediata | Si |
| RF-022 | Reserva programada | Si |
| RF-023 | Recordatorios | Si |
| RF-024-RF-035 | Calculo de tarifa completo | Configura/consulta |
| RF-036 | Procesamiento del pago | Consulta |
| RF-037 | Confirmacion de pago | Si |
| RF-038 | Reembolso | Si |
| RF-039 | Historial de pagos | Si |
| RF-040 | Asignacion automatica | Si |
| RF-041 | Asignacion manual | Si |
| RF-042 | Reasignacion | Si |
| RF-043 | Compartir GPS | Visualiza |
| RF-044 | Actualizacion de posicion | Visualiza |
| RF-045 | Visualizacion en mapa | Si |
| RF-046 | Tiempo estimado | Si |
| RF-047 | Historial del recorrido | Si |
| RF-048 | Captura fotografica | Si |
| RF-049 | Captura de firma | Si |
| RF-050 | Registro de coordenadas | Si |
| RF-051 | Registro de fecha y hora | Si |
| RF-052 | Validacion de evidencias | Si |
| RF-053 | Registrar incidencia | Si |
| RF-054 | Adjuntar fotografias | Si |
| RF-055 | Clasificacion | Si |
| RF-056 | Seguimiento | Si |
| RF-058 | Correos electronicos | Recibe |
| RF-059 | Cambios de estado | Si |
| RF-060 | Alertas operativas | Si |
| RF-061 | Dashboard | Si |
| RF-062 | Gestion de usuarios | Si |
| RF-063 | Gestion de tarifas | Si |
| RF-064 | Gestion de parametros | Si |
| RF-065 | Gestion de catalogos | Si |
| RF-066 | Gestion de conductores | Si |
| RF-067 | Gestion de vehiculos | Si |
| RF-068 | Gestion de solicitudes | Si |
| RF-069 | Gestion de reservas | Si |
| RF-070 | Reportes | Si |
| RF-071 | Exportacion | Si |
| RF-072 | Registro de eventos | Consulta |
| RF-073 | Consulta de auditoria | Si |

## Plantilla de cuerpo

Usar este cuerpo para cada issue:

```md
## Requerimiento

Implementar el requisito funcional indicado para App Portal TMS.

## Alcance

- Repositorio: JRJ24/transport-portal
- Plataforma: App Portal TMS
- RF: <RF>
- Funcionalidad: <Titulo>
- Nivel requerido: <Alcance Portal TMS>

## Criterios de aceptacion

- La funcionalidad queda disponible segun el alcance definido para Portal TMS.
- Se integra con los endpoints de Backend/API existentes cuando aplique.
- Se validan estados de carga, error y exito en la interfaz.
- Se respetan permisos y roles del portal cuando aplique.
```
