// src/__tests__/models/commentModels.test.ts
import mongoose from 'mongoose';
import CommentModel, { IComment } from '../../models/commentModel';

// Mock data
const validComment: Partial<IComment> = {
  movie_id: 123,
  username: 'testuser',
  comment: 'This is a great movie!',
  title: 'Great Movie',
  rating: 5,
};

describe('Comment Model', () => {
  beforeAll(async () => {
    await mongoose.connect(process.env.MONGO_URI_TEST || 'mongodb://localhost:27017/testdb');
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  });

  afterEach(async () => {
    await CommentModel.deleteMany({});
  });

  it('should create and save a new comment successfully', async () => {
    const comment = new CommentModel(validComment);
    const savedComment = await comment.save();

    expect(savedComment._id).toBeDefined();
    expect(savedComment.movie_id).toBe(validComment.movie_id);
    expect(savedComment.username).toBe(validComment.username);
    expect(savedComment.created_at).toBeDefined();
  });

  it('should fail if required fields are missing', async () => {
    const comment = new CommentModel({
      // Missing required fields
      upvotes: 5,
    });

    let error: mongoose.Error.ValidationError | null = null;
    try {
      await comment.save();
    } catch (err) {
      error = err as mongoose.Error.ValidationError;
    }

    expect(error).toBeInstanceOf(mongoose.Error.ValidationError);
    expect(error?.errors.movie_id).toBeDefined();
    expect(error?.errors.username).toBeDefined();
    expect(error?.errors.comment).toBeDefined();
    expect(error?.errors.title).toBeDefined();
    expect(error?.errors.rating).toBeDefined();
  });

  it('should fail if rating is outside 0-5 range', async () => {
    const invalidComment = { ...validComment, rating: 6 };
    const comment = new CommentModel(invalidComment);

    let error: mongoose.Error.ValidationError | null = null;
    try {
      await comment.save();
    } catch (err) {
      error = err as mongoose.Error.ValidationError;
    }

    expect(error).toBeInstanceOf(mongoose.Error.ValidationError);
    expect(error?.errors.rating).toBeDefined();
  });

  it('should default upvotes/downvotes to 0', async () => {
    const comment = new CommentModel(validComment);
    const savedComment = await comment.save();

    expect(savedComment.upvotes).toBe(0);
    expect(savedComment.downvotes).toBe(0);
  });

  it('should reject negative vote counts', async () => {
    const invalidComment = { ...validComment, upvotes: -1 };
    const comment = new CommentModel(invalidComment);

    let error: mongoose.Error.ValidationError | null = null;
    try {
      await comment.save();
    } catch (err) {
      error = err as mongoose.Error.ValidationError;
    }

    expect(error).toBeInstanceOf(mongoose.Error.ValidationError);
    expect(error?.errors.upvotes).toBeDefined();
  });
});