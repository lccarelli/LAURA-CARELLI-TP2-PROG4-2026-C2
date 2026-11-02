import { appendFileSync, readFileSync } from 'node:fs';

const filas = process.argv.slice(2).map((argumento) => {
  const [nombre, ruta] = argumento.split('=');
  const { total } = JSON.parse(readFileSync(ruta, 'utf8'));
  const porcentaje = (medida) => `${total[medida].pct}%`;
  return `| ${nombre} | ${porcentaje('statements')} | ${porcentaje('branches')} | ${porcentaje('functions')} | ${porcentaje('lines')} |`;
});

const tabla = [
  '| Pruebas | Sentencias | Ramas | Funciones | Líneas |',
  '| --- | --- | --- | --- | --- |',
  ...filas,
].join('\n');

appendFileSync(process.env.GITHUB_STEP_SUMMARY, `## Cobertura\n\n${tabla}\n`);
