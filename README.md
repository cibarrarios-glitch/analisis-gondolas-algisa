# Análisis de Góndolas — ALGISA / JOMEWILI

App web que analiza fotos de góndolas (Arroz Pony, Aceite Algisa, Aceite Don Roberto) usando IA, y muestra share de espacio, checklist de exhibición y recomendaciones.

## Estructura del proyecto

```
gondola-vercel/
├── index.html          → la app (frontend)
├── api/
│   └── analizar.js      → backend (oculta tu API key, llama a Anthropic)
├── package.json
├── .gitignore
└── .env.example
```

La clave de seguridad: tu API key NUNCA está en el HTML. Vive solo en el servidor (`api/analizar.js`), leída desde una variable de entorno.

---

## Paso 1 — Crear cuenta en GitHub (si no tenés)

1. Entrá a https://github.com y creá una cuenta gratuita.

## Paso 2 — Subir este proyecto a GitHub

Opción simple desde la web (sin usar terminal):

1. En GitHub, creá un repositorio nuevo (botón verde "New").
   - Nombre sugerido: `analisis-gondolas-algisa`
   - Dejalo público o privado (ambos funcionan con Vercel)
2. Una vez creado, hacé clic en "uploading an existing file" (subir archivos existentes).
3. Arrastrá TODOS los archivos de la carpeta `gondola-vercel/` (incluyendo la subcarpeta `api/` con `analizar.js`) — NO subas el archivo `.env.example` con tu key real si llegás a crear un `.env`, ese nunca se sube.
4. Confirmá el commit ("Commit changes").

## Paso 3 — Crear cuenta en Vercel y conectar el repo

1. Entrá a https://vercel.com y creá una cuenta gratuita (podés usar "Continuar con GitHub" para conectarlo directo).
2. Click en "Add New..." → "Project".
3. Elegí el repositorio `analisis-gondolas-algisa` que subiste.
4. Vercel detecta automáticamente que es un proyecto estático + funciones serverless (por la carpeta `api/`). No necesitás cambiar nada en "Build settings".

## Paso 4 — Configurar tu API key (variable de entorno)

ANTES de hacer el primer deploy (o después, y volvés a deployar):

1. En la pantalla de configuración del proyecto en Vercel, buscá la sección "Environment Variables".
2. Agregá:
   - **Name**: `ANTHROPIC_API_KEY`
   - **Value**: tu API key real (la que empieza con `sk-ant-...`, la conseguís en https://console.anthropic.com/settings/keys)
3. Guardá.

Si ya habías hecho el deploy antes de agregar la variable: andá a "Settings" → "Environment Variables" del proyecto, agregala, y luego "Deployments" → tres puntos → "Redeploy".

## Paso 5 — Deploy

1. Click en "Deploy".
2. Esperá 1-2 minutos.
3. Vercel te da un link público, tipo: `https://analisis-gondolas-algisa.vercel.app`

Ese link ya es funcional y se puede compartir con cualquier persona — cada quien abre el link desde su celular o PC, sube su foto y obtiene el análisis. La API key queda segura en el servidor de Vercel, nunca viaja al navegador del usuario.

---

## Actualizaciones futuras

Cualquier cambio que quieras hacer (ej. ajustar el checklist, agregar otra marca, cambiar colores):
1. Editás los archivos en GitHub directamente (botón de lápiz ✏️ en cada archivo) o los volvés a subir.
2. Vercel re-despliega automáticamente en 1-2 minutos. El link no cambia.

## Costos

- Vercel: el plan gratuito (Hobby) cubre tráfico moderado sin costo.
- Anthropic API: se cobra por uso (por imagen analizada + tokens de respuesta). Cada análisis de góndola es relativamente económico (una imagen + ~1000 tokens de salida). Podés monitorear el gasto en https://console.anthropic.com/settings/billing

## Seguridad de la API key

- Nunca compartas tu archivo `.env` ni pegues tu key directamente en `index.html` o en `analizar.js`.
- Si por error subiste tu key real a GitHub en algún momento, revocala inmediatamente en https://console.anthropic.com/settings/keys y generá una nueva.
