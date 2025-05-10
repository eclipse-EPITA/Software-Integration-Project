import mongoose, { Document, Schema, model, Types } from 'mongoose'

export interface IMessage extends Document {
  name?: string
  user?: Types.ObjectId
  created_at?: Date
  updated_at?: Date
}

const messageSchema = new Schema<IMessage>(
  {
    name: {
      type: String,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: {
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
  }
)

const Message = model<IMessage>('Message', messageSchema)

export default Message
