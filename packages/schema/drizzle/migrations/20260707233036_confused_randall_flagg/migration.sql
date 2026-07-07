CREATE INDEX "idx_properties_visible_active_geo_living_area_newest_sort" ON "properties" ("living_area","on_market_date","modification_timestamp","listing_key") WHERE "mlg_can_view" = true
          AND "deleted_at" IS NULL
          AND "standard_status" IN ('Active', 'ActiveUnderContract', 'ComingSoon')
          AND "latitude" IS NOT NULL
          AND "longitude" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_properties_visible_active_geo_list_price_newest_sort" ON "properties" ("list_price","on_market_date","modification_timestamp","listing_key") WHERE "mlg_can_view" = true
          AND "deleted_at" IS NULL
          AND "standard_status" IN ('Active', 'ActiveUnderContract', 'ComingSoon')
          AND "latitude" IS NOT NULL
          AND "longitude" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_properties_visible_active_geo_bedrooms_newest_sort" ON "properties" ("bedrooms_total","on_market_date","modification_timestamp","listing_key") WHERE "mlg_can_view" = true
          AND "deleted_at" IS NULL
          AND "standard_status" IN ('Active', 'ActiveUnderContract', 'ComingSoon')
          AND "latitude" IS NOT NULL
          AND "longitude" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_properties_visible_active_geo_bathrooms_newest_sort" ON "properties" ("bathrooms_total_integer","on_market_date","modification_timestamp","listing_key") WHERE "mlg_can_view" = true
          AND "deleted_at" IS NULL
          AND "standard_status" IN ('Active', 'ActiveUnderContract', 'ComingSoon')
          AND "latitude" IS NOT NULL
          AND "longitude" IS NOT NULL;