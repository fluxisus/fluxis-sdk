# Fluxis Developer Experience (DX) Strategy
## Plan maestro para SDKs, documentación AI-friendly y herramientas de integración

---

## 1. Análisis del competidor: Talo Pay

Talo Pay (@santiTorm) es un procesador de pagos argentino que acaba de lanzar su **Talo-SDK** (`npm install talo-pay`). El tweet de Santiago Tormakh tuvo muy buena recepción y destaca varios puntos que debemos analizar y superar.

### Lo que Talo hace y comunica bien

**El mensaje del tweet es brillante en su simplicidad:**
- "Recibir transferencias ahora es APB" (Apretar un Botón)
- "Te da paja integrarlo? No pasa nada! Pedile a tu Cursor o Claude que aprenda como hacerlo usando context7 o leyendo el README del repo"
- "Si usas cualquier modelo como la gente es un one-shot garantizado"
- "Conciliación automática transfiriendo desde cualquier banco y con menos de 1% de comisión"
- "Acreditación AL INSTANTE"
- `npm install talo-pay`

**Lo que esto nos enseña:**
1. **AI-first onboarding como pitch**: No es solo una feature técnica, es un argumento de venta. "Dale tu README a Claude y te integra solo" es un mensaje poderosísimo.
2. **Un solo `npm install`**: La barrera de entrada es ridículamente baja.
3. **Context7 / README como documentación AI**: Mencionan que con Context7 (MCP server para docs) o con el README del repo, un agente AI puede hacer la integración completa.
4. **"One-shot garantizado"**: Se comprometen a que la integración sale de una con cualquier LLM decente. Esto implica que sus docs/README están muy bien estructurados.

### Talo Pay: Producto y ecosistema

| Aspecto | Talo Pay | Fluxis |
|---|---|---|
| **Core** | Transferencias bancarias automatizadas (CVU) + crypto + Pix | Pagos crypto via NASPIP protocol (QR/NFC/API) |
| **Mercado** | Argentina primero (monotributistas+), expandiendo a Brasil | LATAM (Argentina como base, con Belo como partner) |
| **Fee** | <1% (baja con volumen) | 1% TPV take rate |
| **SDK** | `talo-pay` (npm, recién lanzado) | No existe aún |
| **Docs** | Nextra (docs.talo.com.ar), bien estructuradas | No existe aún |
| **Integraciones** | Tiendanube, Shopify, WooCommerce, API propia | API propia (3 endpoints + 1 webhook) |
| **Sandbox** | sandbox.talo.com.ar con simulador de pagos | Planificado |
| **AI-ready** | README del repo + Context7 compatible | No existe aún |
| **Diferenciador** | Conciliación automática de transferencias bancarias AR | NASPIP protocol + embedded swap + agnóstico de canal |

### Lo que podemos aprender y superar

**Talo hace bien:**
- SDK como npm package simple
- Docs con Nextra (buen DX, markdown-based)
- Sandbox con simulador de pagos y faucet
- Webhooks minimalistas (solo IDs, hacés GET para el detalle)
- Mención explícita de AI coding assistants como canal de integración
- Partners API para multi-tenancy

**Fluxis puede hacer mejor:**
- NASPIP como protocolo abierto y documentable (Talo no tiene protocolo propio)
- Múltiples canales de pago (QR + NFC + API) vs solo transferencias bancarias
- `llms.txt` + `llms-full.txt` + `CLAUDE.md` (más robusto que solo un README)
- SDKs en múltiples lenguajes (no solo Node.js)
- Frontend SDK con componentes QR renderizables
- OpenAPI spec como fuente de verdad generadora de SDKs
- Embedded swap como feature diferenciadora

---

## 2. Estrategia: Superar a Talo en DX manteniendo la ventaja de protocolo

### Principio rector

> **"Integrá pagos crypto en tu app con un solo comando. O pedile a Claude que lo haga por vos."**

Este debe ser el mensaje equivalente al de Talo, pero con nuestra propia identidad.

### Arquitectura del Developer Toolkit

