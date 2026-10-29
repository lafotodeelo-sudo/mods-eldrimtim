# Producción IA

Panel al lado del chat para las producciones con IA de El Drim Tim. Anota cada generación de Higgsfield y Magnific con hora, plano, modelo, resolución, duración y tomas. El costo se mide con el saldo real de Higgsfield antes y después de cada generación, así que incluye lo que la plataforma cobre de verdad. Las cotizaciones (`get_cost`) se ven aparte y no suman al gasto.

## Arranque automático

No hace falta ningún comando. Cuando Claude reconoce que empieza o se retoma una producción con IA, abre el panel por su cuenta con el nombre del proyecto y el techo, y marca cada plano antes de generar. Los comandos de abajo quedan para corregir algo a mano.

## Comandos

- `/proyecto <nombre>`: empieza un proyecto y el gasto se cuenta desde ahí.
- `/techo <créditos>`: el techo del presupuesto (dos veces el ideal, según el método). Avisa al 80 % y al pasarlo.
- `/plano <plano>`: marca el plano en que se trabaja; cada generación queda anotada ahí.
- `/bitacora`: la bitácora en el formato del Método IA, lista para subir a `00 · REGISTRO`.
- `/cierre`: le pasa la bitácora a Claude para que proponga qué aprender para el método.
- `/produccion`: vuelve a abrir el panel.

Si el panel falla, la generación sigue igual: nunca frena un trabajo.
