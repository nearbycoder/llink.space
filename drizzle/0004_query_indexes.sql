CREATE INDEX "link_sections_profile_order_idx" ON "link_sections" ("profile_id", "sort_order");
--> statement-breakpoint
CREATE INDEX "links_profile_order_idx" ON "links" ("profile_id", "sort_order");
--> statement-breakpoint
CREATE INDEX "links_section_idx" ON "links" ("section_id");
--> statement-breakpoint
CREATE INDEX "click_events_profile_date_idx" ON "click_events" ("profile_id", "clicked_at");
--> statement-breakpoint
CREATE INDEX "click_events_link_idx" ON "click_events" ("link_id");