```
┌─────────────────────────────────────────────────────────────┐
│                    FLUXIS DEVELOPER TOOLKIT                  │
├──────────────┬──────────────┬──────────────┬────────────────┤
│  Backend     │  Frontend    │  AI-Ready    │  Zero-Code     │
│  SDKs        │  SDKs        │  Docs        │  Tools         │
├──────────────┼──────────────┼──────────────┼────────────────┤
│ TypeScript   │ React        │ llms.txt     │ Payment Links  │
│ Python       │ Vue          │ llms-full    │ QR Generator   │
│ Go           │ Vanilla JS   │ CLAUDE.md    │ Dashboard      │
│ PHP          │ React Native │ OpenAPI spec │ Webhooks UI    │
│ Ruby         │ Flutter      │ Context7     │ Sandbox        │
│              │              │ Postman      │                │
└──────────────┴──────────────┴──────────────┴────────────────┘
```

---

## 3. Plan de Backend SDKs

### Prioridad (informada por lo que Talo hizo)

Talo lanzó solo Node.js. Nosotros podemos lanzar TypeScript como P0 y rápidamente expandir:

| Prioridad | Lenguaje | Justificación | Paquete |
|---|---|---|---|
| P0 | **TypeScript** | Dominante en startups/ecommerce LATAM | `@fluxis/sdk` (npm) |
| P0 | **Python** | Segundo más usado, fuerte en fintech | `fluxis` (PyPI) |
| P1 | **Go** | Backend de Fluxis es Go — dogfooding | `github.com/fluxis/fluxis-go` |
| P1 | **PHP** | WooCommerce domina ecommerce LATAM | `fluxis/fluxis-php` (Packagist) |
| P2 | **Ruby** | Shopify apps y startups legacy | `fluxis` (RubyGems) |

### Estructura de cada SDK

```
@fluxis/sdk/
├── src/
│   ├── client.ts          # Cliente principal (auth, config, base URL)
│   ├── payments.ts        # Crear, consultar, cancelar payment requests
│   ├── webhooks.ts        # Verificación de firma HMAC + parsing
│   ├── naspip.ts          # Generar/parsear/validar tokens NASPIP
│   └── errors.ts          # Errores tipados con códigos
├── examples/
│   ├── express-checkout.ts
│   ├── webhook-handler.ts
│   └── qr-generation.ts
├── tests/
├── README.md              # README completo, AI-friendly
├── CLAUDE.md              # Instrucciones para agentes AI
├── CHANGELOG.md
└── package.json
```

### API surface del SDK (ejemplo TypeScript)

```typescript
import { Fluxis } from '@fluxis/sdk';

const fluxis = new Fluxis({
  apiKey: 'flx_live_...',
  environment: 'production', // o 'sandbox'
});

// 1. Crear payment request
const payment = await fluxis.payments.create({
  amount: '25.00',
  currency: 'USDC',
  receiveCurrency: 'ARS', // embedded swap: merchant recibe ARS
  merchantId: 'merch_abc123',
  expiresIn: 900,
  metadata: { orderId: 'ORD-001' },
});

// 2. Token NASPIP listo para QR/NFC
console.log(payment.naspipToken);
console.log(payment.qrData);

// 3. Consultar estado
const status = await fluxis.payments.get(payment.id);

// 4. Webhook handler (Express)
import { verifyWebhook } from '@fluxis/sdk';

app.post('/webhooks/fluxis', (req, res) => {
  const event = verifyWebhook(req.body, req.headers, webhookSecret);
  switch (event.type) {
    case 'payment.completed':
      // Acreditar al merchant
      break;
    case 'payment.expired':
      // Liberar stock
      break;
  }
  res.status(200).send('OK');
});
```

**Nota sobre diseño inspirado en Talo:** Talo usa webhooks minimalistas (solo IDs). Nosotros podemos hacer lo mismo: payload mínimo en el webhook + GET para detalle completo. Esto simplifica la verificación y reduce superficie de ataque.

---

## 4. Plan de Frontend SDKs

A diferencia de Talo (que no tiene frontend SDK visible), Fluxis tiene una ventaja enorme: **los tokens NASPIP se renderizan como QR codes**. Esto requiere componentes frontend.

### Componentes core

| Componente | Función |
|---|---|
| `<FluxisQR />` | Renderiza un token NASPIP como código QR |
| `<FluxisPaymentStatus />` | Widget de estado en tiempo real |
| `<FluxisCheckout />` | Flujo de checkout embebido |
| `<FluxisButton />` | Botón "Pagar con Fluxis" estilizable |

### React SDK

