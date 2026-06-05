# Efektiva MCP Server

Servidor MCP que permite a cualquier cliente de Efektiva conectar Claude directamente a sus análisis de riesgo.

## Herramientas disponibles

- **lista_analisis** — Lista todas las empresas analizadas del usuario
- **obtener_url_reporte** — Obtiene la URL del PDF de un análisis
- **obtener_reporte** — Descarga y extrae el contenido completo del reporte

## Deploy en Vercel

### Paso 1: Subir a GitHub
1. Crea un repositorio nuevo en GitHub llamado `efektiva-mcp`
2. Sube estos archivos: `index.js`, `package.json`

### Paso 2: Deploy en Vercel
1. Ve a [vercel.com](https://vercel.com) y crea una cuenta con tu GitHub
2. Click en **"Add New Project"**
3. Selecciona el repositorio `efektiva-mcp`
4. Click en **Deploy**
5. Vercel te dará una URL como: `https://efektiva-mcp.vercel.app`

### Paso 3: Conectar en Claude
1. Ve a Claude.ai → Settings → Integrations
2. Click en **"Add MCP Server"**
3. Pega la URL de tu servidor: `https://efektiva-mcp.vercel.app`
4. Listo — cada usuario usa su propio API Key de Efektiva al hacer preguntas

## Uso

Cada cliente de Efektiva:
1. Obtiene su API Key desde su perfil en Efektiva
2. Le dice a Claude: *"Lista mis análisis, mi API key es bus|..."*
3. Claude consulta Efektiva directamente y responde

## Desarrollo local

```bash
npm install
npm start
```
