CREATE INDEX "idx_properties_visible_active_geo_living_area" ON "properties" ("living_area") WHERE "mlg_can_view" = true
          AND "deleted_at" IS NULL
          AND "standard_status" IN ('Active', 'ActiveUnderContract', 'ComingSoon')
          AND "latitude" IS NOT NULL
          AND "longitude" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_properties_visible_active_geo_list_price" ON "properties" ("list_price") WHERE "mlg_can_view" = true
          AND "deleted_at" IS NULL
          AND "standard_status" IN ('Active', 'ActiveUnderContract', 'ComingSoon')
          AND "latitude" IS NOT NULL
          AND "longitude" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_properties_visible_active_geo_bedrooms_total" ON "properties" ("bedrooms_total") WHERE "mlg_can_view" = true
          AND "deleted_at" IS NULL
          AND "standard_status" IN ('Active', 'ActiveUnderContract', 'ComingSoon')
          AND "latitude" IS NOT NULL
          AND "longitude" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_properties_visible_active_geo_bathrooms_total" ON "properties" ("bathrooms_total_integer") WHERE "mlg_can_view" = true
          AND "deleted_at" IS NULL
          AND "standard_status" IN ('Active', 'ActiveUnderContract', 'ComingSoon')
          AND "latitude" IS NOT NULL
          AND "longitude" IS NOT NULL;