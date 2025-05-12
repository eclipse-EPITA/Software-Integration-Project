// src/__tests__/models/ratingModels.test.ts
import mongoose from 'mongoose';
import Rating from '../../models/ratingModel';

// Mock data
const validRating = {
  movie_id: 12345,
  email: 'test@example.com',
  rating: 4
};

describe('Rating Model', () => {
  beforeAll(async () => {
    await mongoose.connect(process.env.MONGO_URI_TEST || 'mongodb://localhost:27017/testdb');
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  });

  afterEach(async () => {
    await Rating.deleteMany({});
  });

  it('should create and save a rating successfully', async () => {
    const rating = new Rating(validRating);
    const savedRating = await rating.save();

    expect(savedRating._id).toBeDefined();
    expect(savedRating.movie_id).toBe(validRating.movie_id);
    expect(savedRating.email).toBe(validRating.email);
    expect(savedRating.rating).toBe(validRating.rating);
    expect(savedRating.created_at).toBeDefined();
  });

  it('should fail when required fields are missing', async () => {
    const rating = new Rating({});
    
    let error: mongoose.Error.ValidationError | null = null;
    try {
      await rating.save();
    } catch (err) {
      error = err as mongoose.Error.ValidationError;
    }

    expect(error).toBeInstanceOf(mongoose.Error.ValidationError);
    expect(error?.errors.movie_id).toBeDefined();
    expect(error?.errors.email).toBeDefined();
    expect(error?.errors.rating).toBeDefined();
  });

  it('should fail when rating is below 0', async () => {
    const invalidRating = { ...validRating, rating: -1 };
    const rating = new Rating(invalidRating);

    let error: mongoose.Error.ValidationError | null = null;
    try {
      await rating.save();
    } catch (err) {
      error = err as mongoose.Error.ValidationError;
    }

    expect(error).toBeInstanceOf(mongoose.Error.ValidationError);
    expect(error?.errors.rating).toBeDefined();
  });

  it('should fail when rating is above 5', async () => {
    const invalidRating = { ...validRating, rating: 6 };
    const rating = new Rating(invalidRating);

    let error: mongoose.Error.ValidationError | null = null;
    try {
      await rating.save();
    } catch (err) {
      error = err as mongoose.Error.ValidationError;
    }

    expect(error).toBeInstanceOf(mongoose.Error.ValidationError);
    expect(error?.errors.rating).toBeDefined();
  });

  it('should accept minimum valid rating (0)', async () => {
    const minRating = { ...validRating, rating: 0 };
    const rating = new Rating(minRating);
    const savedRating = await rating.save();

    expect(savedRating.rating).toBe(0);
  });

  it('should accept maximum valid rating (5)', async () => {
    const maxRating = { ...validRating, rating: 5 };
    const rating = new Rating(maxRating);
    const savedRating = await rating.save();

    expect(savedRating.rating).toBe(5);
  });

  it('should validate email format', async () => {
    const invalidEmailRating = { ...validRating, email: 'not-an-email' };
    const rating = new Rating(invalidEmailRating);

    let error: mongoose.Error.ValidationError | null = null;
    try {
      await rating.save();
    } catch (err) {
      error = err as mongoose.Error.ValidationError;
    }

    expect(error).toBeInstanceOf(mongoose.Error.ValidationError);
    expect(error?.errors.email).toBeDefined();
  });

  it('should automatically set created_at timestamp', async () => {
    const beforeSave = Date.now();
    const rating = new Rating(validRating);
    const savedRating = await rating.save();

    expect(savedRating.created_at).toBeInstanceOf(Date);
    expect(savedRating.created_at.getTime()).toBeGreaterThanOrEqual(beforeSave);
    expect(savedRating.created_at.getTime()).toBeLessThanOrEqual(Date.now());
  });
});