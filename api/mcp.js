import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";
import fetch from "node-fetch";

const EFEKTIVA_BASE = "https://efektiva.mx/version-live/api/1.1/wf";

export default async function handler(req, res) {
  if (req.method === "GET") {
    res.status(200).json({ status: "ok", name: "efektiva-mcp", version: "1.0.0" });
    return;
  }

  const server = new McpServer({ name: "efektiva", version: "1.0.0" });

  server.tool(
    "lista_analisis",
    "Lista todas las empresas analizadas del usuario en Efektiva",
    { api_key: z.string().describe("API Key del usuario de Efektiva (desde su perfil)") },
    async ({ api_key }) => {
      const token = api_key.startsWith("Bearer ") ? api_key : `Bearer ${api_key}`;
      const r = await fetch(`${EFEKTIVA_BASE}/lista-analisis`, {
        headers: { Authorization: token, "Content-Type": "application/json" },
      });
      const data = await r.json();
      if (data.status !== "success") return { content: [{ type: "text", text: "Error: " + JSON.stringify(data) }] };
      const analisis = data.response.analisis_files;
      if (!analisis || analisis.length === 0) return { content: [{ type: "text", text: "No se encontraron análisis." }] };
      const lista = analisis.map((a) => {
        const partes = a.split(" - ");
        return `ID: ${partes[0]} | Empresa: ${partes.slice(1).join(" - ")}`;
      }).join("\n");
      return { content: [{ type: "text", text: `Análisis encontrados:\n\n${lista}` }] };
    }
  );

  server.tool(
    "obtener_url_reporte",
    "Obtiene la URL del PDF del reporte de riesgo de una empresa",
    {
      api_key: z.string().describe("API Key del usuario de Efektiva"),
      analisis_id: z.string().describe("ID del análisis"),
    },
    async ({ api_key, analisis_id }) => {
      const token = api_key.startsWith("Bearer ") ? api_key : `Bearer ${api_key}`;
      const r = await fetch(`${EFEKTIVA_BASE}/analisis-file?id=${analisis_id}`, {
        headers: { Authorization: token, "Content-Type": "application/json" },
      });
      const data = await r.json();
      if (data.status !== "success") return { content: [{ type: "text", text: "Error: " + JSON.stringify(data) }] };
      return { content: [{ type: "text", text: `URL del reporte: ${data.response.file}` }] };
    }
  );

  server.tool(
    "obtener_reporte",
    "Descarga y extrae el contenido completo del reporte de riesgo",
    {
      api_key: z.string().describe("API Key del usuario de Efektiva"),
      analisis_id: z.string().describe("ID del análisis"),
    },
    async ({ api_key, analisis_id }) => {
      const token = api_key.startsWith("Bearer ") ? api_key : `Bearer ${api_key}`;
      const r = await fetch(`${EFEKTIVA_BASE}/analisis-file?id=${analisis_id}`, {
        headers: { Authorization: token, "Content-Type": "application/json" },
      });
      const data = await r.json();
      if (data.status !== "success") return { content: [{ type: "text", text: "Error: " + JSON.stringify(data) }] };
      const pdfUrl = data.response.file;
      const pdfRes = await fetch(pdfUrl);
      if (!pdfRes.ok) return { content: [{ type: "text", text: `Error al descargar PDF: ${pdfRes.status}` }] };
      const pdfBuffer = await pdfRes.arrayBuffer();
      const pdfBase64 = Buffer.from(pdfBuffer).toString("base64");
      return {
        content: [
          { type: "text", text: `PDF descargado. URL: ${pdfUrl}` },
          { type: "resource", resource: { uri: pdfUrl, mimeType: "application/pdf", blob: pdfBase64 } },
        ],
      };
    }
  );

  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  await server.connect(transport);
  await transport.handleRequest(req, res);
}
