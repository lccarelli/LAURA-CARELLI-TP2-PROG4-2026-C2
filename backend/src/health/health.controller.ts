import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ETIQUETAS } from '../etiquetas-swagger.js';
import {
  HealthCheck,
  HealthCheckService,
  MemoryHealthIndicator,
  MongooseHealthIndicator,
} from '@nestjs/terminus';
import { SkipThrottle } from '@nestjs/throttler';
import { SIN_LIMITES } from '../configs/throttler.config.js';

export const LIMITE_MEMORIA_BYTES = 300 * 1024 * 1024;

@Controller('health')
@ApiTags(ETIQUETAS.estado.nombre)
@SkipThrottle(SIN_LIMITES)
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly mongo: MongooseHealthIndicator,
    private readonly memoria: MemoryHealthIndicator,
  ) {}

  @ApiOperation({
    summary: 'Estado del servicio: conexión a MongoDB y memoria',
  })
  @Get()
  @HealthCheck()
  verificar() {
    return this.health.check([
      () => this.mongo.pingCheck('mongo'),
      () => this.memoria.checkHeap('memoria', LIMITE_MEMORIA_BYTES),
    ]);
  }
}
