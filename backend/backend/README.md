## Email Notifications

The application supports email notifications for:
1. New user signups (notification to admin)
2. Welcome emails to new users
3. Contact form submissions

### Setup Email Notifications

1. Set the following environment variables:
   ```
   EMAIL_USER=your_gmail_address@gmail.com
   EMAIL_PASSWORD=your_app_specific_password
   ADMIN_EMAIL=your_notification_email@gmail.com
   FRONTEND_URL=https://your-frontend-url.com
   ```

2. For Gmail, you need to create an app-specific password:
   - Go to your Google Account security settings
   - Enable 2-Step Verification if not already enabled
   - Go to App passwords
   - Select "Mail" and "Other" (name it "Your App Name")
   - Use the generated 16-character password for EMAIL_PASSWORD

3. When deploying to Railway, add these environment variables to your project settings. 

## Database Schema Updates

The database schema now includes the required `username` field for the Organization model. The initial migration has been completed, and all data is now in the correct format.

For future schema updates:

1. Make your changes to `prisma/schema.prisma`
2. Deploy normally - the deployment process will run:
   ```bash
   npx prisma db push
   ```
3. Your changes will be applied while preserving existing data

### Automated Schema Updates During Deployment

Schema updates are automated during deployment through the following process:

1. The `deploy.js` script runs as part of the Railway deployment process
2. It applies any schema changes using `npx prisma db push` without resetting the database
3. All existing data is preserved during the update

This ensures your database schema stays in sync with your application code without data loss. 