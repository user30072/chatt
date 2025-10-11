@echo off
echo Installing required dependencies for document upload functionality...
npm install @anthropic-ai/sdk @prisma/client axios cors dotenv express helmet jsonwebtoken morgan multer node-fetch openai pdf-parse uuid --save
npm install nodemon prisma --save-dev

echo.
echo Installation complete! Now you can run the server with: npm run start
pause 