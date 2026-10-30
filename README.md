# Mods de El Drim Tim

Mods de Claude Code hechos para el flujo de trabajo de El Drim Tim.

| Mod | Qué hace |
|---|---|
| `destilador` | Convierte dictados largos, con muletillas y vueltas, en prompts claros antes de que lleguen a Claude. |
| `guardian-publicacion` | Franja que avisa cuando hay cambios sin publicar en la web o en los mods, con un botón para publicarlos con aprobación. |
| `produccion-ia` | Panel al lado del chat: anota cada generación de Higgsfield y Magnific por plano, mide el gasto real contra el techo y arma la bitácora del Método IA. |

## Instalar

En el prompt de una sesión de Claude Code:

```
/plugin install destilador --marketplace lafotodeelo-sudo/mods-eldrimtim
/plugin install produccion-ia --marketplace lafotodeelo-sudo/mods-eldrimtim
/plugin install guardian-publicacion --marketplace lafotodeelo-sudo/mods-eldrimtim
```

La primera vez pregunta si agregar el marketplace: `y`. Después, el alcance de la instalación.

Desde una terminal:

```
claude plugin install destilador --marketplace lafotodeelo-sudo/mods-eldrimtim
claude plugin install produccion-ia --marketplace lafotodeelo-sudo/mods-eldrimtim
claude plugin install guardian-publicacion --marketplace lafotodeelo-sudo/mods-eldrimtim
```

Cada mod tiene su propio README con sus comandos.
