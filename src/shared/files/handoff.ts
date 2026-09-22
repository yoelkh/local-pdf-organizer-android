/**
 * Titipan file antar alat: sebuah alat menaruh path hasilnya, lalu berpindah
 * route; alat tujuan mengambil titipan itu saat dibuka (lewat `useFileIntake`).
 * Disimpan di memori saja; hilang saat aplikasi ditutup.
 */
let pending: string[] = [];

export function setHandoff(paths: string[]): void {
  pending = [...paths];
}

/** Ambil dan kosongkan titipan. */
export function takeHandoff(): string[] {
  const out = pending;
  pending = [];
  return out;
}
