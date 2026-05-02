ALTER TABLE businesses
ADD COLUMN category_id UUID REFERENCES categories(id);