```tsx
import { FluxisProvider, FluxisQR, usePaymentStatus } from '@fluxis/react';

function CheckoutPage({ paymentId }: { paymentId: string }) {
  const { status, payment } = usePaymentStatus(paymentId);

  return (
    <FluxisProvider publishableKey="flx_pub_...">
      {status === 'pending' && (
        <FluxisQR
          paymentId={paymentId}
          size={256}
          logo="/merchant-logo.png"
          theme="dark" // usa colores Fluxis por defecto
          onScanned={() => console.log('QR escaneado')}
        />
      )}
      {status === 'completed' && <div>Pago confirmado ✓</div>}
    </FluxisProvider>
  );
}
```

### Vanilla JS (CDN, sin build step)

```html
<script src="https://js.fluxis.us/v1/fluxis.min.js"></script>
<div id="fluxis-qr"></div>
<script>
  Fluxis.init({ publishableKey: 'flx_pub_...' });
  Fluxis.renderQR('#fluxis-qr', {
    paymentId: 'pay_abc123',
    size: 256,
    theme: 'auto',
  });
</script>
```

### Prioridad de frameworks

| Prioridad | Framework | Paquete |
|---|---|---|
| P0 | **React** | `@fluxis/react` |
| P0 | **Vanilla JS** | `@fluxis/js` (CDN) |
| P1 | **Vue** | `@fluxis/vue` |
| P1 | **React Native** | `@fluxis/react-native` |
| P2 | **Flutter** | `fluxis_flutter` (pub.dev) |

---

## 5. Documentación AI-Friendly: La ventaja competitiva real

Talo menciona Context7 y README como forma de AI-onboarding. Nosotros podemos ir mucho más allá con una estrategia multi-capa:

### Capa 1: `llms.txt` (descubrimiento)

Archivo en la raíz de `docs.fluxis.us/llms.txt`:

```markdown
# Fluxis
> Fluxis is a crypto payment processing infrastructure layer that standardizes
> payment instructions via the NASPIP protocol. It provides a minimal API
> (3 endpoints + 1 webhook) for merchants, ecommerce, and wallets to accept
> crypto payments via QR, NFC, or direct API integration.
> A real partner integrated Fluxis in under 2 hours.

## Docs
- [Quick Start](https://docs.fluxis.us/quickstart.md): 5-minute integration guide
- [API Reference](https://docs.fluxis.us/api-reference.md): Complete REST API
- [NASPIP Protocol](https://docs.fluxis.us/naspip.md): Payment instruction standard
- [Authentication](https://docs.fluxis.us/auth.md): API keys and auth flow
- [Webhooks](https://docs.fluxis.us/webhooks.md): Events and signature verification
- [SDKs](https://docs.fluxis.us/sdks.md): TypeScript, Python, Go, PHP
- [Embedded Swap](https://docs.fluxis.us/swap.md): Multi-currency payments
- [Errors](https://docs.fluxis.us/errors.md): Error codes reference
- [Sandbox](https://docs.fluxis.us/sandbox.md): Test environment

## Optional
- [Architecture](https://docs.fluxis.us/architecture.md): System design
- [Migration Guide](https://docs.fluxis.us/migration.md): From other processors
- [NASPIP Spec](https://docs.fluxis.us/naspip-spec.md): Full protocol specification
```

### Capa 2: `llms-full.txt` (contexto completo)

Un solo archivo markdown con TODA la documentación consolidada. Optimizado para que un agente AI lo ingiera de una sola vez y tenga contexto completo para generar la integración.

### Capa 3: `CLAUDE.md` por repositorio

Cada repo de SDK tiene su propio `CLAUDE.md` con instrucciones específicas para agentes:

```markdown
# CLAUDE.md — Fluxis TypeScript SDK

## What is this?
Official Fluxis TypeScript SDK for backend payment integration.
Fluxis API: 3 endpoints + 1 webhook. Integration takes <2 hours.

## Quick Integration (copy-paste ready)
1. `npm install @fluxis/sdk`
2. Initialize: `new Fluxis({ apiKey: 'flx_...', environment: 'sandbox' })`
3. Create payment: `fluxis.payments.create({ amount, currency, merchantId })`
4. Handle webhook: `verifyWebhook(body, headers, secret)`
5. Check status: `fluxis.payments.get(paymentId)`

## API Endpoints (only 3!)
- POST /v1/payments — Create payment request → returns NASPIP token
- GET  /v1/payments/:id — Get payment status (for reconciliation)
- POST /v1/payments/:id/cancel — Cancel pending payment

## Webhook Events
- payment.created — Payment request was created
- payment.completed — Payment confirmed on-chain
- payment.failed — Payment failed
- payment.expired — NASPIP token expired
- payment.cancelled — Payment was cancelled

## NASPIP Token
The create payment response includes a `naspipToken` field.
This token encodes all payment instructions and can be:
- Rendered as QR code (use @fluxis/react or any QR library)
- Transmitted via NFC
- Passed directly to a paying wallet's API

## Common Mistakes to Avoid
- Do NOT poll /payments/:id aggressively. Use webhooks as primary.
- Always verify webhook signatures with verifyWebhook() before processing.
- NASPIP tokens expire — check `expiresAt` before rendering QR.
- Use 'sandbox' environment for testing (sandbox.api.fluxis.us).
- Webhook payloads are minimal (IDs only). GET full details after.

## Environment URLs
- Production: https://api.fluxis.us/v1
- Sandbox: https://sandbox.api.fluxis.us/v1

## Full Example: Express.js Checkout
[... complete working example ...]
```

