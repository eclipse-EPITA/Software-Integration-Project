// src/__tests__/models/messageModels.test.ts
import mongoose from 'mongoose';
import Message from '../../models/messageModel';

// Mock data
const validMessage = {
  name: 'Test Message',
  user: new mongoose.Types.ObjectId(), // Generate a mock user ID
};

describe('Message Model', () => {
  beforeAll(async () => {
    await mongoose.connect(process.env.MONGO_URI_TEST || 'mongodb://localhost:27017/testdb');
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  });

  afterEach(async () => {
    await Message.deleteMany({});
  });

  it('should create and save a message successfully', async () => {
    const message = new Message(validMessage);
    const savedMessage = await message.save();

    expect(savedMessage._id).toBeDefined();
    expect(savedMessage.name).toBe(validMessage.name);
    expect(savedMessage.user).toEqual(validMessage.user);
    expect(savedMessage.created_at).toBeDefined();
    expect(savedMessage.updated_at).toBeDefined();
  });

  it('should save message without optional name field', async () => {
    const messageWithoutName = {
      user: new mongoose.Types.ObjectId(),
    };
    const message = new Message(messageWithoutName);
    const savedMessage = await message.save();

    expect(savedMessage._id).toBeDefined();
    expect(savedMessage.name).toBeUndefined();
    expect(savedMessage.user).toEqual(messageWithoutName.user);
  });

  it('should fail when required user field is missing', async () => {
    const messageWithoutUser = {
      name: 'Invalid Message',
    };
    const message = new Message(messageWithoutUser);

    let error: mongoose.Error.ValidationError | null = null;
    try {
      await message.save();
    } catch (err) {
      error = err as mongoose.Error.ValidationError;
    }

    expect(error).toBeInstanceOf(mongoose.Error.ValidationError);
    expect(error?.errors.user).toBeDefined();
  });

  it('should automatically set timestamps', async () => {
    const message = new Message(validMessage);
    const savedMessage = await message.save();

    expect(savedMessage.created_at).toBeInstanceOf(Date);
    expect(savedMessage.updated_at).toBeInstanceOf(Date);
    expect(savedMessage.created_at.getTime()).toBeLessThanOrEqual(Date.now());
  });

  it('should update timestamps when modified', async () => {
    const message = new Message(validMessage);
    const savedMessage = await message.save();
    const originalUpdatedAt = savedMessage.updated_at;

    // Wait briefly to ensure timestamps would differ
    await new Promise(resolve => setTimeout(resolve, 10));

    savedMessage.name = 'Updated Message';
    const updatedMessage = await savedMessage.save();

    expect(updatedMessage.updated_at.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
  });
});