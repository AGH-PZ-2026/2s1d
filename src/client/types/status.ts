export type StatusType = 'system' | 'custom';

export interface Status {
  id: number;
  name: string;
  slug: string | null;
  type: StatusType;
  description?: string;
}

export interface CreateStatusPayload {
  name: string;
  description?: string;
}

export interface UpdateStatusPayload {
  name: string;
  description?: string;
}
