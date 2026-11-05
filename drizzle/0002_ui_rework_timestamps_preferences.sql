CREATE TABLE "user_preferences" (
	"user_id" text PRIMARY KEY NOT NULL,
	"data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_preferences" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "scenarios" ADD COLUMN "created_at" timestamp with time zone DEFAULT now();--> statement-breakpoint
ALTER TABLE "scenarios" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now();--> statement-breakpoint
ALTER TABLE "tokens" ADD COLUMN "created_at" timestamp with time zone DEFAULT now();--> statement-breakpoint
ALTER TABLE "tokens" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now();--> statement-breakpoint
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "room_players_user_id_idx" ON "room_players" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "rooms_user_id_idx" ON "rooms" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "rooms_scene_id_idx" ON "rooms" USING btree ("scene_id");--> statement-breakpoint
CREATE INDEX "scenarios_user_id_idx" ON "scenarios" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "scenes_user_id_idx" ON "scenes" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "scenes_scenario_id_idx" ON "scenes" USING btree ("scenario_id");--> statement-breakpoint
CREATE INDEX "tokens_user_id_idx" ON "tokens" USING btree ("user_id");