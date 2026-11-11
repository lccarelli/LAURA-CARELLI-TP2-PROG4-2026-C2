export function capturarLogs() {
  const lineas: Record<string, unknown>[] = [];
  vi.spyOn(process.stdout, 'write').mockImplementation((texto) => {
    for (const linea of String(texto).split('\n')) {
      if (linea.startsWith('{')) {
        lineas.push(JSON.parse(linea) as Record<string, unknown>);
      }
    }
    return true;
  });
  return lineas;
}
