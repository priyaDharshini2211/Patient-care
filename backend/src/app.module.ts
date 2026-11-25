import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { BillsModule } from './bills/bills.module';
import { AllExceptionsFilter } from './common/all-exceptions.filter';
import { ApiResponseInterceptor } from './common/api-response.interceptor';
import { DashboardModule } from './dashboard/dashboard.module';
import { PatientsModule } from './patients/patients.module';
import { PaymentsModule } from './payments/payments.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // Global ceiling per IP; credential and payment-order endpoints tighten it with @Throttle().
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 200 }]),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const common = {
          type: 'postgres' as const,
          autoLoadEntities: true,
          synchronize: config.get<string>('DB_SYNC', 'false') === 'true',
        };
        // A single DATABASE_URL (e.g. Neon / hosted Postgres) takes precedence over discrete DB_* values.
        const databaseUrl = config.get<string>('DATABASE_URL');
        if (databaseUrl) {
          return {
            ...common,
            url: databaseUrl,
          };
        }
        return {
          ...common,
          host: config.get<string>('DB_HOST', 'localhost'),
          port: config.get<number>('DB_PORT', 5432),
          username: config.get<string>('DB_USERNAME', 'postgres'),
          password: config.get<string>('DB_PASSWORD', 'postgres'),
          database: config.get<string>('DB_NAME', 'patient_management'),
        };
      },
    }),
    UsersModule,
    AuthModule,
    PatientsModule,
    BillsModule,
    PaymentsModule,
    DashboardModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_INTERCEPTOR, useClass: ApiResponseInterceptor },
  ],
})
export class AppModule {}
