import { ActivatedRoute, convertToParamMap } from '@angular/router';

export const proveerRutaConId = (id: string) => ({
  provide: ActivatedRoute,
  useValue: { snapshot: { paramMap: convertToParamMap({ id }) } },
});
