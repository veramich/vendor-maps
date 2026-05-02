CREATE TABLE categories (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL UNIQUE,
  icon_name  TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO categories (name, icon_name) VALUES
  ('Apparel',          'apparel'),
  ('Art',              'art'),
  ('Beverages',        'beverages'),
  ('Candy',            'candy'),
  ('Coffee',           'cafe'),
  ('Collectables',     'collectables'),
  ('Custom Designs',   'custom-design'),
  ('Desserts',         'desserts'),
  ('Event',            'event'),
  ('Event Services',   'event-services'),
  ('Event Space',      'event-space'),
  ('Fitness',          'fitness'),
  ('Flowers',          'flowers'),
  ('Food',             'food'),
  ('Fresh Fruit',      'fruits'),
  ('General Services', 'general-services'),
  ('Handmade',         'handmade'),
  ('Jewelry',          'jewelry'),
  ('Merchandise',      'merchandise'),
  ('Other',            'other'),
  ('Personal Care',    'personal-care'),
  ('Wellness',         'wellness');