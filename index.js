import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";
import http from "http";
import fetch from "node-fetch";

const EFEKTIVA_BASE = "https://efektiva.mx/version-live/api/1.1/wf";

// Crear servidor MCP
const server = new McpServer({
  name: "efektiva",
  version: "1.0.0",
});

// Herramienta 1: Listar análisis
server.tool(
  "lista_analisis",
  "Lista todas las empresas analizadas del usuario en Efektiva",
  {
    api_key: z.string().describe("API Key del usuario de Efektiva (desde su perfil)"),
  },
  async ({ api_key }) => {
    const token = api_key.startsWith("Bearer ") ? api_key : `Bearer ${api_key}`;
    const res = await fetch(`${EFEKTIVA_BASE}/lista-analisis`, {
      headers: {
        Authorization: token,
        "Content-Type": "application/json",
      },
    });
    const data = await res.json();
    if (data.status !== "success") {
      return { content: [{ type: "text", text: "Error al obtener análisis: " + JSON.stringify(data) }] };
    }
    const analisis = data.response.analisis_files;
    if (!analisis || analisis.length === 0) {
      return { content: [{ type: "text", text: "No se encontraron análisis para este usuario." }] };
    }
    const lista = analisis.map((a) => {
      const partes = a.split(" - ");
      const id = partes[0];
      const resto = partes.slice(1).join(" - ");
      return `ID: ${id} | Empresa: ${resto}`;
    }).join("\n");
    return { content: [{ type: "text", text: `Análisis encontrados:\n\n${lista}` }] };
  }
);

// Herramienta 2: Obtener URL del PDF
server.tool(
  "obtener_url_reporte",
  "Obtiene la URL del PDF del reporte de riesgo de una empresa",
  {
    api_key: z.string().describe("API Key del usuario de Efektiva"),
    analisis_id: z.string().describe("ID del análisis (obtenido de lista_analisis)"),
  },
  async ({ api_key, analisis_id }) => {
    const token = api_key.startsWith("Bearer ") ? api_key : `Bearer ${api_key}`;
    const res = await fetch(`${EFEKTIVA_BASE}/analisis-file?id=${analisis_id}`, {
      headers: {
        Authorization: token,
        "Content-Type": "application/json",
      },
    });
    const data = await res.json();
    if (data.status !== "success") {
      return { content: [{ type: "text", text: "Error al obtener reporte: " + JSON.stringify(data) }] };
    }
    const url = data.response.file;
    return { content: [{ type: "text", text: `URL del reporte: ${url}` }] };
  }
);

// Herramienta 3: Obtener y extraer texto del reporte
server.tool(
  "obtener_reporte",
  "Descarga y extrae el contenido completo del reporte de riesgo de una empresa en Efektiva",
  {
    api_key: z.string().describe("API Key del usuario de Efektiva"),
    analisis_id: z.string().describe("ID del análisis (obtenido de lista_analisis)"),
  },
  async ({ api_key, analisis_id }) => {
    const token = api_key.startsWith("Bearer ") ? api_key : `Bearer ${api_key}`;

    // Paso 1: Obtener URL del PDF
    const res = await fetch(`${EFEKTIVA_BASE}/analisis-file?id=${analisis_id}`, {
      headers: {
        Authorization: token,
        "Content-Type": "application/json",
      },
    });
    const data = await res.json();
    if (data.status !== "success") {
      return { content: [{ type: "text", text: "Error al obtener reporte: " + JSON.stringify(data) }] };
    }
    const pdfUrl = data.response.file;

    // Paso 2: Descargar PDF
    const pdfRes = await fetch(pdfUrl);
    if (!pdfRes.ok) {
      return { content: [{ type: "text", text: `Error al descargar PDF: ${pdfRes.status}` }] };
    }
    const pdfBuffer = await pdfRes.arrayBuffer();
    const pdfBase64 = Buffer.from(pdfBuffer).toString("base64");

    return {
      content: [
        {
          type: "text",
          text: `PDF descargado correctamente. URL: ${pdfUrl}`,
        },
        {
          type: "resource",
          resource: {
            uri: pdfUrl,
            mimeType: "application/pdf",
            blob: pdfBase64,
          },
        },
      ],
    };
  }
);

// Servidor HTTP para Vercel / hosting
const transport = new StreamableHTTPServerTransport({
  sessionIdGenerator: undefined,
});

const httpServer = http.createServer(async (req, res) => {
  if (req.method === "GET" && req.url === "/") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", name: "efektiva-mcp", version: "1.0.0" }));
    return;
  }
  await transport.handleRequest(req, res);
});

await server.connect(transport);

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`Servidor MCP de Efektiva corriendo en puerto ${PORT}`);
});
