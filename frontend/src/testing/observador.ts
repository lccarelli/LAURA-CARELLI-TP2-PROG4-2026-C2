interface Entrada {
  isIntersecting: boolean;
}

export function simularObservador() {
  const activos = new Set<FalsoObservador>();

  class FalsoObservador {
    constructor(private avisar: (entradas: Entrada[]) => void) {
      activos.add(this);
    }
    observe = vi.fn();
    disconnect = () => activos.delete(this);
    notificar(isIntersecting: boolean) {
      this.avisar([{ isIntersecting }]);
    }
  }

  vi.stubGlobal('IntersectionObserver', FalsoObservador);

  return {
    activos: () => [...activos],
    aparecer: () => [...activos].forEach((observador) => observador.notificar(true)),
    desaparecer: () => [...activos].forEach((observador) => observador.notificar(false)),
  };
}
