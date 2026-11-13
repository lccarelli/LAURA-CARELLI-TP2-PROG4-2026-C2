export interface ConfiguracionFalsa {
  type: string;
  options: {
    indexAxis?: string;
    interaction?: { mode: string; intersect: boolean };
    plugins?: {
      tooltip?: {
        callbacks: { title: (elementos: { dataIndex: number; label: string }[]) => string };
      };
    };
  };
  data: {
    labels: string[];
    datasets: {
      label: string;
      data: number[];
      backgroundColor: string;
      borderColor?: string;
    }[];
  };
}

export const graficos: { config: ConfiguracionFalsa; destroy: ReturnType<typeof vi.fn> }[] = [];

class ChartFalso {
  static readonly register = vi.fn();
  destroy = vi.fn();
  config: ConfiguracionFalsa;

  constructor(_lienzo: HTMLCanvasElement, config: ConfiguracionFalsa) {
    this.config = config;
    graficos.push(this);
  }
}

export const moduloFalso = {
  Chart: ChartFalso,
  BarController: {},
  LineController: {},
  LineElement: {},
  PointElement: {},
  BarElement: {},
  CategoryScale: {},
  LinearScale: {},
  Tooltip: {},
};
