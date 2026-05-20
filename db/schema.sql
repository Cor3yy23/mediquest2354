BEGIN;

-- Drop in dependency order
/*DROP TABLE IF EXISTS user_c_palettes;
DROP TABLE IF EXISTS user_profile_pics;
DROP TABLE IF EXISTS c_palettes;
DROP TABLE IF EXISTS profile_pics;
DROP TABLE IF EXISTS users;*/

-- =========================
-- USERS
-- =========================
CREATE TABLE users (
    id           INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    display_name TEXT NOT NULL,
    total_xp     INT NOT NULL DEFAULT 0,
    CONSTRAINT users_total_xp_nonnegative CHECK (total_xp >= 0)
);

-- Optional uniqueness (uncomment if you want)
-- CREATE UNIQUE INDEX ux_users_display_name ON users(display_name);

-- =========================
-- PROFILE PICS (cosmetics)
-- =========================
CREATE TABLE profile_pics (
    id             INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name           TEXT NOT NULL,
    image_url      TEXT NOT NULL,              -- store frontend path like /images/pfp/legend.png
    level_required INT NOT NULL DEFAULT 1,
    is_active      BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT profile_pics_level_min CHECK (level_required >= 0)
);

CREATE UNIQUE INDEX ux_profile_pics_name ON profile_pics(name);

-- =========================
-- COLOR PALETTES (cosmetics)
-- =========================
CREATE TABLE c_palettes (
    id              INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name            TEXT NOT NULL,
    primary_color   TEXT NOT NULL,              -- hex like #FFAA00
    secondary_color TEXT NOT NULL,              -- hex like #112233
    level_required  INT NOT NULL DEFAULT 1,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT c_palettes_level_min CHECK (level_required >= 0),
    CONSTRAINT c_palettes_primary_hex CHECK (primary_color ~ '^#[0-9A-Fa-f]{6}$'),
    CONSTRAINT c_palettes_secondary_hex CHECK (secondary_color ~ '^#[0-9A-Fa-f]{6}$')
);

CREATE UNIQUE INDEX ux_c_palettes_name ON c_palettes(name);

-- =========================
-- USER UNLOCKS: PROFILE PICS
-- =========================
CREATE TABLE user_profile_pics (
    user_id        INT NOT NULL,
    profile_pic_id INT NOT NULL,
    unlocked_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, profile_pic_id),
    CONSTRAINT fk_user_profile_pics_user
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_user_profile_pics_pic
        FOREIGN KEY (profile_pic_id) REFERENCES profile_pics(id) ON DELETE CASCADE
);

CREATE INDEX idx_user_profile_pics_user_id ON user_profile_pics(user_id);
CREATE INDEX idx_user_profile_pics_pic_id ON user_profile_pics(profile_pic_id);

-- =========================
-- USER UNLOCKS: PALETTES
-- =========================
CREATE TABLE user_c_palettes (
    user_id     INT NOT NULL,
    palette_id  INT NOT NULL,
    unlocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, palette_id),
    CONSTRAINT fk_user_c_palettes_user
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_user_c_palettes_palette
        FOREIGN KEY (palette_id) REFERENCES c_palettes(id) ON DELETE CASCADE
);

CREATE INDEX idx_user_c_palettes_user_id ON user_c_palettes(user_id);
CREATE INDEX idx_user_c_palettes_palette_id ON user_c_palettes(palette_id);

COMMIT;