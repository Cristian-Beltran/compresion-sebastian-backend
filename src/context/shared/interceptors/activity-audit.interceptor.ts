import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { LogsService } from 'src/app/logs/logs.service';
import { PayloadToken } from '../models/token.model';

type RequestWithUser = {
  method?: string;
  baseUrl?: string;
  route?: { path?: string };
  path?: string;
  params?: Record<string, string>;
  body?: Record<string, unknown>;
  user?: PayloadToken;
};

const ignoredRoutes = ['/auth/login', '/admin/users/verify-password', '/logs'];

@Injectable()
export class ActivityAuditInterceptor implements NestInterceptor {
  constructor(private readonly logsService: LogsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') return next.handle();
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const method = String(request.method ?? '').toUpperCase();
    const route = this.routeOf(request);
    const user = request.user;

    if (
      !user?.sub ||
      !['POST', 'PUT', 'PATCH', 'DELETE'].includes(method) ||
      ignoredRoutes.some((ignored) => route.startsWith(ignored))
    ) {
      return next.handle();
    }

    return next.handle().pipe(
      tap(() => {
        const descriptor = this.describe(method, route);
        void this.logsService.create({
          level: 'info',
          source: descriptor.module,
          category: descriptor.module,
          eventType: descriptor.label,
          actorUserId: user.sub,
          actorRole: user.type,
          message: descriptor.label,
          metadata: {
            method,
            route,
            targetId: request.params?.id ?? request.params?.groupId,
            changedFields: this.safeChangedFields(request.body),
          },
        });
      }),
    );
  }

  private routeOf(request: RequestWithUser) {
    const base = request.baseUrl ?? '';
    const path = request.route?.path ?? request.path ?? '';
    return `${base}${path}`.replace(/\/+/g, '/') || '/';
  }

  private safeChangedFields(body?: Record<string, unknown>) {
    if (!body) return [];
    return Object.keys(body).filter(
      (key) => !/(password|token|secret|report|metadata)/i.test(key),
    );
  }

  private describe(method: string, route: string) {
    const module = route.startsWith('/admin/users')
      ? 'usuarios'
      : route.startsWith('/doctor/patients') || route.startsWith('/patients')
        ? 'pacientes'
        : route.startsWith('/doctors')
          ? 'medicos'
          : route.startsWith('/technicals')
            ? 'tecnicos'
            : route.startsWith('/family')
              ? 'familiares'
              : route.startsWith('/doctor/treatments') || route.startsWith('/treatments') || route.startsWith('/doctor/treatment-profile')
                ? 'terapias'
                : route.startsWith('/configurations')
                  ? 'configuracion'
                  : route.startsWith('/calibrations')
                    ? 'calibracion'
                    : route.startsWith('/device')
                      ? 'equipo'
                      : route.startsWith('/alerts')
                        ? 'alertas'
                        : route.startsWith('/sessions') || route.startsWith('/sesion')
                          ? 'sesiones'
                          : 'sistema';
    const action = route.includes('/password')
      ? 'password_changed'
      : route.includes('/status')
        ? 'status_changed'
        : route.includes('/maintenance/enter')
          ? 'maintenance_entered'
          : route.includes('/maintenance/exit')
            ? 'maintenance_exited'
            : route.includes('/emergency-stop')
              ? 'emergency_stop'
              : route.includes('/tare')
                ? 'calibration_zeroed'
                : route.includes('/reference')
                  ? 'calibration_referenced'
                  : route.includes('/reapply')
                    ? 'calibration_reapplied'
                    : route.includes('/start')
                      ? 'treatment_started'
                      : route.includes('/stop')
                        ? 'treatment_stopped'
                        : route.includes('/complete')
                          ? 'treatment_completed'
                          : method === 'POST'
                            ? 'created'
                            : method === 'PUT' || method === 'PATCH'
                              ? 'updated'
                              : 'deleted';
    const resource: Record<string, string> = {
      usuarios: 'usuario', pacientes: 'paciente', medicos: 'médico', tecnicos: 'técnico', familiares: 'familiar', terapias: 'terapia', configuracion: 'configuración', calibracion: 'calibración', equipo: 'equipo', alertas: 'alerta', sesiones: 'sesión', sistema: 'registro',
    };
    const labelByAction: Record<string, string> = {
      created: `Creó ${resource[module]}`, updated: `Editó ${resource[module]}`, deleted: `Eliminó ${resource[module]}`, status_changed: `Cambió el estado de ${resource[module]}`, password_changed: 'Cambió la contraseña de un usuario', maintenance_entered: 'Ingresó el equipo a mantenimiento', maintenance_exited: 'Sacó el equipo de mantenimiento', emergency_stop: 'Ejecutó parada de emergencia', calibration_zeroed: 'Realizó cero de calibración', calibration_referenced: 'Aplicó referencia de calibración', calibration_reapplied: 'Reaplicó calibración', treatment_started: 'Inició terapia', treatment_stopped: 'Detuvo terapia', treatment_completed: 'Completó terapia',
    };
    return { module, action, label: labelByAction[action] ?? `Editó ${resource[module]}` };
  }
}
