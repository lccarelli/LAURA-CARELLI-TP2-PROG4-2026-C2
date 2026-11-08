import { TestBed } from '@angular/core/testing';
import { MosaicoComidas } from './mosaico-comidas';

describe('MosaicoComidas', () => {
  async function crear() {
    await TestBed.configureTestingModule({ imports: [MosaicoComidas] }).compileComponents();
    const fixture = TestBed.createComponent(MosaicoComidas);
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  it('[O] muestra las seis fotos de comidas', async () => {
    const mosaico = await crear();

    expect(mosaico.querySelectorAll('img')).toHaveLength(6);
  });

  it('[I] es decorativo: está oculto para lectores de pantalla y las fotos no tienen texto alternativo', async () => {
    const mosaico = await crear();

    expect(mosaico.querySelector('.mosaico')!.getAttribute('aria-hidden')).toBe('true');
    mosaico.querySelectorAll('img').forEach((foto) => expect(foto.getAttribute('alt')).toBe(''));
  });

  it('[O] las fotos apuntan a archivos de la carpeta comidas', async () => {
    const mosaico = await crear();

    mosaico.querySelectorAll('img').forEach((foto) => {
      expect(foto.getAttribute('src')).toMatch(/^comidas\/[a-z-]+\.jpg$/);
    });
  });
});
