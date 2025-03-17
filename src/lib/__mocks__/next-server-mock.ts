export const NextResponse = {
  json: jest.fn().mockImplementation((body, options) => ({
    body,
    status: options?.status || 200
  })),
  next: jest.fn().mockImplementation(() => ({
    headers: {
      set: jest.fn()
    }
  }))
};

export const NextRequest = jest.fn(); 