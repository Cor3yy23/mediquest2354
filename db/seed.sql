BEGIN;

-- PROFILE PICS
-- Update image_url paths to match your frontend/public folder
-- Example location: frontend/public/images/pfp/legend.png

INSERT INTO profile_pics (name, image_url, level_required)
VALUES
  ('mediavatarM1', 'frontend/images/mediavatarM1.png', 1),
  ('Def_LogoMQ',   'frontend/images/mediquestlogo.png', 0),
  ('Def_LogoNO',   'frontend/images/northoaks.png', 0)
ON CONFLICT (name) DO NOTHING;

INSERT INTO c_palettes (name, primary_color, secondary_color, level_required)
VALUES
  ('Ocean',  '#1E90FF', '#001F3F', 0),
  ('Sunset', '#FF6B6B', '#FFD93D', 6),
  ('Forest', '#2E8B57', '#0B3D2E', 11)
ON CONFLICT (name) DO NOTHING;

COMMIT;