# Integrar Fluxis con tu editor de código con IA

Fluxis publica documentación estructurada para agentes de IA. Podés integrar Fluxis en tu proyecto usando tu editor favorito con asistencia de IA — sin leer la documentación entera de antemano.

---

## Opción 1 — Pasarle la URL directamente al LLM (cero setup)

La opción más simple de todas: pegás la URL de la documentación en el chat y le pedís al LLM que la lea y la use. Sin instalaciones, sin descargas.

Funciona con cualquier LLM que tenga capacidad de fetch de URLs: **Claude.ai** (Pro/Team), **ChatGPT** (con browsing), **Gemini**, y **Cursor** con la sintaxis `@url`.

### URLs para compartir

| SDK | URL |
|-----|-----|
| TypeScript / Node.js | `https://raw.githubusercontent.com/fluxisus/fluxis-sdk/main/packages/backend/sdk/llms-full.txt` |
| C# / .NET | `https://raw.githubusercontent.com/fluxisus/fluxis-sdk/main/packages/backend/sdk-csharp/llms-full.txt` |
| Conceptos generales | `https://raw.githubusercontent.com/fluxisus/fluxis-sdk/main/llms.txt` |

> Se usan las URLs `raw.githubusercontent.com` (texto plano) en lugar de la URL del repo de GitHub porque los LLMs las leen directamente sin HTML ni navegación.

### En Claude.ai / ChatGPT / Gemini

Pegá esto en el chat tal cual (reemplazando el lenguaje que corresponda):

```
Fetch this URL and use it as context to help me integrate Fluxis payments:
https://raw.githubusercontent.com/fluxisus/fluxis-sdk/main/packages/backend/sdk/llms-full.txt

I want to: [describí lo que necesitás, ej: "create a payment request and handle webhooks in Express"]
```

El LLM va a leer el archivo, procesar toda la documentación y responderte con código listo para usar.

### En Cursor

Cursor soporta referenciar URLs directamente con `@`:

```
@https://raw.githubusercontent.com/fluxisus/fluxis-sdk/main/packages/backend/sdk/llms-full.txt

Create a payment request for $25 USDC on Polygon and add webhook verification.
```

### Limitaciones de este enfoque

| Limitación | Detalle |
|------------|---------|
| Depende del LLM | No todos los planes soportan fetch de URLs (ej: ChatGPT Free no tiene browsing) |
| Sin persistencia | Hay que pegar la URL en cada conversación nueva |
| Latencia inicial | El LLM tarda unos segundos en hacer el fetch y procesar el contenido |
| Ventana de contexto | En conversaciones largas el LLM puede "olvidar" el contenido inicial |

---

## Opción 2 — Context7 (Cursor, Windsurf, Claude Code, VS Code con Copilot)

