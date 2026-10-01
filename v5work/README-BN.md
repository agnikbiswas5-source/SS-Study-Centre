# SS Study Centre — Final Local Demo V5

এই version-এ Public Website এবং Private Admin Panel আলাদা।

## Run on Windows
1. Node.js LTS install করুন: https://nodejs.org/en/download/
2. এই folder-এ Command Prompt খুলুন।
3. চালান:
   `npm install`
4. তারপর:
   `npm start`
5. Website: http://localhost:3000/
6. Admin: http://localhost:3000/admin
7. Admin password: `SS@Admin2026`

## Features
- Black + Gold SS Study Centre design
- Admin-only upload/delete controls
- Direct video file upload and website player
- YouTube video add
- Daily Current Affairs with optional image/PDF
- Image/PDF library
- Success Stories: student photo + job/achievement
- Live Class section using YouTube Live
- Student comments/questions with admin deletion
- Admin Website Settings
- Notification bell on public website
- Admin can send custom notifications
- Turning Live Class ON automatically creates a Live notification
- Public page polls for new notifications every 20 seconds
- If the visitor grants browser notification permission, a browser alert can appear while the site is open

## Important about phone push notifications
The local demo provides in-site notifications and browser alerts while the site is open. True background phone push notifications when the website is completely closed require the final online deployment to HTTPS plus a Push API/service-worker setup (VAPID keys). That should be added during hosting deployment.

## Online final version
For the real public website, keep uploads/database on server/cloud storage and protect Admin with secure authentication. Do not rely on the demo password in production; change it and use HTTPS.
