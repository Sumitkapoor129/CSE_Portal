import { Model, Document } from 'mongoose';

export const paginate = async <T extends Document>(
  model: Model<T>,
  filter: Record<string, unknown>,
  page: number = 1,
  limit: number = 20,
  sort: Record<string, 1 | -1> = { createdAt: -1 },
  populate?: string[]
): Promise<{ data: T[]; total: number; page: number; totalPages: number }> => {
  const skip = (page - 1) * limit;
  const total = await model.countDocuments(filter);

  let query = model.find(filter).sort(sort).skip(skip).limit(limit);
  if (populate) {
    for (const field of populate) {
      query = query.populate(field);
    }
  }

  const data = await query.exec();

  return {
    data,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
};
