import { AuditLog } from '../models/AuditLog';

export const createAuditLog = async (params: {
  user: string;
  action: string;
  entity: string;
  entityId: string;
  previousValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
}): Promise<void> => {
  await AuditLog.create({
    ...params,
    timestamp: new Date(),
  });
};
