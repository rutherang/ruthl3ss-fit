export type Sex = 'male' | 'female';

export type Profile = {
  id: string;
  name: string;
  sex: Sex;
  birthDate: string;
  heightCm: number;
  createdAt: string;
  photoFileId?: string;
};
