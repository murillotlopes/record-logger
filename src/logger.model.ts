import { Schema, model, Document } from 'mongoose';

interface ILog extends Document {
  level: 'INFO' | 'WARNING' | 'ERROR'
  method: string
  when: Date
  duration: number
  apiName: string
  urlRequest: string
  headers: Record<string, unknown>
  httpStatus: number
  stackTrace: Record<string, unknown>
}

const LogSchema = new Schema<ILog>({
  level: { type: String, required: false },
  method: { type: String, required: false },
  when: { type: Date, required: false },
  duration: { type: Number, required: false },
  apiName: { type: String, required: false },
  urlRequest: { type: String, required: false },
  headers: { type: Object, required: false },
  httpStatus: { type: Number, required: false },
  stackTrace: { type: String, require: false }
});

const Log = model<ILog>('api_logs', LogSchema);

export { Log, ILog };
