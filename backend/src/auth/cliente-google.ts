import { Inject, Injectable } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';
import { authConfig } from './auth.config.js';

export interface PerfilGoogle {
  id: string;
  correo: string;
  correoVerificado: boolean;
  nombre?: string;
  apellido?: string;
  foto?: string;
}

export const HOST_DE_FOTOS_DE_GOOGLE = 'lh3.googleusercontent.com';
const TAMANO_MAXIMO_FOTO = 2 * 1024 * 1024;
const ESPERA_MAXIMA_FOTO_MS = 4000;

@Injectable()
export class ClienteGoogle {
  private readonly cliente = new OAuth2Client();

  constructor(
    @Inject(authConfig.KEY)
    private readonly config: ConfigType<typeof authConfig>,
  ) {}

  get habilitado() {
    return Boolean(this.config.googleClientId);
  }

  async verificar(credencial: string): Promise<PerfilGoogle | null> {
    try {
      const ticket = await this.cliente.verifyIdToken({
        idToken: credencial,
        audience: this.config.googleClientId,
      });
      const datos = ticket.getPayload();
      if (!datos?.sub || !datos.email) {
        return null;
      }
      return {
        id: datos.sub,
        correo: datos.email.toLowerCase(),
        correoVerificado: datos.email_verified === true,
        nombre: datos.given_name ?? datos.name,
        apellido: datos.family_name,
        foto: datos.picture,
      };
    } catch {
      return null;
    }
  }

  async descargarFoto(url?: string): Promise<Express.Multer.File | null> {
    if (!url || !this.esUrlDeGoogle(url)) {
      return null;
    }
    try {
      const respuesta = await fetch(url, {
        signal: AbortSignal.timeout(ESPERA_MAXIMA_FOTO_MS),
      });
      const tipo = respuesta.headers.get('content-type') ?? '';
      if (!respuesta.ok || !tipo.startsWith('image/')) {
        return null;
      }
      const contenido = Buffer.from(await respuesta.arrayBuffer());
      if (contenido.length === 0 || contenido.length > TAMANO_MAXIMO_FOTO) {
        return null;
      }
      return {
        fieldname: 'imagen',
        originalname: 'google.jpg',
        encoding: '7bit',
        mimetype: tipo.split(';')[0],
        size: contenido.length,
        buffer: contenido,
      } as Express.Multer.File;
    } catch {
      return null;
    }
  }

  private esUrlDeGoogle(url: string) {
    try {
      const { protocol, hostname } = new URL(url);
      return protocol === 'https:' && hostname === HOST_DE_FOTOS_DE_GOOGLE;
    } catch {
      return false;
    }
  }
}
