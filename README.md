# Taller Biker — Control de Vehículos

Sistema sencillo para que **una sola persona** lleve el control de los vehículos que entran al
taller: por qué entraron, en qué estado van, cuánto tiempo llevan adentro y cuánto se facturó
en el mes.

No necesita internet, ni instalación, ni cuentas de usuario. Es una página web que se abre en
el navegador de la computadora del taller y guarda todo en esa misma máquina.

## Cómo se usa

1. Abrir el archivo `index.html` (doble clic) o entrar a la vista previa publicada.
2. **Ajustes** → poner el nombre del taller, el teléfono, la moneda y los días de alerta.
3. **+ Registrar entrada** cada vez que llega un vehículo.
4. Ir cambiando el estado mientras se repara (diagnóstico → reparación → listo).
5. Al entregar: **Registrar entrega** con el monto realmente cobrado.
6. **Reportes** → elegir el mes para ver lo facturado.

Para probarlo sin registrar nada real: **Ajustes → Cargar ejemplos**.

## Qué hace

| Función | Detalle |
|---|---|
| Registro de entrada | Placa, tipo, marca, modelo, color, cliente, teléfono, motivo de ingreso, mecánico |
| Estados | Recibido · En diagnóstico · En reparación · Esperando repuesto · Listo · Entregado |
| Recordatorios | Aviso en amarillo al pasar los días configurados y en rojo cuando ya es urgente |
| Montos | Presupuesto estimado, monto final cobrado, abonos y saldo pendiente |
| Reporte mensual | Facturado del mes, trabajos entregados, promedio por trabajo, saldo sin cobrar y comparación con el mes anterior |
| Resumen del año | Barras mes a mes del monto facturado |
| Historial | Cada cambio de estado, nota y pago queda registrado con fecha |
| Orden impresa | Hoja de orden de trabajo / recibo lista para imprimir |
| Exportar | Respaldo completo en `.json` y facturación del mes en `.csv` para Excel |

## Dónde se guardan los datos

En el almacenamiento local del navegador (`localStorage`), en la computadora donde se usa.

Esto implica dos cosas importantes:

- Los datos **no se comparten** entre computadoras ni entre navegadores distintos.
- Si se borran los datos de navegación del navegador, se pierde el registro.

Por eso el sistema recuerda cada semana descargar un respaldo:
**Ajustes → Descargar respaldo**. Ese archivo `.json` se puede guardar en una USB o en el correo
y se restaura con **Restaurar respaldo** en cualquier momento o en otra computadora.

## Archivos

```
index.html    Estructura de la página
styles.css    Estilos
app.js        Toda la lógica (registro, alertas, reportes, respaldos)
```

No usa librerías externas ni requiere compilar nada.
