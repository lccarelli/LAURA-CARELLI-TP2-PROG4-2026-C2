import { TestBed } from '@angular/core/testing';
import { Imagenes } from './imagenes';

describe('Imagenes', () => {
  it('[O] una foto que ya entra vuelve igual', async () => {
    const foto = new File(['x'], 'foto.jpg', { type: 'image/jpeg' });

    expect(await TestBed.inject(Imagenes).preparar(foto)).toBe(foto);
  });

  it('[E] si el navegador no puede reducir una foto grande, vuelve la original', async () => {
    const grande = new File([new Uint8Array(3 * 1024 * 1024)], 'foto.jpg', { type: 'image/jpeg' });

    expect(await TestBed.inject(Imagenes).preparar(grande)).toBe(grande);
  });
});
