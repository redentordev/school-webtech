# Picwall App

A instagram clone built with Next.js, MongoDB, and NextAuth.js.

## Features

- User authentication (login/register) with:
  - Email and password
  - GitHub OAuth
  - Google OAuth
- MongoDB integration
- AWS S3 for image storage
- Post creation with image uploads
- Dark theme UI
- Responsive design

## Getting Started

### Prerequisites

- Node.js 18+ 
- Docker and Docker Compose
- AWS account (for S3 image storage)

### Installation

1. Clone the repository

```bash
git clone <repository-url>
cd instagram-clone
```

2. Install dependencies

```bash
npm install
```

3. Set up environment variables

Copy the example environment file and update the values:

```bash
cp .env.example .env.local
```

You'll need to set up:
- OAuth applications for GitHub and Google
- AWS S3 bucket for image storage
- MongoDB connection (or use the provided Docker setup)

4. Start MongoDB with Docker Compose

```bash
docker-compose up -d
```

5. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Authentication

The app uses NextAuth.js for authentication with the following providers:

- Credentials (username/password)
- GitHub
- Google

To configure OAuth providers:

1. Create OAuth applications on GitHub and Google
2. Add the credentials to your `.env.local` file
3. Set the callback URL to `http://localhost:3000/api/auth/callback/{provider}` where `{provider}` is either `github` or `google`

## AWS S3 Setup for Image Uploads

This application uses AWS S3 for storing images. Follow these steps to set up your S3 bucket:

1. **Create an AWS account** if you don't have one already

2. **Create an S3 bucket**:
   - Sign in to the AWS Management Console
   - Navigate to the S3 service
   - Click "Create bucket"
   - Choose a unique bucket name
   - Select a region close to your users
   - Configure bucket settings (you can leave defaults for testing)
   - Create the bucket

3. **Configure CORS for your bucket**:
   - Select your bucket
   - Go to the "Permissions" tab
   - Scroll down to "Cross-origin resource sharing (CORS)"
   - Add the following CORS configuration:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
    "AllowedOrigins": ["http://localhost:3000"],
    "ExposeHeaders": []
  }
]
```

4. **Create an IAM user with S3 access**:
   - Navigate to the IAM service
   - Go to "Users" and click "Add user"
   - Choose a username (e.g., "instagram-clone-s3")
   - Select "Programmatic access"
   - Create a policy with the following permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::YOUR-BUCKET-NAME/*"
    }
  ]
}
```

5. **Get your access keys**:
   - After creating the user, you'll be shown an Access Key ID and Secret Access Key
   - Add these to your `.env.local` file:

```
AWS_REGION=your-selected-region
AWS_ACCESS_KEY_ID=your-access-key-id
AWS_SECRET_ACCESS_KEY=your-secret-access-key
AWS_S3_BUCKET_NAME=your-bucket-name
```

## Project Structure

- `/src/app`: Next.js app router
- `/src/components`: React components
- `/src/lib`: Utility functions
- `/src/models`: MongoDB models

## Docker

The project includes a Docker setup for MongoDB. To start the database:

```bash
docker-compose up -d
```

This will start a MongoDB instance on port 27017 with the credentials specified in the `.env` file.

## License

This project is licensed under the MIT License.