### Capa 4: OpenAPI 3.1 Spec

Genera SDKs automáticamente, se importa en Postman, y los agentes AI la parsean nativamente:

```yaml
openapi: 3.1.0
info:
  title: Fluxis Payment API
  version: 1.0.0
  description: |
    Crypto payment processing. 3 endpoints + 1 webhook.
    Integration time: <2 hours.
servers:
  - url: https://api.fluxis.us/v1
    description: Production
  - url: https://sandbox.api.fluxis.us/v1
    description: Sandbox
```

### Capa 5: Context7 / MCP compatibility

Para que agentes como Claude Code o Cursor puedan usar Context7 (como menciona Talo), los docs deben estar en formato que Context7 pueda indexar. Esto se logra automáticamente si:
- La documentación está en markdown
- Hay un `llms.txt` bien estructurado
- El README del repo es completo y auto-contenido

### Comparación con Talo en AI-readiness

| Aspecto | Talo | Fluxis (plan) |
|---|---|---|
| README del repo | ✅ Sí | ✅ Sí, más completo |
| Context7 compatible | ✅ Sí (mencionado) | ✅ Sí |
| llms.txt | ❌ No visible | ✅ Sí |
| llms-full.txt | ❌ No visible | ✅ Sí |
| CLAUDE.md | ❌ No visible | ✅ En cada repo |
| OpenAPI spec pública | ❌ No visible | ✅ Sí |
| "One-shot" integration | ✅ Afirmado | ✅ Objetivo, verificable |

---

## 6. Herramientas Zero-Code y Plugins

Talo tiene integración oficial con Tiendanube, Shopify y WooCommerce. Nosotros debemos priorizar según nuestro mercado:

| Herramienta | Prioridad | Notas |
|---|---|---|
| **Payment Links** | P0 | URL compartible → checkout Fluxis |
| **QR Generator** (estático) | P0 | Para comercios físicos (montos fijos) |
| **Sandbox + Simulador** | P0 | Como Talo: sandbox con faucet de pagos |
| **Webhook Tester UI** | P1 | Ver/reenviar webhooks en tiempo real |
| **Plugin WooCommerce** | P1 | Gran base en LATAM |
| **Plugin Tiendanube** | P1 | Dominante en Argentina |
| **Plugin Shopify** | P2 | Menor penetración en LATAM crypto |

---

## 7. Roadmap de Ejecución

### Fase 1: "npm install @fluxis/sdk" (Semanas 1-3)

**Objetivo:** Tener la primera versión del SDK publicada y usable.

| Deliverable | Herramienta |
|---|---|
| OpenAPI 3.1 spec completa | Claude Code |
| TypeScript SDK v0.1 (`@fluxis/sdk`) | Claude Code |
| README.md completo y AI-friendly | Claude Code |
| CLAUDE.md para el repo | Claude Code |
| Tests unitarios + ejemplos | Claude Code |
| Publicación en npm | Manual (Ariel/Nacho) |

### Fase 2: Frontend + AI Docs (Semanas 4-6)

| Deliverable | Herramienta |
|---|---|
| React SDK (`@fluxis/react`) con FluxisQR | Claude Code |
| Vanilla JS SDK (`@fluxis/js`) CDN-ready | Claude Code |
| `llms.txt` y `llms-full.txt` | Claude Code |
| Python SDK | Claude Code |
| Colección Postman | Claude Code |
| Sandbox environment | Backend (Ariel) |

### Fase 3: Docs Site + Ecosystem (Semanas 7-10)

