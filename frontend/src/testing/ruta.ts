import { ActivatedRoute, convertToParamMap, Data } from '@angular/router';

export const proveerRutaConId = (id: string, data: Data = {}) => ({
  provide: ActivatedRoute,
  useValue: { snapshot: { paramMap: convertToParamMap({ id }), data } },
});
