-- Clean up social links saved by the older add/edit flow.
--
-- Two bugs left bad values in businesses.{tiktok,instagram,...}:
--   1. An empty handle produced a bare base URL (e.g. "https://tiktok.com/@"),
--      a link that just opens the platform home instead of a profile.
--   2. YouTube handles were saved without the "@" the form prefix implied
--      (e.g. "https://youtube.com/mychannel" instead of ".../@mychannel").
-- buildSocialUrls now prevents both; this fixes rows written before the fix.

-- 1. Null out bare base URLs (no username after the base) across all platforms.
--    Trailing slash optional; "@" only applies to the tiktok/youtube bases.
UPDATE businesses SET tiktok    = NULL
  WHERE tiktok    ~* '^https?://(www\.)?tiktok\.com/@?/?$';
UPDATE businesses SET instagram = NULL
  WHERE instagram ~* '^https?://(www\.)?instagram\.com/?$';
UPDATE businesses SET facebook  = NULL
  WHERE facebook  ~* '^https?://(www\.)?facebook\.com/?$';
UPDATE businesses SET twitter   = NULL
  WHERE twitter   ~* '^https?://(www\.)?(twitter|x)\.com/?$';
UPDATE businesses SET youtube   = NULL
  WHERE youtube   ~* '^https?://(www\.)?youtube\.com/@?/?$';

-- 2. Add the missing "@" to YouTube handle URLs. Only touch a bare handle
--    segment — never the reserved channel/user/custom/watch/playlist paths,
--    which are legitimately "@"-less.
UPDATE businesses
SET youtube = regexp_replace(
                youtube,
                '^(https?://(?:www\.)?youtube\.com/)([^@/][^/]*)$',
                '\1@\2'
              )
WHERE youtube ~* '^https?://(www\.)?youtube\.com/[^@/]'
  AND youtube !~* '^https?://(www\.)?youtube\.com/(c|channel|user|watch|playlist|shorts|embed|results)(/|\?|$)';
