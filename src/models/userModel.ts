import mongoose, { Document, Schema, model } from 'mongoose'

// Define an interface for the user document
export interface IUser extends Document {
  username?: string
  email: string
  password: string
  messages: mongoose.Types.ObjectId[]
  created_at?: Date
  updated_at?: Date
}

// Create the schema
const userSchema = new Schema<IUser>(
  {
    username: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true,
      required: true,
    },
    password: {
      type: String,
      trim: true,
      required: true,
    },
    messages: [Schema.Types.ObjectId],
  },
  {
    timestamps: {
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
  }
)

export default model<IUser>('User', userSchema)
