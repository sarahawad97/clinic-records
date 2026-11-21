export const APPOINTMENT_DURATIONS = [15, 30, 45, 60, 90] as const;

export type AppointmentDuration = (typeof APPOINTMENT_DURATIONS)[number];

export function isAppointmentDuration(value: number): value is AppointmentDuration {
  return APPOINTMENT_DURATIONS.some((item) => item === value);
}
