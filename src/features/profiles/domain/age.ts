export function ageFromBirthDate(iso: string, now = new Date()): number {
  const birthDate = new Date(iso);
  let age = now.getFullYear() - birthDate.getFullYear();
  const birthdayNotReached =
    now.getMonth() < birthDate.getMonth() ||
    (now.getMonth() === birthDate.getMonth() && now.getDate() < birthDate.getDate());
  return birthdayNotReached ? age - 1 : age;
}
