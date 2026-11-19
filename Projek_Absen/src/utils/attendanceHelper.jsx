import { lecturers, schedules } from "../data/attendanceData1";

export function getAttendanceInfo(lecturerId) {
  const lecturer = lecturers.find(
    (item) => item.id === lecturerId
  );

  if (!lecturer) return null;

  // Untuk sementara, ambil jadwal dummy pertama
  // milik dosen yang dikenali.
  const schedule = schedules.find(
    (item) => item.lecturerId === lecturerId
  );

  if (!schedule) return null;

  return {
    ...lecturer,
    ...schedule,
  };
}
