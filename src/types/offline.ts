export interface ActivityFormData {
  studentName: string;
  activity: string;
  date: string;
  hours: number;
}

export interface Activity {
  id?: number;
  studentName: string;
  activity: string;
  date: string;
  hours: number;
  createdAt: Date;
  synced?: boolean;
}

export interface SyncMessage {
  type: 'SYNC_COMPLETED';
  payload: {
    successful: number;
    failed: number;
    total: number;
    timestamp: string;
  };
}