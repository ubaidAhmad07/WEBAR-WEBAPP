export type AdminModelStatus = "none" | "compressing" | "ready" | "error";

export type AdminItem = {
  id: number;
  name: string;
  priceCents: number;
  tags: string[];
  coverPhotoUrl: string | null;
  modelStatus: AdminModelStatus;
};

export type AdminCategory = {
  id: number;
  name: string;
  items: AdminItem[];
};
