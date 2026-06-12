// Funcion serverless (Vercel) que recibe la imagen + datos del formulario
// desde el frontend, y llama a la API de Anthropic usando la API key
// guardada de forma segura como variable de entorno (ANTHROPIC_API_KEY).
// La key NUNCA se expone al navegador.

const PRODUCT_REFERENCE = {
  arroz: `MARCA A EVALUAR: Arroz PONY (cliente).
Identificacion visual de Arroz PONY: logo "Pony" en letras blancas grandes con contorno curvo rojo, mascota de un canguro, fondo con cielo/campo. Variantes por color de fondo del empaque:
- Glaseado Superior (Tipo 2): fondo ROJO
- Glaseado (Tipo 1): fondo AMARILLO
- Economico (Tipo 3): fondo AZUL
- Glaseado Especial (Tipo 3): fondo VERDE
- Parbolizado (Tipo 1): fondo NEGRO/GRIS OSCURO
Formatos: 5kg, 1kg, 500g, 250g.

COMPETENCIA: cualquier otra marca de arroz visible en la gondola. Agrupalas como "Competencia" en conjunto, pero si reconoces marcas conocidas paraguayas (ej. Cuyaya, Tia Maria, La Loma, Don Pepe, etc.) nombralas si las identificas con certeza.`,

  aceite: `MARCAS A EVALUAR: Aceite ALGISA y Aceite Don Roberto (ambos del cliente, mismo grupo empresarial, evaluar en conjunto como "ALGISA/Don Roberto").
Identificacion visual de Aceite ALGISA: botella plastica transparente con aceite amarillo, etiqueta con franja roja y verde (estilo bandera), logo "ALGISA" en letras rojas con triangulos rojo/gris arriba. Formatos: 500ml, 900ml/1L, 2L con asa, 5L bidon con asa.
Identificacion visual de Aceite Don Roberto: botella plastica transparente con aceite amarillo, etiqueta verde y dorada, ovalo blanco/crema central con logo "Don Roberto" en letra cursiva marron, imagen de tomates y ajo, texto "Aceite de Soja". Formatos: 500ml, 750ml, 900ml, 1.5L, 2L, 3L, 4L, 4.5L, 5L con asa.

COMPETENCIA: cualquier otra marca de aceite visible en la gondola que no sea ALGISA ni Don Roberto. Agrupalas como "Competencia" en conjunto, nombrando marcas conocidas si las identificas con certeza.`
};

const SYSTEM_PROMPT = `Eres un auditor experto de trade marketing / merchandising para el mercado paraguayo de consumo masivo (arroz y aceites). Tu tarea es analizar una foto de gondola de supermercado y evaluar la exhibicion de los productos del cliente frente a la competencia.

Responde UNICAMENTE con un objeto JSON valido, sin texto adicional, sin markdown, sin backticks. Estructura exacta:

{
  "presencia": {
    "marca_cliente_presente": true|false,
    "variantes_detectadas": ["lista de variantes/formatos del cliente identificados"],
    "comentario": "breve nota sobre que se identifico y con que nivel de certeza"
  },
  "share_espacio": {
    "cliente_pct": numero entero 0-100,
    "competencia_pct": numero entero 0-100,
    "marcas_competencia": ["nombres si se identifican, o Competencia general"]
  },
  "checklist": [
    {"criterio": "Posicion vertical (altura)", "estado": "ok|warn|bad", "detalle": "..."},
    {"criterio": "Agrupacion / bloque de marca", "estado": "ok|warn|bad", "detalle": "..."},
    {"criterio": "Material POP / promocional", "estado": "ok|warn|bad", "detalle": "..."},
    {"criterio": "Precio visible y legible", "estado": "ok|warn|bad", "detalle": "..."},
    {"criterio": "Orden y limpieza del lineal", "estado": "ok|warn|bad", "detalle": "..."}
  ],
  "score_general": numero entero 0-100,
  "resumen": "2-4 frases resumiendo la situacion general y dando 1-2 recomendaciones de accion concretas."
}

Criterios para estado: ok = cumple correctamente. warn = cumple parcialmente o problema menor. bad = no cumple, problema significativo.
Si no se puede evaluar un criterio por falta de informacion visual, usa "warn" y explica que no es visible en la imagen, no asumas que esta mal.
Se especifico y basa cada observacion en lo que realmente se ve. No inventes datos. El score_general debe reflejar el promedio ponderado de presencia, share de espacio y estado del checklist.`;

module.exports = async (req, res) => {
  // CORS basico - permite llamadas desde cualquier origen donde alojes el HTML
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Metodo no permitido' });
  }

  try {
    const { imageBase64, imageMediaType, categoria, pdv, ciudad } = req.body;

    if (!imageBase64 || !categoria || !PRODUCT_REFERENCE[categoria]) {
      return res.status(400).json({ error: 'Faltan datos: imagen y/o categoria validos' });
    }

    let contextLine = '';
    if (pdv || ciudad) {
      contextLine = `\n\nContexto del punto de venta: ${pdv || '(no especificado)'} ${ciudad ? '- ' + ciudad : ''}.`;
    }

    const userPrompt = `${PRODUCT_REFERENCE[categoria]}${contextLine}

Analiza la foto de gondola adjunta segun las instrucciones del sistema y devuelve el JSON correspondiente.`;

    const apiResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1000,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: imageMediaType || 'image/jpeg',
                  data: imageBase64
                }
              },
              { type: 'text', text: userPrompt }
            ]
          }
        ]
      })
    });

    if (!apiResponse.ok) {
      const errText = await apiResponse.text();
      return res.status(apiResponse.status).json({ error: 'Error de la API de Anthropic', detail: errText });
    }

    const data = await apiResponse.json();

    const textBlocks = (data.content || [])
      .filter(item => item.type === 'text')
      .map(item => item.text)
      .join('\n');

    const cleaned = textBlocks.replace(/```json|```/g, '').trim();

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch (e) {
      return res.status(500).json({ error: 'La IA no devolvio un JSON valido', raw: cleaned });
    }

    return res.status(200).json(parsed);

  } catch (err) {
    return res.status(500).json({ error: 'Error interno', detail: err.message });
  }
};
