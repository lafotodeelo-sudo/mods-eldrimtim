# Prueba del Destilador

Cada vez que se cambien las instrucciones del Destilador (`hooks/instrucciones.ts`), se prueba antes de darlo por bueno.

## El dictado de prueba

De 3 a 5 minutos, dictado de corrido, sobre un proyecto real (por ejemplo, el brief de un spot para un cliente). Debe traer a propósito:

- dos o tres cambios de opinión ("en blanco y negro… no, mejor color pero desaturado");
- un tema que interrumpa a otro (del guion al presupuesto y de vuelta al casting);
- nombres, cifras y una fecha de entrega;
- una decisión que de verdad no esté tomada ("no sé si 30 o 45 segundos").

## Las cinco preguntas

1. ¿Quedaron las decisiones finales y se fueron las descartadas?
2. ¿Están exactos todos los nombres, cifras y fechas?
3. ¿Inventó algo que no se dijo?
4. ¿Marcó las dudas como dudas, en "Notas del destilador", sin resolverlas?
5. ¿Suena a Eloy hablándole al modelo y no al destilador?

Si pasa las cinco, el cambio sirve para producción. Si falla una, se corrige la instrucción que corresponde y se repite la prueba.

## Registro

| Fecha | Versión | Dictado | 1 | 2 | 3 | 4 | 5 | Nota |
|---|---|---|---|---|---|---|---|---|
| 2026-10-29 | 0.1.0 | Corto, sobre la herramienta (~200 palabras) | sí | sí | no | — | no | Limpia bien. Agregó pedidos y escribió las dudas en la voz de Eloy. Corregido en 0.2.0. |
