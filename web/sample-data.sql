-- Sample shop and shelf, so the web basket page has something to show
-- before you load a real catalogue. Safe to re-run.

INSERT INTO stores (name, slug, description, logo_url, service_fee_pct, delivery_fee, max_discount_pct, min_order_total, currency)
VALUES ('Shoprite', 'shoprite', 'Groceries and household', NULL, 10.00, 3500, 8.00, 10000, 'MWK')
ON CONFLICT (slug) DO UPDATE
  SET description = EXCLUDED.description,
      service_fee_pct = EXCLUDED.service_fee_pct,
      delivery_fee = EXCLUDED.delivery_fee,
      max_discount_pct = EXCLUDED.max_discount_pct,
      min_order_total = EXCLUDED.min_order_total,
      currency = EXCLUDED.currency;

INSERT INTO categories (name, slug, icon, display_order)
VALUES
  ('Fresh',    'fresh',    '🥬', 1),
  ('Pantry',   'pantry',   '🫙', 2),
  ('Drinks',   'drinks',   '🥤', 3),
  ('Household','household','🧻', 4)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO products (store_id, name, description, price, quantity_label, category_id, is_available, featured)
SELECT
  s.id, p.name, p.description, p.price, p.quantity_label, c.id, true, p.featured
FROM (VALUES
  ('Fresh milk',        'Full cream, chilled',      2200.00, '1 L',        'fresh',     true),
  ('Brown bread',       'Baked this morning',       1500.00, '600 g loaf', 'fresh',     true),
  ('Eggs',              'Free range',               4800.00, 'Tray of 12', 'fresh',     false),
  ('Tomatoes',          'Loose, by the kilo',       1800.00, '1 kg',       'fresh',     false),
  ('Maize flour',       'Ufa woyera',               9500.00, '5 kg',       'pantry',    true),
  ('Cooking oil',       'Sunflower',                8900.00, '2 L',        'pantry',    false),
  ('Rice',              'Kilombero',                7600.00, '2 kg',       'pantry',    false),
  ('Sugar',             'White',                    3100.00, '1 kg',       'pantry',    false),
  ('Coca-Cola',         'Chilled',                  1200.00, '500 ml',     'drinks',    false),
  ('Bottled water',     'Still',                     900.00, '1.5 L',      'drinks',    false),
  ('Tea leaves',        'Loose leaf',               2400.00, '250 g',      'drinks',    false),
  ('Washing powder',    'Handwash and machine',     6200.00, '2 kg',       'household', false),
  ('Toilet rolls',      '2-ply',                    4500.00, 'Pack of 9',  'household', false),
  ('Dish soap',         'Lemon',                    1900.00, '750 ml',     'household', false)
) AS p(name, description, price, quantity_label, category_slug, featured)
CROSS JOIN (SELECT id FROM stores WHERE slug = 'shoprite') s
LEFT JOIN categories c ON c.slug = p.category_slug
WHERE NOT EXISTS (
  SELECT 1 FROM products existing
  WHERE existing.store_id = s.id AND existing.name = p.name
);
