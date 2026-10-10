# Course workbook download

Admin-only fetcher for public Google Drive Excel files and Google Sheets exports.
The Supabase gateway JWT check stays enabled. The handler also verifies the user
and current admin role before downloading. Google redirects are allowlisted,
downloads are limited to 5 MB and 20 seconds, and responses are not cached.

Deploy with the authenticated Supabase CLI:

```sh
supabase functions deploy course-import-file --project-ref YOUR_PROJECT_REF
```

The function uses built-in `SUPABASE_URL` and `SUPABASE_ANON_KEY` values. It does
not use a service-role key or store Google credentials. Users must share the
workbook with anyone holding the link as Viewer. Lesson video permissions are
independent and are not changed by the import.

Apply `supabase/migrations/008_course_import.sql` before saving imports. The UI
reads the workbook, validates it, and displays a preview before calling the
transactional admin RPC. Imports require a new course or an empty draft without
orders/enrollments; they never delete existing lessons or grant learning access.

The downloadable template is `public/templates/khoa-hoc.xlsx`. Its sheet names
and header row are the import schema. It contains example course/lesson data,
an empty resource sheet, and a Vietnamese instructions sheet. Formulas and
embedded images are not imported. Cover images must be entered separately
before publishing. Importing does not check that the learner can open Drive
videos, and it does not automatically infer video duration.