| Deliverable | Herramienta |
|---|---|
| Docs site (Nextra/Mintlify) en docs.fluxis.us | Claude Code |
| Quick Start guide (<5 min) | Claude Code |
| Go SDK | Claude Code |
| PHP SDK | Claude Code |
| Plugin WooCommerce | Claude Code |
| Payment Links feature | Dashboard (Ariel) |

### Fase 4: Expansión (Semanas 11-14)

| Deliverable | Herramienta |
|---|---|
| Plugin Tiendanube | Claude Code |
| Vue SDK | Claude Code |
| React Native SDK | Claude Code |
| Migration guide | Claude Code |
| Video demo de integración | Manual |

---

## 8. Prompts para Claude Code

### Para generar la OpenAPI spec

```
Generá una OpenAPI 3.1 spec para la Fluxis Payment API.

La API tiene 3 endpoints + 1 webhook:
- POST /v1/payments — Crear payment request
- GET /v1/payments/:id — Consultar estado
- POST /v1/payments/:id/cancel — Cancelar pago
- Webhook: POST a URL del merchant con eventos de pago

Incluí:
- Autenticación por API key (Bearer token)
- Dos servers: production (api.fluxis.us) y sandbox
- Schemas para PaymentRequest, Payment, WebhookEvent
- El campo naspipToken en la response de create
- Embedded swap (receiveCurrency opcional)
- Errores estándar con códigos
```

### Para generar el TypeScript SDK

```
Creá un TypeScript SDK para la Fluxis Payment API.
Leé la OpenAPI spec en ./openapi.yaml.

Requisitos:
- Axios para HTTP, con retry automático
- Typed responses para todos los endpoints
- Webhook signature verification (HMAC-SHA256)
- NASPIP token helpers (parse, validate, isExpired)
- Export CommonJS y ESM
- JSDoc completo en todo
- README.md que sea AI-friendly (un agente debe poder integrarlo one-shot)
- CLAUDE.md con instrucciones para agentes
```

### Para generar el React SDK

```
Creá un React SDK para Fluxis payments.

Componentes:
- FluxisProvider (context con publishable key)
- FluxisQR (renderiza NASPIP token como QR con qrcode.react)
- usePaymentStatus hook (polling /payments/:id con intervalo configurable)
- FluxisCheckout (flujo completo de checkout)

Colores Fluxis: green #00d086, purple #837ff9, dark #19323a
Background dark: #0a1414
Tipografía: Caveat para display, sistema para body

TypeScript types exportados. ESM only.
```

---

## 9. Métricas de éxito

| Métrica | Target | Cómo se compara con Talo |
|---|---|---|
| Tiempo first payment (SDK) | < 2 horas | ≈ igual |
| Líneas de código para integrar | < 20 LOC | Mejor (NASPIP simplifica) |
| AI one-shot integration rate | > 90% | Superar (más capas de AI docs) |
| SDKs disponibles | 5+ lenguajes | Superar (Talo: solo Node) |
| Frontend components | 4+ componentes | Superar (Talo: 0 visibles) |
| Docs AI score (llms.txt) | Completo | Superar (Talo: solo README) |
| Time to first QR render | < 15 min | N/A para Talo |

---

## 10. Conclusión: La narrativa diferenciadora

**Talo dice:** "Recibir transferencias ahora es APB. `npm install talo-pay`"

**Fluxis dice:** "Aceptá crypto en tu app con `npm install @fluxis/sdk`. O pedile a tu AI que lea nuestro llms.txt y lo haga por vos. QR, NFC, o API — vos elegís el canal."

Los tres ejes de diferenciación:

1. **Protocolo abierto (NASPIP):** Talo tiene una API propietaria. Fluxis tiene un protocolo estándar y portable que cualquier wallet puede implementar. Esto es infraestructura, no solo un servicio.

2. **Multi-canal:** Talo es transferencias bancarias + crypto. Fluxis es QR + NFC + API + embedded swap. El merchant elige cómo cobrar.

3. **AI-first docs de verdad:** Talo menciona Context7 y README. Fluxis tiene 5 capas de AI-readiness (llms.txt, llms-full.txt, CLAUDE.md, OpenAPI spec, Context7). La integración no solo es "one-shot" — es verificablemente one-shot.

**El resultado final:** Un developer llega a docs.fluxis.us, le pasa el `llms-full.txt` a Claude Code, y en 15 minutos tiene pagos crypto funcionando con QR code en su app. Eso es el estándar que queremos establecer.
