-- Admin operations: disabled accounts, audit trail, in-app notifications.

ALTER TABLE voters
  ADD COLUMN IF NOT EXISTS disabled boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid REFERENCES admins(id) ON DELETE SET NULL,
  admin_username varchar(255),
  method varchar(10) NOT NULL,
  path varchar(500) NOT NULL,
  status integer,
  ip varchar(100),
  user_agent varchar(500),
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS admin_audit_logs_created_idx
  ON admin_audit_logs (created_at DESC);

CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  voter_id uuid REFERENCES voters(id) ON DELETE CASCADE,
  admin_id uuid REFERENCES admins(id) ON DELETE CASCADE,
  election_id uuid REFERENCES elections(id) ON DELETE CASCADE,
  type varchar(50) NOT NULL,
  title varchar(255) NOT NULL,
  message text NOT NULL,
  link varchar(500),
  read_at timestamp,
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS notifications_voter_event_unique
  ON notifications (voter_id, election_id, type)
  WHERE voter_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS notifications_voter_created_idx
  ON notifications (voter_id, created_at DESC);

CREATE INDEX IF NOT EXISTS notifications_admin_created_idx
  ON notifications (admin_id, created_at DESC);
