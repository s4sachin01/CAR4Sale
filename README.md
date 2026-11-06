# Axons Auto V2

A static public showroom hosted on GitHub Pages, backed by Supabase for inventory, admin authentication and image storage.

## Project files

- `index.html` - public inventory homepage and featured-car slider
- `car.html` - individual vehicle detail page and multi-photo gallery
- `admin.html` - private inventory dashboard
- `css/style.css` - responsive site styling
- `js/config.js` - Supabase URL, anon key and WhatsApp number
- `js/home.js` - public inventory, filters and featured slider
- `js/car.js` - individual vehicle detail page
- `js/admin.js` - admin login, add/edit/delete inventory and photo upload
- `supabase/schema.sql` - database tables, storage bucket and security policies

## 1. Create Supabase project

1. Open https://supabase.com and create a project.
2. Wait for the project to finish provisioning.
3. Open **Project Settings > API** (or API Keys).
4. Copy the Project URL.
5. Copy the **anon / publishable** key. Do NOT copy the service_role or secret key.

## 2. Configure the website

Open `js/config.js` and replace:

- `https://YOUR-PROJECT-REF.supabase.co` with your Supabase Project URL.
- `YOUR_SUPABASE_ANON_PUBLIC_KEY` with your anon/publishable key.
- `91XXXXXXXXXX` with your WhatsApp number including country code, without `+`, spaces or dashes.

The anon/publishable key is intended for browser use when Row Level Security is correctly enabled. Never put a service_role/secret key in browser code or GitHub.

## 3. Create database and secure storage

1. In Supabase, open **SQL Editor > New query**.
2. Open `supabase/schema.sql` from this project.
3. Copy all SQL into the SQL Editor and click **Run**.
4. This creates the cars table, admin table, security policies and public `car-images` storage bucket.

## 4. Create your admin login

1. In Supabase, open **Authentication > Users**.
2. Click **Add user** / **Create new user**.
3. Enter your admin email and a strong password. Confirm the user if Supabase asks.
4. Copy the user's UUID from the Users list.
5. Open SQL Editor and run this statement, replacing the example UUID:

```sql
insert into public.admins (user_id)
values ('PASTE-USER-UUID-HERE');
```

Only user IDs placed in `public.admins` can manage inventory. Do not create a public sign-up form.

## 5. Configure allowed website URLs

In Supabase, open **Authentication > URL Configuration**.

Set the Site URL to your GitHub Pages URL, for example:

`https://YOUR-GITHUB-USERNAME.github.io/CAR4Sale/`

Add these to Redirect URLs:

`https://YOUR-GITHUB-USERNAME.github.io/CAR4Sale/**`

Also add your local testing URL if needed:

`http://localhost:5500/**`

## 6. Publish on GitHub Pages

Upload the CONTENTS of this project folder into the ROOT of your existing `CAR4Sale` repository. The repository root should look like:

```text
CAR4Sale/
  index.html
  car.html
  admin.html
  css/
    style.css
  js/
    config.js
    supabase.js
    home.js
    car.js
    admin.js
  supabase/
    schema.sql
```

Keep `index.html` in the repository root. Commit the changes.

In GitHub: **Settings > Pages > Deploy from a branch > main > / (root) > Save**.

Your public website:

`https://YOUR-GITHUB-USERNAME.github.io/CAR4Sale/`

Admin page:

`https://YOUR-GITHUB-USERNAME.github.io/CAR4Sale/admin.html`

## 7. Add your first car

1. Open the admin page.
2. Sign in using the Supabase user you created and approved in `public.admins`.
3. Fill in the required fields marked with `*`.
4. Select multiple car photos.
5. Choose Available, Reserved or Sold.
6. Tick Featured if it should appear in the featured slider.
7. Click Save car.

Available cars appear on the public website. Reserved and sold cars remain in admin inventory and are not shown publicly.

## Important notes

- This project uses Supabase JS v2 from a CDN, so the browser needs an internet connection.
- The admin password is handled by Supabase Auth. No admin password is stored in this repository.
- Keep Row Level Security enabled. Never publish the Supabase service_role/secret key.
- The public storage bucket lets visitors see vehicle photos. Upload, update and delete permissions are restricted to approved admin users.
- Removing a photo from an edited car removes its URL from the car record; the old Storage object is not automatically deleted. You can clean up unused files from Supabase Storage.
- The registration number field is optional. Consider displaying only an RTO code or partial registration to protect vehicle-owner privacy.
- This is a starter production architecture. Before handling customer leads, add a dedicated lead form/table, backups and any privacy/consent notices your business needs.
