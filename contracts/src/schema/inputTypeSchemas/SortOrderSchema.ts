import { z } from 'zod';

export const SortOrderSchema = z.enum(['asc','desc']);

export default SortOrderSchema;