[Context7](https://context7.com) es un servidor MCP que inyecta documentación actualizada de librerías directamente en tu sesión de IA. Una vez configurado, le pedís al agente que use la documentación de Fluxis y él la trae solo.

### Setup en Cursor

1. Creá o editá el archivo `.cursor/mcp.json` en la raíz de tu proyecto:

```json
{
  "mcpServers": {
    "context7": {
      "command": "npx",
      "args": ["-y", "@upstash/context7-mcp@latest"]
    }
  }
}
```

2. Reiniciá Cursor. Desde ese momento, podés pedirle al agente:

> "Use context7 to find Fluxis SDK documentation and create a payment request for 25 USDC on Polygon"

El agente va a buscar la documentación de Fluxis en Context7 y va a generar el código correcto para tu lenguaje.

### Setup en Claude Code

```bash
claude mcp add context7 -- npx -y @upstash/context7-mcp@latest
```

Luego, en cualquier sesión:

```
> use context7 and integrate Fluxis to create a hosted checkout for $50 USD
```

### Setup en Windsurf / VS Code con GitHub Copilot

Agregá esto al archivo de configuración MCP de tu editor (`mcp_config.json` o equivalente):

```json
{
  "mcpServers": {
    "context7": {
      "command": "npx",
      "args": ["-y", "@upstash/context7-mcp@latest"]
    }
  }
}
```

### Ejemplos de prompts que funcionan bien

```
"Use context7 for Fluxis and show me how to create a payment request in TypeScript"

"Use context7 for Fluxis and set up webhook verification in my Express app"

"Use context7 for Fluxis and implement the full checkout flow in C#"
```

### Limitaciones de Context7

| Limitación | Detalle |
|------------|---------|
| Requiere Node.js | `npx` tiene que estar disponible en tu sistema |
| Primera llamada es lenta | Context7 descarga y cachea los docs en la primera consulta (~3–5 s) |
| Requiere conexión a internet | Los docs se sirven desde los servidores de Context7 |
| El agente debe ser instruido | Hay que mencionar "use context7" explícitamente, no lo hace automático |

---

## Opción 3 — llms.txt (cualquier LLM, sin setup)

Si tu LLM no soporta fetch de URLs o querés trabajar offline, podés alimentar la documentación directamente copiando el contenido.

Fluxis publica archivos de documentación optimizados para IA:

| Archivo | Contenido | URL |
|---------|-----------|-----|
| Índice general | Conceptos comunes + lista de SDKs | [`llms.txt`](https://raw.githubusercontent.com/fluxisus/fluxis-sdk/main/llms.txt) |
| Guía TypeScript completa | Todo lo necesario para integrar en Node.js | [`packages/backend/sdk/llms-full.txt`](https://raw.githubusercontent.com/fluxisus/fluxis-sdk/main/packages/backend/sdk/llms-full.txt) |
| Guía C# completa | Todo lo necesario para integrar en .NET | [`packages/backend/sdk-csharp/llms-full.txt`](https://raw.githubusercontent.com/fluxisus/fluxis-sdk/main/packages/backend/sdk-csharp/llms-full.txt) |

### Cómo usarlos

**En el chat de Claude / ChatGPT:**

1. Abrí la URL del archivo que corresponde a tu lenguaje
2. Copiá todo el contenido
3. Pegalo al inicio de tu conversación con el mensaje:

> "Esta es la documentación del SDK de Fluxis. Usala para ayudarme a integrar pagos en mi proyecto."

**Desde la terminal (macOS/Linux):**

```bash
# Descargá la guía de TypeScript y copiala al portapapeles
curl -s https://raw.githubusercontent.com/fluxisus/fluxis-sdk/main/packages/backend/sdk/llms-full.txt | pbcopy

# Luego pegala en tu LLM favorito
```

**Con Cursor (sin MCP):**

Descargá el archivo y referencíalo en tu chat:

```bash
curl -s https://raw.githubusercontent.com/fluxisus/fluxis-sdk/main/packages/backend/sdk/llms-full.txt -o fluxis-docs.md
```

Luego en Cursor: `@fluxis-docs.md create a payment request`.

---

## Cuál opción elegir

| | URL directa | Context7 (MCP) | llms.txt manual |
|---|---|---|---|
| Setup requerido | No | Sí (5 min) | No |
| Funciona en | Claude.ai, ChatGPT, Gemini, Cursor | Cursor, Claude Code, Windsurf, VS Code | Cualquier LLM |
| Documentación siempre actualizada | Sí, en cada fetch | Sí, automático | Solo si la descargás de nuevo |
| Mejor para | Primera prueba, consulta rápida | Proyectos reales, uso recurrente | Sin acceso a internet |

---

## Primeros pasos recomendados

1. Obtené tus credenciales de API en el panel de Fluxis (staging: `fxs.stg.*`)
2. Elegí la opción que se adapte a tu flujo de trabajo
3. Pedile a tu agente de IA:

```
I have my Fluxis API key and secret. Set up a basic payment flow:
initialize the client, create a payment request for $10 USDC on Polygon,
and add webhook verification.
```

El agente va a generar el código completo, listo para usar.

---

¿Preguntas? → [docs.fluxis.us](https://docs.fluxis.us) · [support@fluxis.us](mailto:support@fluxis.us)
