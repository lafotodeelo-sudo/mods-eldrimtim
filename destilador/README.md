# Destilador

Mod de Claude Code para El Drim Tim. Cuando Eloy manda un mensaje largo, dictado o escrito de corrido (con muletillas, pausas y autocorrecciones), el destilador lo reconstruye como un prompt claro antes de que llegue a Claude. El prompt sigue las buenas prácticas de ingeniería de prompts: objetivo, contexto, lo que se necesita, requisitos, formato de entrega y dudas abiertas.

## Cómo funciona

- Se activa solo en mensajes de 90 palabras o más.
- El mensaje destilado reemplaza al original en el chat. Claude recibe también el original completo, y si los dos se contradicen, manda el original.
- Si el pedido es un prompt para una IA visual (Higgsfield, Magnific, etc.), agrega al final un "Prompt visual" en inglés.
- Si el destilado falla, el mensaje pasa tal cual. Nunca bloquea.

## Comandos

- `crudo: ...` al inicio de un mensaje: lo manda sin destilar.
- `/destilar <texto>`: devuelve el prompt limpio para copiar, sin enviarlo.
- `/destilador`: muestra el estado.
- `/destilador off` y `/destilador on`: apagarlo y encenderlo.
- `/destilador umbral 120`: cambia desde cuántas palabras actúa.

Las instrucciones del destilado están en `hooks/instrucciones.ts`. Ahí se afina cómo reconstruye.
