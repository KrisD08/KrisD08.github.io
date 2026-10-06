
import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";

const destino = process.argv[2] ?? "_site";

const PUBLICO = ["index.html", "libro-de-visitas.js", "estilos.css", "favicon.ico", "img", "imagenes", "assets"];

rmSync(destino, { recursive: true, force: true });
mkdirSync(destino, { recursive: true });

for (const ruta of PUBLICO) {
  if (!existsSync(ruta)) continue; 
  cpSync(ruta, join(destino, ruta), { recursive: true });
  console.log(`  + ${ruta}`);
}

if (!existsSync(join(destino, "index.html"))) {
  console.error("Falta index.html: no hay sitio que publicar.");
  process.exit(1);
}
console.log(`Sitio armado en ${destino}/`);
