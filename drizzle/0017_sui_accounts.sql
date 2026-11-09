CREATE TABLE "sui_accounts" (
	"user_id" text NOT NULL,
	"network" text NOT NULL,
	"address" text NOT NULL,
	"secret_encrypted" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sui_accounts_user_id_network_pk" PRIMARY KEY("user_id","network"),
	CONSTRAINT "sui_accounts_address_unique" UNIQUE("address")
);
